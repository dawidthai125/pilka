/**
 * Import zsynchronizowanych danych ligowych do Supabase (service role).
 * Mapowanie: GLKS Mietków (źródła) → Piorun Wawrzeńczyce (wyświetlanie).
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stableFixtureExternalId } from "./league-import-parsers.mjs";
import { LEAGUE_CONFIG, normalizeTeamName } from "./league-live-sources.mjs";
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
  const normalized = normalizeTeamName(teamName);
  const n = normalized.trim().toLowerCase();
  for (const t of teams) {
    const league = normalizeTeamName(String(t.league_name));
    const display = normalizeTeamName(String(t.display_name));
    if (n === league.trim().toLowerCase()) return display;
    if (n === display.trim().toLowerCase()) return display;
    if (normalized.includes(league)) {
      return normalized.replace(league, display);
    }
  }
  return normalized;
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
      .select("id, home_score, away_score, sync_status, match_id, match_date, match_time, round_number")
      .eq("club_id", clubId)
      .eq("competition_id", competitionId)
      .eq("external_key", externalKey)
      .maybeSingle();

    const scoresChanged =
      existing && homeScore != null && (existing.home_score !== homeScore || existing.away_score !== awayScore);
    const metaChanged =
      existing &&
      (String(existing.match_date) !== String(row.matchDate) ||
        String(existing.match_time ?? "11:00").slice(0, 5) !== String(row.matchTime ?? "11:00").slice(0, 5) ||
        Number(existing.round_number ?? 0) !== Number(row.roundNumber ?? 0));
    const syncStatus =
      !existing || scoresChanged || metaChanged ? "pending" : existing.sync_status === "synced" ? "synced" : "pending";

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

function normalizeTeamKey(name) {
  return normalizeTeamName(String(name ?? "")).toLowerCase();
}

function moduleMatchGroupKey(match) {
  return [
    match.round_number ?? "x",
    normalizeTeamKey(match.home_team_name),
    normalizeTeamKey(match.away_team_name),
    match.home_score ?? "x",
    match.away_score ?? "x",
  ].join("|");
}

async function loadCompetitionMeta(supabase) {
  const { clubId, competitionId } = LEAGUE_CONFIG;
  const { data: comp } = await supabase
    .from("league_competitions")
    .select("name, season:league_seasons(name)")
    .eq("id", competitionId)
    .eq("club_id", clubId)
    .maybeSingle();
  if (!comp) return null;
  return {
    clubId,
    competitionId,
    competitionName: String(comp.name),
    seasonName: comp.season?.name ?? "",
  };
}

function isSuspiciousMatchDate(value) {
  const date = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return true;
  if (date === "2026-06-07") return true;
  const today = new Date().toISOString().slice(0, 10);
  return date > today;
}

function teamNameLooksCorrupted(name) {
  const raw = String(name ?? "").trim();
  return raw !== normalizeTeamName(raw);
}

function pickBestLeagueRow(candidates) {
  if (!candidates.length) return null;
  const withoutSuspicious = candidates.filter((lm) => !isSuspiciousMatchDate(lm.match_date));
  const pool = withoutSuspicious.length ? withoutSuspicious : candidates;
  const cleanNames = pool.filter(
    (lm) => !teamNameLooksCorrupted(lm.home_team_name) && !teamNameLooksCorrupted(lm.away_team_name),
  );
  const namePool = cleanNames.length ? cleanNames : pool;
  return namePool.sort((a, b) => String(b.match_date).localeCompare(String(a.match_date)))[0];
}

function findLeagueRowForModuleMatch(moduleMatch, leagueRows, teams) {
  const homeKey = normalizeTeamKey(moduleMatch.home_team_name);
  const awayKey = normalizeTeamKey(moduleMatch.away_team_name);
  const round = moduleMatch.round_number;

  const candidates = (leagueRows ?? []).filter((lm) => {
    if (round != null && Number(lm.round_number) !== Number(round)) return false;
    const lh = normalizeTeamKey(resolveDisplayName(String(lm.home_team_name), teams));
    const la = normalizeTeamKey(resolveDisplayName(String(lm.away_team_name), teams));
    if (lh !== homeKey || la !== awayKey) return false;
    if (moduleMatch.home_score == null || moduleMatch.away_score == null) return true;
    return Number(lm.home_score) === Number(moduleMatch.home_score) && Number(lm.away_score) === Number(moduleMatch.away_score);
  });

  return pickBestLeagueRow(candidates);
}

function pickCanonicalModuleMatch(candidates, leagueRow) {
  if (candidates.length === 1) return candidates[0];

  if (leagueRow?.match_date && !isSuspiciousMatchDate(leagueRow.match_date)) {
    const byLeagueDate = candidates.find((m) => String(m.match_date) === String(leagueRow.match_date));
    if (byLeagueDate) return byLeagueDate;
  }

  if (leagueRow?.match_id) {
    const linked = candidates.find((m) => m.id === leagueRow.match_id);
    if (linked && !isSuspiciousMatchDate(linked.match_date)) return linked;
  }

  const withoutSuspicious = candidates.filter((m) => !isSuspiciousMatchDate(m.match_date));
  if (withoutSuspicious.length) {
    return withoutSuspicious.sort((a, b) => String(a.match_date).localeCompare(String(b.match_date)))[0];
  }

  return candidates.sort((a, b) => String(a.match_date).localeCompare(String(b.match_date)))[0];
}

/** Usuwa duplikaty meczów (np. błędna data 2026-06-07) i synchronizuje daty z league_matches. */
export async function repairDuplicateModuleMatches(supabase) {
  const meta = await loadCompetitionMeta(supabase);
  if (!meta) return { removed: 0, updated: 0 };

  const { data: teamsRaw } = await supabase
    .from("league_teams")
    .select("*")
    .eq("club_id", meta.clubId)
    .eq("competition_id", meta.competitionId);
  const teams = teamsRaw ?? [];

  const [{ data: leagueRows }, { data: moduleMatches }] = await Promise.all([
    supabase
      .from("league_matches")
      .select("id, match_id, match_date, match_time, round_number, home_team_name, away_team_name, home_score, away_score, status")
      .eq("club_id", meta.clubId)
      .eq("competition_id", meta.competitionId),
    supabase
      .from("matches")
      .select("id, match_date, match_time, round_number, home_team_name, away_team_name, home_score, away_score, status")
      .eq("club_id", meta.clubId)
      .eq("competition", meta.competitionName)
      .eq("season", meta.seasonName)
      .eq("status", "completed"),
  ]);

  const groups = new Map();
  for (const match of moduleMatches ?? []) {
    const key = moduleMatchGroupKey(match);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(match);
  }

  let removed = 0;
  let updated = 0;

  for (const list of groups.values()) {
    const leagueRow = findLeagueRowForModuleMatch(list[0], leagueRows, teams);
    const keeper = pickCanonicalModuleMatch(list, leagueRow);
    const duplicates = list.filter((m) => m.id !== keeper.id);

    for (const dup of duplicates) {
      await supabase.from("league_matches").update({ match_id: keeper.id, sync_status: "synced" }).eq("match_id", dup.id);
      await supabase.from("matches").delete().eq("id", dup.id);
      removed += 1;
    }

    if (leagueRow) {
      const leagueDate = String(leagueRow.match_date);
      const leagueTime = String(leagueRow.match_time ?? "11:00").slice(0, 5);
      const leagueRound = leagueRow.round_number != null ? Number(leagueRow.round_number) : null;
      const displayHome = resolveDisplayName(String(leagueRow.home_team_name), teams);
      const displayAway = resolveDisplayName(String(leagueRow.away_team_name), teams);
      const needsUpdate =
        String(keeper.match_date) !== leagueDate ||
        String(keeper.match_time ?? "").slice(0, 5) !== leagueTime ||
        (leagueRound != null && Number(keeper.round_number) !== leagueRound) ||
        keeper.home_team_name !== displayHome ||
        keeper.away_team_name !== displayAway;

      if (needsUpdate) {
        await supabase
          .from("matches")
          .update({
            match_date: leagueDate,
            match_time: leagueTime,
            round_number: leagueRound,
            home_team_name: displayHome,
            away_team_name: displayAway,
          })
          .eq("id", keeper.id);
        updated += 1;
      }

      await supabase
        .from("league_matches")
        .update({ match_id: keeper.id, sync_status: "synced" })
        .eq("id", leagueRow.id);

      const sameFixtureRows = (leagueRows ?? []).filter((lm) => {
        if (leagueRound != null && Number(lm.round_number) !== leagueRound) return false;
        const lh = normalizeTeamKey(resolveDisplayName(String(lm.home_team_name), teams));
        const la = normalizeTeamKey(resolveDisplayName(String(lm.away_team_name), teams));
        if (lh !== normalizeTeamKey(keeper.home_team_name) || la !== normalizeTeamKey(keeper.away_team_name)) {
          return false;
        }
        if (keeper.home_score == null || keeper.away_score == null) return true;
        return Number(lm.home_score) === Number(keeper.home_score) && Number(lm.away_score) === Number(keeper.away_score);
      });

      for (const lm of sameFixtureRows) {
        if (lm.id === leagueRow.id) continue;
        await supabase.from("league_matches").delete().eq("id", lm.id);
      }
    }
  }

  return { removed, updated };
}

