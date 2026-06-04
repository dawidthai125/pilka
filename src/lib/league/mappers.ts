import { mapBool, mapNum, mapOptStr, mapStr } from "@/lib/mappers/row-helpers";
import type {
  LeagueCompetition,
  LeagueConflict,
  LeagueMatch,
  LeaguePlayerRegistryEntry,
  LeaguePlayerMatchStatus,
  LeagueSeason,
  LeagueSource,
  LeagueSyncJob,
  LeagueSyncLog,
  LeagueTableRow,
  LeagueTeam,
} from "@/types/league";

export function mapLeagueSeason(row: Record<string, unknown>): LeagueSeason {
  return {
    id: mapStr(row, "id"),
    clubId: mapStr(row, "club_id"),
    name: mapStr(row, "name"),
    isActive: mapBool(row, "is_active"),
    startDate: mapOptStr(row, "start_date"),
    endDate: mapOptStr(row, "end_date"),
  };
}

export function mapLeagueCompetition(row: Record<string, unknown>): LeagueCompetition {
  const season = row.season as { name?: string } | null;
  return {
    id: mapStr(row, "id"),
    clubId: mapStr(row, "club_id"),
    seasonId: mapStr(row, "season_id"),
    seasonName: season?.name ? String(season.name) : undefined,
    name: mapStr(row, "name"),
    categoryLabel: mapOptStr(row, "category_label"),
    provider: mapOptStr(row, "provider"),
    notes: mapOptStr(row, "notes"),
    isActive: mapBool(row, "is_active"),
  };
}

export function mapLeagueSource(row: Record<string, unknown>): LeagueSource {
  return {
    id: mapStr(row, "id"),
    clubId: mapStr(row, "club_id"),
    competitionId: mapOptStr(row, "competition_id"),
    name: mapStr(row, "name"),
    adapter: row.adapter as LeagueSource["adapter"],
    providerLabel: mapOptStr(row, "provider_label"),
    isActive: mapBool(row, "is_active"),
    lastSyncAt: mapOptStr(row, "last_sync_at"),
  };
}

export function mapLeagueTeam(row: Record<string, unknown>): LeagueTeam {
  return {
    id: mapStr(row, "id"),
    clubId: mapStr(row, "club_id"),
    competitionId: mapStr(row, "competition_id"),
    teamId: mapOptStr(row, "team_id"),
    displayName: mapStr(row, "display_name"),
    leagueName: mapStr(row, "league_name"),
    externalId: mapOptStr(row, "external_id"),
    isOwnClub: mapBool(row, "is_own_club"),
    provider: mapOptStr(row, "provider"),
  };
}

export function mapLeagueTableRow(row: Record<string, unknown>): LeagueTableRow {
  return {
    id: mapStr(row, "id"),
    teamName: mapStr(row, "team_name"),
    position: mapNum(row, "position"),
    played: mapNum(row, "played"),
    won: mapNum(row, "won"),
    drawn: mapNum(row, "drawn"),
    lost: mapNum(row, "lost"),
    goalsFor: mapNum(row, "goals_for"),
    goalsAgainst: mapNum(row, "goals_against"),
    goalDifference: mapNum(row, "goal_difference"),
    points: mapNum(row, "points"),
    isOwnClub: mapBool(row, "is_own_club"),
    snapshotAt: mapStr(row, "snapshot_at"),
  };
}

export function mapLeagueMatch(row: Record<string, unknown>): LeagueMatch {
  return {
    id: mapStr(row, "id"),
    clubId: mapStr(row, "club_id"),
    competitionId: mapStr(row, "competition_id"),
    seasonId: mapStr(row, "season_id"),
    externalKey: mapStr(row, "external_key"),
    roundNumber: row.round_number != null ? mapNum(row, "round_number") : null,
    matchDate: mapStr(row, "match_date"),
    matchTime: String(row.match_time ?? "15:00").slice(0, 5),
    homeTeamName: mapStr(row, "home_team_name"),
    awayTeamName: mapStr(row, "away_team_name"),
    homeScore: row.home_score != null ? mapNum(row, "home_score") : null,
    awayScore: row.away_score != null ? mapNum(row, "away_score") : null,
    status: mapStr(row, "status"),
    syncStatus: row.sync_status as LeagueMatch["syncStatus"],
    matchId: mapOptStr(row, "match_id"),
  };
}

