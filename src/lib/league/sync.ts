import {
  mapExternalMatchStatus,
  stableFixtureExternalId,
} from "@/lib/integrations/validation";
import { getOwnLeagueTeam, isOwnLeagueTeamName, resolveLeagueDisplayName, canonicalLeagueTeamKeyName } from "@/lib/league/helpers";
import type { LeagueImportPayload } from "@/lib/league/adapters/types";
import {
  clampTableStat,
  isValidLeagueMatchDate,
  sanitizeLeagueImportText,
} from "@/lib/league/validation";
import { createClient } from "@/lib/supabase/server";
import type { LeagueImportType } from "@/types/league";

export type LeagueSyncResult = {
  processed: number;
  failed: number;
  conflicts: number;
  message: string;
};

async function appendSyncLog(
  clubId: string,
  jobId: string,
  level: string,
  message: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("league_sync_logs").insert({
    club_id: clubId,
    job_id: jobId,
    level,
    message,
  });
}

async function loadCompetitionMeta(competitionId: string, expectedClubId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("league_competitions")
    .select("id, club_id, name, season_id, season:league_seasons(name)")
    .eq("id", competitionId)
    .eq("club_id", expectedClubId)
    .maybeSingle();
  if (error || !data) throw new Error("Rozgrywki nie należą do tego klubu.");
  const season = data.season as { name?: string } | null;
  return {
    clubId: String(data.club_id),
    competitionName: String(data.name),
    seasonId: String(data.season_id),
    seasonName: season?.name ? String(season.name) : "",
  };
}