async function findExistingModuleMatch(supabase, meta, row, displayHome, displayAway) {
  const baseQuery = () =>
    supabase
      .from("matches")
      .select("id, home_score, away_score, match_date, match_time, round_number")
      .eq("club_id", meta.clubId)
      .eq("competition", meta.competitionName)
      .eq("season", meta.seasonName)
      .eq("home_team_name", displayHome)
      .eq("away_team_name", displayAway);

  if (row.match_id) {
    const { data: linked } = await supabase
      .from("matches")
      .select("id, home_score, away_score, match_date, match_time, round_number")
      .eq("id", row.match_id)
      .eq("club_id", meta.clubId)
      .maybeSingle();
    if (linked) return linked;
  }

  if (row.round_number != null) {
    const { data } = await baseQuery().eq("round_number", Number(row.round_number)).maybeSingle();
    if (data) return data;
  }

  const { data } = await baseQuery().eq("match_date", String(row.match_date)).maybeSingle();
  return data ?? null;
}

async function applyLeagueRowToModuleMatch(supabase, matchId, row, displayHome, displayAway, matchStatus, extHome, extAway) {
  await supabase
    .from("matches")
    .update({
      match_date: String(row.match_date),
      match_time: String(row.match_time ?? "11:00").slice(0, 5),
      round_number: row.round_number != null ? Number(row.round_number) : null,
      home_team_name: displayHome,
      away_team_name: displayAway,
      home_score: extHome,
      away_score: extAway,
      status: matchStatus,
    })
    .eq("id", matchId);
}