export function mapLeagueSyncJob(row: Record<string, unknown>): LeagueSyncJob {
  return {
    id: mapStr(row, "id"),
    clubId: mapStr(row, "club_id"),
    sourceId: mapOptStr(row, "source_id"),
    competitionId: mapOptStr(row, "competition_id"),
    importType: row.import_type as LeagueSyncJob["importType"],
    status: row.status as LeagueSyncJob["status"],
    provider: mapOptStr(row, "provider"),
    triggerSource: mapOptStr(row, "trigger_source"),
    durationMs: row.duration_ms != null ? mapNum(row, "duration_ms") : null,
    recordsProcessed: mapNum(row, "records_processed"),
    recordsFailed: mapNum(row, "records_failed"),
    recordsConflicts: mapNum(row, "records_conflicts"),
    errorMessage: mapOptStr(row, "error_message"),
    startedAt: mapOptStr(row, "started_at"),
    completedAt: mapOptStr(row, "completed_at"),
    createdAt: mapStr(row, "created_at"),
  };
}

export function mapLeagueSyncLog(row: Record<string, unknown>): LeagueSyncLog {
  return {
    id: mapStr(row, "id"),
    jobId: mapStr(row, "job_id"),
    level: mapStr(row, "level"),
    message: mapStr(row, "message"),
    createdAt: mapStr(row, "created_at"),
  };
}

export function mapLeagueConflict(row: Record<string, unknown>): LeagueConflict {
  const lm = row.league_match as Record<string, unknown> | null;
  return {
    id: mapStr(row, "id"),
    leagueMatchId: mapStr(row, "league_match_id"),
    matchId: mapOptStr(row, "match_id"),
    fieldName: mapStr(row, "field_name"),
    localValue: mapOptStr(row, "local_value"),
    externalValue: mapOptStr(row, "external_value"),
    status: row.status as LeagueConflict["status"],
    homeTeamName: lm ? mapStr(lm, "home_team_name") : undefined,
    awayTeamName: lm ? mapStr(lm, "away_team_name") : undefined,
    matchDate: lm ? mapStr(lm, "match_date") : undefined,
  };
}

function mapPlayerDisplayName(player: { first_name?: string; last_name?: string } | null | undefined) {
  return player ? `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim() : null;
}

export function mapLeaguePlayerRegistry(row: Record<string, unknown>): LeaguePlayerRegistryEntry {
  const player = row.player as { first_name?: string; last_name?: string } | null;
  const suggestedPlayer = row.suggested_player as { first_name?: string; last_name?: string } | null;
  const matchStatusRaw = mapStr(row, "match_status") || "unmatched";
  return {
    id: mapStr(row, "id"),
    clubId: mapStr(row, "club_id"),
    playerId: mapOptStr(row, "player_id"),
    playerName: mapPlayerDisplayName(player),
    suggestedPlayerId: mapOptStr(row, "suggested_player_id"),
    suggestedPlayerName: mapPlayerDisplayName(suggestedPlayer),
    leaguePlayerName: mapStr(row, "league_player_name"),
    leagueTeamName: mapOptStr(row, "league_team_name"),
    externalId: mapOptStr(row, "external_id"),
    jerseyNumber: row.jersey_number != null ? mapNum(row, "jersey_number") : null,
    notes: mapOptStr(row, "notes"),
    matchStatus: matchStatusRaw as LeaguePlayerRegistryEntry["matchStatus"],
    matchConfidence: row.match_confidence != null ? mapNum(row, "match_confidence") : null,
  };
}