export async function ingestLeaguePayload(params: {
  clubId: string;
  jobId: string;
  competitionId: string;
  seasonId: string;
  sourceId: string | null;
  payload: LeagueImportPayload;
  importType: LeagueImportType;
}): Promise<{ processed: number; failed: number }> {
  const supabase = await createClient();
  let processed = 0;
  let failed = 0;

  if (params.payload.leagueTable.length > 0) {
    const snapshotAt = new Date().toISOString();
    const { data: teams } = await supabase
      .from("league_teams")
      .select("league_name, display_name, is_own_club")
      .eq("club_id", params.clubId)
      .eq("competition_id", params.competitionId);

    const rows = params.payload.leagueTable
      .map((row, index) => {
        const teamName = sanitizeLeagueImportText(row.teamName);
        if (!teamName) return null;
        const isOwn =
          (teams ?? []).some(
            (t) =>
              t.is_own_club &&
              (teamName.toLowerCase() === String(t.league_name).toLowerCase() ||
                teamName.toLowerCase() === String(t.display_name).toLowerCase()),
          ) ?? false;
        const goalsFor = clampTableStat(row.goalsFor);
        const goalsAgainst = clampTableStat(row.goalsAgainst);
        const gd = goalsFor - goalsAgainst;
        return {
          club_id: params.clubId,
          competition_id: params.competitionId,
          season_id: params.seasonId,
          source_id: params.sourceId,
          sync_job_id: params.jobId,
          snapshot_at: snapshotAt,
          team_name: teamName,
          position: index + 1,
          played: clampTableStat(row.played),
          won: clampTableStat(row.won),
          drawn: clampTableStat(row.drawn),
          lost: clampTableStat(row.lost),
          goals_for: goalsFor,
          goals_against: goalsAgainst,
          goal_difference: gd,
          points: clampTableStat(row.points),
          is_own_club: isOwn,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r != null);

    const { error } = await supabase.from("league_tables").insert(rows);
    if (error) {
      failed += rows.length;
      await appendSyncLog(params.clubId, params.jobId, "error", error.message);
    } else {
      processed += rows.length;
      await appendSyncLog(
        params.clubId,
        params.jobId,
        "info",
        `Zaimportowano tabelę: ${rows.length} drużyn.`,
      );
    }
  }

  if (params.payload.fixtures.length > 0) {
    const { data: teamsRaw } = await supabase
      .from("league_teams")
      .select("*")
      .eq("club_id", params.clubId)
      .eq("competition_id", params.competitionId);

    const leagueTeams = (teamsRaw ?? []).map((r) => ({
      id: String(r.id),
      clubId: params.clubId,
      competitionId: params.competitionId,
      teamId: r.team_id ? String(r.team_id) : null,
      displayName: String(r.display_name),
      leagueName: String(r.league_name),
      externalId: r.external_id ? String(r.external_id) : null,
      isOwnClub: Boolean(r.is_own_club),
      provider: r.provider ? String(r.provider) : null,
    }));

    for (const row of params.payload.fixtures) {
      const homeTeamName = sanitizeLeagueImportText(row.homeTeamName);
      const awayTeamName = sanitizeLeagueImportText(row.awayTeamName);
      if (!homeTeamName || !awayTeamName) {
        failed += 1;
        continue;
      }
      if (!isValidLeagueMatchDate(row.matchDate)) {
        failed += 1;
        continue;
      }

      const canonicalHome = canonicalLeagueTeamKeyName(homeTeamName, leagueTeams);
      const canonicalAway = canonicalLeagueTeamKeyName(awayTeamName, leagueTeams);
      const externalKey =
        row.externalId != null && String(row.externalId).trim()
          ? sanitizeLeagueImportText(String(row.externalId), 160)
          : stableFixtureExternalId(canonicalHome, canonicalAway, row.matchDate, row.roundNumber);

      const homeScore =
        row.homeScore != null ? clampTableStat(row.homeScore) : null;
      const awayScore =
        row.awayScore != null ? clampTableStat(row.awayScore) : null;
      const status =
        homeScore != null && awayScore != null ? "completed" : row.status ?? "scheduled";

      const { data: existing } = await supabase
        .from("league_matches")
        .select("id, home_score, away_score, sync_status, match_id")
        .eq("club_id", params.clubId)
        .eq("competition_id", params.competitionId)
        .eq("external_key", externalKey)
        .maybeSingle();

      const scoresChanged =
        existing &&
        homeScore != null &&
        (existing.home_score !== homeScore || existing.away_score !== awayScore);

      const syncStatus =
        !existing || scoresChanged
          ? "pending"
          : existing.sync_status === "synced"
            ? "synced"
            : existing.sync_status;

      const { error } = await supabase.from("league_matches").upsert(
        {
          club_id: params.clubId,
          competition_id: params.competitionId,
          season_id: params.seasonId,
          source_id: params.sourceId,
          sync_job_id: params.jobId,
          external_key: externalKey,
          round_number: row.roundNumber ?? null,
          match_date: row.matchDate,
          match_time: row.matchTime ?? "15:00",
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

      if (error) {
        failed += 1;
      } else {
        processed += 1;
      }
    }
    await appendSyncLog(
      params.clubId,
      params.jobId,
      "info",
      `Terminarz/wyniki: ${params.payload.fixtures.length} rekordów.`,
    );
  }

  return { processed, failed };
}

export async function syncLeagueTableToMatchesModule(
  competitionId: string,
  expectedClubId: string,
): Promise<number> {
  const meta = await loadCompetitionMeta(competitionId, expectedClubId);
  const supabase = await createClient();

  const { data: latest } = await supabase
    .from("league_tables")
    .select("snapshot_at")
    .eq("club_id", meta.clubId)
    .eq("competition_id", competitionId)
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest?.snapshot_at) return 0;

  const { data: rows } = await supabase
    .from("league_tables")
    .select("*")
    .eq("club_id", meta.clubId)
    .eq("competition_id", competitionId)
    .eq("snapshot_at", latest.snapshot_at);

  let processed = 0;
  for (const row of rows ?? []) {
    const { error } = await supabase.from("league_table_entries").upsert(
      {
        club_id: meta.clubId,
        competition: meta.competitionName,
        season: meta.seasonName,
        team_name: String(row.team_name),
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

export async function syncLeagueMatchesToModule(
  clubId: string,
  competitionId: string,
  jobId: string,
): Promise<{ processed: number; failed: number; conflicts: number }> {
  const supabase = await createClient();
  const meta = await loadCompetitionMeta(competitionId, clubId);

  const { data: leagueTeamsRaw } = await supabase
    .from("league_teams")
    .select("*")
    .eq("club_id", clubId)
    .eq("competition_id", competitionId);

  const leagueTeams = (leagueTeamsRaw ?? []).map((r) => ({
    id: String(r.id),
    clubId,
    competitionId,
    teamId: r.team_id ? String(r.team_id) : null,
    displayName: String(r.display_name),
    leagueName: String(r.league_name),
    externalId: r.external_id ? String(r.external_id) : null,
    isOwnClub: Boolean(r.is_own_club),
    provider: r.provider ? String(r.provider) : null,
  }));

  const ownTeam = getOwnLeagueTeam(leagueTeams);
  const defaultTeamId = ownTeam?.teamId ?? null;

  const { data: pendingMatches } = await supabase
    .from("league_matches")
    .select("*")
    .eq("club_id", clubId)
    .eq("competition_id", competitionId)
    .in("sync_status", ["pending", "conflict"]);

  let processed = 0;
  let failed = 0;
  let conflicts = 0;

  for (const row of pendingMatches ?? []) {
    const home = String(row.home_team_name);
    const away = String(row.away_team_name);
    if (!isOwnLeagueTeamName(home, leagueTeams) && !isOwnLeagueTeamName(away, leagueTeams)) {
      await supabase
        .from("league_matches")
        .update({ sync_status: "skipped" })
        .eq("id", String(row.id));
      continue;
    }

    const displayHome = resolveLeagueDisplayName(home, leagueTeams);
    const displayAway = resolveLeagueDisplayName(away, leagueTeams);
    const matchStatus = mapExternalMatchStatus(String(row.status ?? "scheduled"));
    const linkedMatchId = row.match_id ? String(row.match_id) : null;

    if (linkedMatchId) {
      const { data: existing } = await supabase
        .from("matches")
        .select("id, home_score, away_score, status")
        .eq("id", linkedMatchId)
        .eq("club_id", clubId)
        .maybeSingle();

      if (existing) {
        const extHome = row.home_score != null ? Number(row.home_score) : null;
        const extAway = row.away_score != null ? Number(row.away_score) : null;
        const scoreDiff =
          extHome != null &&
          (existing.home_score !== extHome || existing.away_score !== extAway);

        if (scoreDiff) {
          const created = await recordScoreConflict(supabase, {
            clubId,
            leagueMatchId: String(row.id),
            matchId: String(existing.id),
            localValue: `${existing.home_score ?? "—"}:${existing.away_score ?? "—"}`,
            externalValue: `${extHome}:${extAway}`,
          });
          await supabase
            .from("league_matches")
            .update({ sync_status: "conflict" })
            .eq("id", String(row.id));
          if (created) conflicts += 1;
          continue;
        }

        if (extHome != null) {
          await supabase
            .from("matches")
            .update({
              home_score: extHome,
              away_score: extAway,
              status: matchStatus,
            })
            .eq("id", existing.id);
        }
        await supabase
          .from("league_matches")
          .update({ sync_status: "synced" })
          .eq("id", String(row.id));
        processed += 1;
        continue;
      }
    }

    const { data: duplicate } = await supabase
      .from("matches")
      .select("id, home_score, away_score")
      .eq("club_id", clubId)
      .eq("competition", meta.competitionName)
      .eq("season", meta.seasonName)
      .eq("match_date", String(row.match_date))
      .eq("home_team_name", displayHome)
      .eq("away_team_name", displayAway)
      .maybeSingle();

    if (duplicate) {
      const extHome = row.home_score != null ? Number(row.home_score) : null;
      const extAway = row.away_score != null ? Number(row.away_score) : null;
      if (
        extHome != null &&
        (duplicate.home_score !== extHome || duplicate.away_score !== extAway)
      ) {
        const created = await recordScoreConflict(supabase, {
          clubId,
          leagueMatchId: String(row.id),
          matchId: String(duplicate.id),
          localValue: `${duplicate.home_score ?? "—"}:${duplicate.away_score ?? "—"}`,
          externalValue: `${extHome}:${extAway}`,
        });
        await supabase
          .from("league_matches")
          .update({ sync_status: "conflict", match_id: duplicate.id })
          .eq("id", String(row.id));
        if (created) conflicts += 1;
        continue;
      }

      await supabase
        .from("league_matches")
        .update({ sync_status: "synced", match_id: duplicate.id })
        .eq("id", String(row.id));
      processed += 1;
      continue;
    }

    if (!defaultTeamId) {
      await supabase
        .from("league_matches")
        .update({ sync_status: "error" })
        .eq("id", String(row.id));
      failed += 1;
      await appendSyncLog(
        clubId,
        jobId,
        "error",
        "Brak mapowania drużyny własnej — skonfiguruj League Hub → Drużyny.",
      );
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("matches")
      .insert({
        club_id: clubId,
        team_id: defaultTeamId,
        competition: meta.competitionName,
        season: meta.seasonName,
        round_number: row.round_number != null ? Number(row.round_number) : null,
        match_date: String(row.match_date),
        match_time: String(row.match_time ?? "15:00").slice(0, 5),
        home_team_name: displayHome,
        away_team_name: displayAway,
        home_score: row.home_score != null ? Number(row.home_score) : null,
        away_score: row.away_score != null ? Number(row.away_score) : null,
        status: matchStatus,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      failed += 1;
      await supabase
        .from("league_matches")
        .update({ sync_status: "error" })
        .eq("id", String(row.id));
      continue;
    }

    await supabase
      .from("league_matches")
      .update({ sync_status: "synced", match_id: inserted.id })
      .eq("id", String(row.id));
    processed += 1;
  }

  return { processed, failed, conflicts };
}

async function recordScoreConflict(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    clubId: string;
    leagueMatchId: string;
    matchId: string;
    localValue: string;
    externalValue: string;
  },
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("league_conflicts")
    .select("id")
    .eq("club_id", params.clubId)
    .eq("league_match_id", params.leagueMatchId)
    .eq("field_name", "score")
    .eq("status", "pending")
    .maybeSingle();

  if (existing) return false;

  const { error } = await supabase.from("league_conflicts").insert({
    club_id: params.clubId,
    league_match_id: params.leagueMatchId,
    match_id: params.matchId,
    field_name: "score",
    local_value: params.localValue,
    external_value: params.externalValue,
    status: "pending",
  });

  return !error;
}

export async function runLeagueSyncJob(params: {
  clubId: string;
  userId: string;
  jobId: string;
  competitionId: string;
  importType: LeagueImportType;
}): Promise<LeagueSyncResult> {
  const supabase = await createClient();
  await supabase
    .from("league_sync_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", params.jobId)
    .eq("club_id", params.clubId);

  try {
    const tableRows = await syncLeagueTableToMatchesModule(params.competitionId, params.clubId);
    const matchResult = await syncLeagueMatchesToModule(
      params.clubId,
      params.competitionId,
      params.jobId,
    );

    const processed = tableRows + matchResult.processed;
    const status = matchResult.failed > 0 ? "failed" : "completed";

    await supabase
      .from("league_sync_jobs")
      .update({
        status,
        records_processed: processed,
        records_failed: matchResult.failed,
        records_conflicts: matchResult.conflicts,
        completed_at: new Date().toISOString(),
        error_message: matchResult.failed > 0 ? "Część meczów nie została zsynchronizowana." : null,
      })
      .eq("id", params.jobId);

    await appendSyncLog(
      params.clubId,
      params.jobId,
      "info",
      `Sync zakończony: tabela ${tableRows}, mecze ${matchResult.processed}, konflikty ${matchResult.conflicts}.`,
    );

    return {
      processed,
      failed: matchResult.failed,
      conflicts: matchResult.conflicts,
      message: `Zsynchronizowano ${processed} rekordów (${matchResult.conflicts} konfliktów).`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd synchronizacji.";
    await supabase
      .from("league_sync_jobs")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", params.jobId);
    await appendSyncLog(params.clubId, params.jobId, "error", message);
    throw err;
  }
}

export async function resolveLeagueConflict(params: {
  clubId: string;
  conflictId: string;
  resolution: "keep_local" | "keep_external";
  userId: string;
}): Promise<void> {
  const supabase = await createClient();
  const { data: conflict } = await supabase
    .from("league_conflicts")
    .select("*")
    .eq("id", params.conflictId)
    .eq("club_id", params.clubId)
    .maybeSingle();

  if (!conflict) throw new Error("Nie znaleziono konfliktu.");
  if (String(conflict.status) !== "pending") {
    throw new Error("Konflikt został już rozwiązany.");
  }

  const { data: lm } = await supabase
    .from("league_matches")
    .select("*")
    .eq("id", String(conflict.league_match_id))
    .eq("club_id", params.clubId)
    .maybeSingle();

  if (!lm) throw new Error("Brak powiązanego meczu ligowego.");

  const matchId = conflict.match_id ? String(conflict.match_id) : null;

  if (params.resolution === "keep_external" && matchId) {
    await supabase
      .from("matches")
      .update({
        home_score: lm.home_score != null ? Number(lm.home_score) : null,
        away_score: lm.away_score != null ? Number(lm.away_score) : null,
        status: mapExternalMatchStatus(String(lm.status ?? "completed")),
      })
      .eq("id", matchId)
      .eq("club_id", params.clubId);
  }

  await supabase
    .from("league_conflicts")
    .update({
      status: params.resolution,
      resolved_by: params.userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", params.conflictId);

  await supabase
    .from("league_matches")
    .update({ sync_status: "synced", match_id: matchId })
    .eq("id", String(conflict.league_match_id));
}