export async function syncMatchesToModule(supabase, jobId) {
  const meta = await loadCompetitionMeta(supabase);
  if (!meta) return { processed: 0, failed: 0 };

  const { data: teamsRaw } = await supabase
    .from("league_teams")
    .select("*")
    .eq("club_id", meta.clubId)
    .eq("competition_id", meta.competitionId);

  const teams = teamsRaw ?? [];
  const ownTeam = teams.find((t) => t.is_own_club);
  const defaultTeamId = ownTeam?.team_id ?? null;

  const { data: pending } = await supabase
    .from("league_matches")
    .select("*")
    .eq("club_id", meta.clubId)
    .eq("competition_id", meta.competitionId)
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

    const duplicate = await findExistingModuleMatch(supabase, meta, row, displayHome, displayAway);

    if (duplicate) {
      await applyLeagueRowToModuleMatch(
        supabase,
        duplicate.id,
        row,
        displayHome,
        displayAway,
        matchStatus,
        extHome,
        extAway,
      );
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
        club_id: meta.clubId,
        team_id: defaultTeamId,
        competition: meta.competitionName,
        season: meta.seasonName,
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
    club_id: meta.clubId,
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
  if (!lastKey || !firstKey) return null;

  const candidates = (clubPlayers ?? []).filter(
    (p) =>
      normalizeName(p.last_name) === lastKey && !String(p.email ?? "").endsWith("@piorun.test"),
  );
  const exact = candidates.filter((p) => normalizeName(p.first_name) === firstKey);
  return exact.length === 1 ? String(exact[0].id) : null;
}

const DEMO_REGISTRY_NAMES = ["Kowalski J.", "Nowak P."];

async function syncPlayerSeasonStats(supabase, { clubId, seasonId }) {
  const { data: season } = await supabase
    .from("league_seasons")
    .select("name")
    .eq("id", seasonId)
    .maybeSingle();
  const seasonName = String(season?.name ?? "2025/2026");

  const { data: registry } = await supabase
    .from("league_player_registry")
    .select("player_id, notes")
    .eq("club_id", clubId)
    .not("player_id", "is", null);

  let updated = 0;
  let failed = 0;

  for (const row of registry ?? []) {
    const playerId = String(row.player_id);
    let leagueStats = { appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, minutes: 0 };
    try {
      const parsed = JSON.parse(String(row.notes ?? "{}"));
      if (parsed.stats && typeof parsed.stats === "object") {
        leagueStats = { ...leagueStats, ...parsed.stats };
      }
    } catch {
      // ignore invalid notes JSON
    }

    const { data: matchRows } = await supabase
      .from("match_player_stats")
      .select("goals, assists, minutes_played, yellow_cards, red_cards, match:matches!inner(season, status)")
      .eq("club_id", clubId)
      .eq("player_id", playerId)
      .eq("match.season", seasonName)
      .eq("match.status", "completed");

    let mGoals = 0;
    let mAssists = 0;
    let mMinutes = 0;
    let mYellow = 0;
    let mRed = 0;
    let mMatches = 0;
    for (const ms of matchRows ?? []) {
      mGoals += Number(ms.goals ?? 0);
      mAssists += Number(ms.assists ?? 0);
      mMinutes += Number(ms.minutes_played ?? 0);
      mYellow += Number(ms.yellow_cards ?? 0);
      mRed += Number(ms.red_cards ?? 0);
      mMatches += 1;
    }

    const { error } = await supabase.from("player_stats").upsert(
      {
        club_id: clubId,
        player_id: playerId,
        season: seasonName,
        matches_played: Math.max(Number(leagueStats.appearances ?? 0), mMatches),
        goals: Math.max(Number(leagueStats.goals ?? 0), mGoals),
        assists: Math.max(Number(leagueStats.assists ?? 0), mAssists),
        yellow_cards: Math.max(Number(leagueStats.yellowCards ?? 0), mYellow),
        red_cards: Math.max(Number(leagueStats.redCards ?? 0), mRed),
        minutes_played: Math.max(Number(leagueStats.minutes ?? 0), mMinutes),
      },
      { onConflict: "player_id,season" },
    );

    if (error) failed += 1;
    else updated += 1;
  }

  return { updated, failed, seasonName };
}

async function syncSquadToPlayersModule(supabase, { jobId, squadData, competitionId, seasonId }) {
  const { clubId } = LEAGUE_CONFIG;

  const { data: ownTeam } = await supabase
    .from("league_teams")
    .select("team_id")
    .eq("club_id", clubId)
    .eq("is_own_club", true)
    .maybeSingle();
  const teamId = ownTeam?.team_id;
  if (!teamId) return { created: 0, linked: 0, deactivated: 0, failed: 0 };

  let { data: clubPlayers } = await supabase
    .from("players")
    .select("id, first_name, last_name, email, status")
    .eq("club_id", clubId);

  let created = 0;
  let linked = 0;
  let failed = 0;
  let deactivated = 0;

  for (const player of squadData.players) {
    const { lastName, firstName } = parseLeaguePlayerName(player.leaguePlayerName);
    let playerId = matchClubPlayer(player.leaguePlayerName, clubPlayers ?? []);

    if (playerId) {
      const linked = (clubPlayers ?? []).find((p) => String(p.id) === playerId);
      if (
        linked &&
        (normalizeName(linked.first_name) !== normalizeName(firstName) ||
          normalizeName(linked.last_name) !== normalizeName(lastName))
      ) {
        playerId = null;
      }
    }

    if (!playerId) {
      const { data: inserted, error } = await supabase
        .from("players")
        .insert({
          club_id: clubId,
          team_id: teamId,
          first_name: firstName,
          last_name: lastName,
          date_of_birth: "1990-01-01",
          jersey_number: player.jerseyNumber ?? null,
          status: "active",
          joined_at: new Date().toISOString().slice(0, 10),
          primary_position: "midfielder",
        })
        .select("id")
        .single();

      if (error || !inserted) {
        failed += 1;
        continue;
      }

      playerId = String(inserted.id);
      created += 1;
      clubPlayers = [
        ...(clubPlayers ?? []),
        { id: playerId, first_name: firstName, last_name: lastName, email: null, status: "active" },
      ];
    }

    const { error: linkError } = await supabase
      .from("league_player_registry")
      .update({ player_id: playerId })
      .eq("club_id", clubId)
      .eq("competition_id", competitionId)
      .eq("season_id", seasonId)
      .eq("league_player_name", player.leaguePlayerName);

    if (linkError) failed += 1;
    else linked += 1;
  }

  for (const pl of clubPlayers ?? []) {
    if (!String(pl.email ?? "").endsWith("@piorun.test")) continue;
    const stillInSquad = squadData.players.some((sp) => matchClubPlayer(sp.leaguePlayerName, [pl]));
    if (!stillInSquad && pl.status === "active") {
      await supabase.from("players").update({ status: "inactive" }).eq("id", pl.id);
      deactivated += 1;
    }
  }

  await supabase
    .from("league_player_registry")
    .delete()
    .eq("club_id", clubId)
    .eq("competition_id", competitionId)
    .eq("season_id", seasonId)
    .in("league_player_name", DEMO_REGISTRY_NAMES);

  const statsSync = await syncPlayerSeasonStats(supabase, { clubId, seasonId });

  await supabase.from("league_sync_logs").insert({
    club_id: clubId,
    job_id: jobId,
    level: failed ? "warn" : "info",
    message: `Kadra FC OS: ${created} nowych zawodników, ${linked} powiązań, ${deactivated} demo nieaktywnych, statystyki: ${statsSync.updated}.`,
  });

  return { created, linked, deactivated, failed, statsSync };
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

  const playersSync = await syncSquadToPlayersModule(supabase, {
    jobId,
    squadData,
    competitionId,
    seasonId,
  });

  return { processed, failed, matched, skipped: false, playersSync };
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
    const repair = await repairDuplicateModuleMatches(supabase);
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
      repair,
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
