/**
 * Import zsynchronizowanych danych ligowych do Supabase (service role).
 * Mapowanie: GLKS Mietków (źródła) → Piorun Wawrzeńczyce (wyświetlanie).
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stableFixtureExternalId } from "./league-import-parsers.mjs";
import { LEAGUE_CONFIG } from "./league-live-sources.mjs";
import {
  buildSeasonStatsNotes,
  normalizeName,
  parseLeaguePlayerName,
} from "./league-squad-sources.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: join(root, ".env.local") });

export const SOURCE_MIRROR_ID = "f9023004-0004-4000-8000-000000000004";
const MAX_TEAM_NAME_LENGTH = 120;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Brak ${name} w .env.local`);
  return value;
}

function sanitizeText(value, maxLen = MAX_TEAM_NAME_LENGTH) {
  let text = String(value ?? "").trim();
  while (/^[=+\-@\t\r]/.test(text)) text = text.slice(1).trimStart();
  return text.slice(0, maxLen);
}

function clampStat(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(999, Math.round(value)));
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime());
}

function resolveDisplayName(teamName, teams) {
  const n = teamName.trim().toLowerCase();
  for (const t of teams) {
    if (n === String(t.league_name).trim().toLowerCase()) return String(t.display_name);
    if (n === String(t.display_name).trim().toLowerCase()) return String(t.display_name);
    if (teamName.includes(String(t.league_name))) {
      return teamName.replace(String(t.league_name), String(t.display_name));
    }
  }
  return teamName;
}

function isOwnTeam(teamName, teams) {
  const n = teamName.trim().toLowerCase();
  return teams.some(
    (t) =>
      t.is_own_club &&
      (n === String(t.league_name).trim().toLowerCase() || n === String(t.display_name).trim().toLowerCase()),
  );
}

function canonicalTeamName(teamName, teams) {
  const n = teamName.trim().toLowerCase();
  for (const t of teams) {
    const league = String(t.league_name).trim().toLowerCase();
    const display = String(t.display_name).trim().toLowerCase();
    if (n === league || n === display || teamName.includes(String(t.league_name))) {
      return String(t.league_name).trim();
    }
  }
  return teamName.trim();
}

export function createPipelineClient() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

export async function ingestMergedPayload(supabase, { jobId, merged, metadata = {} }) {
  const { clubId, competitionId, seasonId } = LEAGUE_CONFIG;
  let processed = 0;
  let failed = 0;

  const { data: teamsRaw } = await supabase
    .from("league_teams")
    .select("*")
    .eq("club_id", clubId)
    .eq("competition_id", competitionId);

  const teams = teamsRaw ?? [];
  const ownTeam = teams.find((t) => t.is_own_club);
  const defaultTeamId = ownTeam?.team_id ?? null;

  if (merged.table?.length) {
    const snapshotAt = new Date().toISOString();
    const rows = merged.table
      .map((row, index) => {
        const teamName = sanitizeText(row.teamName);
        if (!teamName) return null;
        const goalsFor = clampStat(row.goalsFor);
        const goalsAgainst = clampStat(row.goalsAgainst);
        return {
          club_id: clubId,
          competition_id: competitionId,
          season_id: seasonId,
          source_id: SOURCE_MIRROR_ID,
          sync_job_id: jobId,
          snapshot_at: snapshotAt,
          team_name: teamName,
          position: index + 1,
          played: clampStat(row.played),
          won: clampStat(row.won),
          drawn: clampStat(row.drawn),
          lost: clampStat(row.lost),
          goals_for: goalsFor,
          goals_against: goalsAgainst,
          goal_difference: goalsFor - goalsAgainst,
          points: clampStat(row.points),
          is_own_club: isOwnTeam(teamName, teams),
        };
      })
      .filter(Boolean);

    const { error } = await supabase.from("league_tables").insert(rows);
    if (error) {
      failed += rows.length;
      await supabase.from("league_sync_logs").insert({
        club_id: clubId,
        job_id: jobId,
        level: "error",
        message: `Tabela: ${error.message}`,
      });
    } else {
      processed += rows.length;
    }
  }

  for (const row of merged.fixtures ?? []) {
    const homeTeamName = sanitizeText(row.homeTeamName);
    const awayTeamName = sanitizeText(row.awayTeamName);
    if (!homeTeamName || !awayTeamName || !isValidDate(row.matchDate)) {
      failed += 1;
      continue;
    }

    const canonicalHome = canonicalTeamName(homeTeamName, teams);
    const canonicalAway = canonicalTeamName(awayTeamName, teams);
    const externalKey = stableFixtureExternalId(canonicalHome, canonicalAway, row.matchDate, row.roundNumber);

    const homeScore = row.homeScore != null ? clampStat(row.homeScore) : null;
    const awayScore = row.awayScore != null ? clampStat(row.awayScore) : null;
    const status = homeScore != null && awayScore != null ? "completed" : row.status ?? "scheduled";

    const { data: existing } = await supabase
      .from("league_matches")
      .select("id, home_score, away_score, sync_status, match_id")
      .eq("club_id", clubId)
      .eq("competition_id", competitionId)
      .eq("external_key", externalKey)
      .maybeSingle();

    const scoresChanged =
      existing && homeScore != null && (existing.home_score !== homeScore || existing.away_score !== awayScore);
    const syncStatus = !existing || scoresChanged ? "pending" : existing.sync_status === "synced" ? "synced" : "pending";

    const { error } = await supabase.from("league_matches").upsert(
      {
        club_id: clubId,
        competition_id: competitionId,
        season_id: seasonId,
        source_id: SOURCE_MIRROR_ID,
        sync_job_id: jobId,
        external_key: externalKey,
        round_number: row.roundNumber ?? null,
        match_date: row.matchDate,
        match_time: row.matchTime ?? "11:00",
        home_team_name: homeTeamName,
        away_team_name: awayTeamName,
        home_score: homeScore,
        away_score: awayScore,
        status,
        sync_status: syncStatus,
        match_id: existing?.match_id ?? null,
      },
      { onConflict: "club_id,competition_id,external_key" },
    );

    if (error) failed += 1;
    else processed += 1;
  }

  await supabase.from("league_sync_logs").insert({
    club_id: clubId,
    job_id: jobId,
    level: "info",
    message: `Mirror sync: ${processed} OK, ${failed} błędów. Źródło tabeli: ${metadata.tableSource ?? "?"}.`,
  });

  return { processed, failed };
}

export async function syncTableToPublicModule(supabase) {
  const { clubId, competitionId } = LEAGUE_CONFIG;

  const { data: comp } = await supabase
    .from("league_competitions")
    .select("name, season:league_seasons(name)")
    .eq("id", competitionId)
    .eq("club_id", clubId)
    .maybeSingle();
  if (!comp) return 0;

  const seasonName = comp.season?.name ?? "";
  const { data: latest } = await supabase
    .from("league_tables")
    .select("snapshot_at")
    .eq("club_id", clubId)
    .eq("competition_id", competitionId)
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest?.snapshot_at) return 0;

  const { data: teams } = await supabase
    .from("league_teams")
    .select("league_name, display_name, is_own_club")
    .eq("club_id", clubId)
    .eq("competition_id", competitionId);

  const { data: rows } = await supabase
    .from("league_tables")
    .select("*")
    .eq("club_id", clubId)
    .eq("competition_id", competitionId)
    .eq("snapshot_at", latest.snapshot_at);

  let processed = 0;
  for (const row of rows ?? []) {
    const leagueName = String(row.team_name);
    const publicName = resolveDisplayName(leagueName, teams ?? []);
    const { error } = await supabase.from("league_table_entries").upsert(
      {
        club_id: clubId,
        competition: String(comp.name),
        season: seasonName,
        team_name: publicName,
        played: Number(row.played),
        won: Number(row.won),
        drawn: Number(row.drawn),
        lost: Number(row.lost),
        goals_for: Number(row.goals_for),
        goals_against: Number(row.goals_against),
        points: Number(row.points),
        is_own_club: Boolean(row.is_own_club),
      },
      { onConflict: "club_id,competition,season,team_name" },
    );
    if (!error) processed += 1;
  }
  return processed;
}

export async function syncMatchesToModule(supabase, jobId) {
  const { clubId, competitionId } = LEAGUE_CONFIG;

  const { data: comp } = await supabase
    .from("league_competitions")
    .select("name, season:league_seasons(name)")
    .eq("id", competitionId)
    .eq("club_id", clubId)
    .maybeSingle();
  if (!comp) return { processed: 0, failed: 0 };

  const seasonName = comp.season?.name ?? "";
  const competitionName = String(comp.name);

  const { data: teamsRaw } = await supabase
    .from("league_teams")
    .select("*")
    .eq("club_id", clubId)
    .eq("competition_id", competitionId);

  const teams = teamsRaw ?? [];
  const ownTeam = teams.find((t) => t.is_own_club);
  const defaultTeamId = ownTeam?.team_id ?? null;

  const { data: pending } = await supabase
    .from("league_matches")
    .select("*")
    .eq("club_id", clubId)
    .eq("competition_id", competitionId)
    .in("sync_status", ["pending", "conflict"]);

  let processed = 0;
  let failed = 0;

  for (const row of pending ?? []) {
    const home = String(row.home_team_name);
    const away = String(row.away_team_name);
    if (!isOwnTeam(home, teams) && !isOwnTeam(away, teams)) {
      await supabase.from("league_matches").update({ sync_status: "skipped" }).eq("id", row.id);
      continue;
    }

    const displayHome = resolveDisplayName(home, teams);
    const displayAway = resolveDisplayName(away, teams);
    const matchStatus = row.status === "completed" ? "completed" : "planned";
    const extHome = row.home_score != null ? Number(row.home_score) : null;
    const extAway = row.away_score != null ? Number(row.away_score) : null;

    const { data: duplicate } = await supabase
      .from("matches")
      .select("id, home_score, away_score")
      .eq("club_id", clubId)
      .eq("competition", competitionName)
      .eq("season", seasonName)
      .eq("match_date", String(row.match_date))
      .eq("home_team_name", displayHome)
      .eq("away_team_name", displayAway)
      .maybeSingle();

    if (duplicate) {
      if (extHome != null && (duplicate.home_score !== extHome || duplicate.away_score !== extAway)) {
        await supabase
          .from("matches")
          .update({ home_score: extHome, away_score: extAway, status: matchStatus })
          .eq("id", duplicate.id);
      }
      await supabase
        .from("league_matches")
        .update({ sync_status: "synced", match_id: duplicate.id })
        .eq("id", row.id);
      processed += 1;
      continue;
    }

    if (!defaultTeamId) {
      failed += 1;
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("matches")
      .insert({
        club_id: clubId,
        team_id: defaultTeamId,
        competition: competitionName,
        season: seasonName,
        round_number: row.round_number != null ? Number(row.round_number) : null,
        match_date: String(row.match_date),
        match_time: String(row.match_time ?? "11:00").slice(0, 5),
        home_team_name: displayHome,
        away_team_name: displayAway,
        home_score: extHome,
        away_score: extAway,
        status: matchStatus,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      failed += 1;
      await supabase.from("league_matches").update({ sync_status: "error" }).eq("id", row.id);
      continue;
    }

    await supabase
      .from("league_matches")
      .update({ sync_status: "synced", match_id: inserted.id })
      .eq("id", row.id);
    processed += 1;
  }

  await supabase.from("league_sync_logs").insert({
    club_id: clubId,
    job_id: jobId,
    level: "info",
    message: `Sync meczów → moduł Mecze: ${processed} OK, ${failed} błędów.`,
  });

  return { processed, failed };
}

function matchClubPlayer(leaguePlayerName, clubPlayers) {
  const { lastName, firstName } = parseLeaguePlayerName(leaguePlayerName);
  const lastKey = normalizeName(lastName);
  const firstKey = normalizeName(firstName);
  if (!lastKey) return null;

  const candidates = (clubPlayers ?? []).filter((p) => normalizeName(p.last_name) === lastKey);
  if (!candidates.length) return null;
  if (candidates.length === 1) return String(candidates[0].id);

  const byFirst = candidates.filter((p) => {
    const fn = normalizeName(p.first_name);
    return fn === firstKey || fn.startsWith(firstKey.slice(0, 1)) || firstKey.startsWith(fn.slice(0, 1));
  });
  return byFirst.length === 1 ? String(byFirst[0].id) : null;
}

export async function syncSquadToRegistry(supabase, { jobId, squadData }) {
  const { clubId, competitionId, seasonId, ownLeagueName } = LEAGUE_CONFIG;
  if (!squadData?.players?.length) {
    return { processed: 0, failed: 0, matched: 0, skipped: true };
  }

  const [{ data: existing }, { data: clubPlayers }] = await Promise.all([
    supabase
      .from("league_player_registry")
      .select("id, league_player_name, player_id")
      .eq("club_id", clubId)
      .eq("competition_id", competitionId)
      .eq("season_id", seasonId),
    supabase.from("players").select("id, first_name, last_name").eq("club_id", clubId),
  ]);

  const existingByName = new Map(
    (existing ?? []).map((row) => [normalizeName(String(row.league_player_name)), row]),
  );

  let processed = 0;
  let failed = 0;
  let matched = 0;

  for (const player of squadData.players) {
    const key = normalizeName(player.leaguePlayerName);
    const prev = existingByName.get(key);
    const autoPlayerId = prev?.player_id ? null : matchClubPlayer(player.leaguePlayerName, clubPlayers ?? []);
    if (autoPlayerId) matched += 1;

    const row = {
      club_id: clubId,
      competition_id: competitionId,
      season_id: seasonId,
      league_player_name: player.leaguePlayerName,
      league_team_name: ownLeagueName,
      jersey_number: player.jerseyNumber ?? null,
      notes: buildSeasonStatsNotes(player, squadData.fetchedAt),
      player_id: prev?.player_id ?? autoPlayerId,
    };

    if (prev?.id) {
      const { error } = await supabase.from("league_player_registry").update(row).eq("id", prev.id);
      if (error) failed += 1;
      else processed += 1;
    } else {
      const { error } = await supabase.from("league_player_registry").insert(row);
      if (error) failed += 1;
      else processed += 1;
    }
  }

  await supabase.from("league_sync_logs").insert({
    club_id: clubId,
    job_id: jobId,
    level: failed ? "warn" : "info",
    message: `Kadra ligowa: ${processed} wpisów (${matched} auto-powiązań), ${failed} błędów. Źródło: regiowyniki.pl.`,
  });

  return { processed, failed, matched, skipped: false };
}

export async function runLivePipeline(merged, fetchMeta, squadData = null) {
  const supabase = createPipelineClient();
  const { clubId, competitionId } = LEAGUE_CONFIG;

  const { data: job, error: jobError } = await supabase
    .from("league_sync_jobs")
    .insert({
      club_id: clubId,
      source_id: SOURCE_MIRROR_ID,
      competition_id: competitionId,
      import_type: "full",
      status: "running",
      started_at: new Date().toISOString(),
      metadata: {
        adapter: "mirror_live",
        tableSource: fetchMeta.tableSource,
        tableConflicts: fetchMeta.tableConflicts,
        fetchedAt: fetchMeta.fetchedAt,
        sources: ["90minut.pl", "regionalnyfutbol.pl", "regiowyniki.pl"],
        squadPlayers: squadData?.counts?.merged ?? 0,
        squadHasStats: Boolean(squadData?.hasAnyStats),
        note: "GLKS Mietków → Piorun Wawrzeńczyce (mapowanie league_teams)",
      },
    })
    .select("id")
    .single();

  if (jobError || !job) throw new Error(jobError?.message ?? "Nie udało się utworzyć job sync.");

  const jobId = String(job.id);

  try {
    const ingest = await ingestMergedPayload(supabase, {
      jobId,
      merged,
      metadata: fetchMeta,
    });
    const tableSynced = await syncTableToPublicModule(supabase);
    const matchSync = await syncMatchesToModule(supabase, jobId);
    const squadSync = squadData ? await syncSquadToRegistry(supabase, { jobId, squadData }) : { processed: 0, failed: 0, matched: 0, skipped: true };

    await supabase
      .from("league_sources")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", SOURCE_MIRROR_ID)
      .eq("club_id", clubId);

    const status = ingest.failed > 0 && ingest.processed === 0 ? "failed" : "completed";
    await supabase
      .from("league_sync_jobs")
      .update({
        status,
        records_processed: ingest.processed + tableSynced + matchSync.processed + squadSync.processed,
        records_failed: ingest.failed + matchSync.failed + squadSync.failed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return {
      ok: true,
      jobId,
      ingest,
      tableSynced,
      matchSync,
      squadSync,
      glksMietkow: fetchMeta.glksMietkow,
    };
  } catch (err) {
    await supabase
      .from("league_sync_jobs")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : String(err),
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    throw err;
  }
}
