export const LEAGUE_SOURCE_ADAPTERS = ["csv", "json", "xlsx", "api", "extranet", "manual"] as const;
export type LeagueSourceAdapter = (typeof LEAGUE_SOURCE_ADAPTERS)[number];

export const LEAGUE_SYNC_STATUSES = ["pending", "running", "completed", "failed", "cancelled"] as const;
export type LeagueSyncStatus = (typeof LEAGUE_SYNC_STATUSES)[number];

export const LEAGUE_IMPORT_TYPES = ["league_table", "fixtures", "results", "full"] as const;
export type LeagueImportType = (typeof LEAGUE_IMPORT_TYPES)[number];

export const LEAGUE_MATCH_SYNC_STATUSES = ["pending", "synced", "conflict", "error", "skipped"] as const;
export type LeagueMatchSyncStatus = (typeof LEAGUE_MATCH_SYNC_STATUSES)[number];

export const LEAGUE_CONFLICT_STATUSES = ["pending", "keep_local", "keep_external", "merged", "dismissed"] as const;
export type LeagueConflictStatus = (typeof LEAGUE_CONFLICT_STATUSES)[number];

export type LeagueSeason = {
  id: string;
  clubId: string;
  name: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
};

export type LeagueCompetition = {
  id: string;
  clubId: string;
  seasonId: string;
  seasonName?: string;
  name: string;
  categoryLabel: string | null;
  provider: string | null;
  notes: string | null;
  isActive: boolean;
};

export type LeagueSource = {
  id: string;
  clubId: string;
  competitionId: string | null;
  name: string;
  adapter: LeagueSourceAdapter;
  providerLabel: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
};

export type LeagueTeam = {
  id: string;
  clubId: string;
  competitionId: string;
  teamId: string | null;
  displayName: string;
  leagueName: string;
  externalId: string | null;
  isOwnClub: boolean;
  provider: string | null;
};

export type LeagueTableRow = {
  id: string;
  teamName: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  isOwnClub: boolean;
  snapshotAt: string;
};

export type LeagueMatch = {
  id: string;
  clubId: string;
  competitionId: string;
  seasonId: string;
  externalKey: string;
  roundNumber: number | null;
  matchDate: string;
  matchTime: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  syncStatus: LeagueMatchSyncStatus;
  matchId: string | null;
};

export type LeagueSyncJob = {
  id: string;
  clubId: string;
  sourceId: string | null;
  competitionId: string | null;
  importType: LeagueImportType;
  status: LeagueSyncStatus;
  recordsProcessed: number;
  recordsFailed: number;
  recordsConflicts: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type LeagueSyncLog = {
  id: string;
  jobId: string;
  level: string;
  message: string;
  createdAt: string;
};

export type LeagueConflict = {
  id: string;
  leagueMatchId: string;
  matchId: string | null;
  fieldName: string;
  localValue: string | null;
  externalValue: string | null;
  status: LeagueConflictStatus;
  homeTeamName?: string;
  awayTeamName?: string;
  matchDate?: string;
};

export type LeaguePlayerRegistryEntry = {
  id: string;
  clubId: string;
  playerId: string | null;
  playerName?: string | null;
  leaguePlayerName: string;
  leagueTeamName: string | null;
  externalId: string | null;
  jerseyNumber: number | null;
  notes: string | null;
};

export type LeagueDashboardStats = {
  pendingSync: number;
  pendingConflicts: number;
  completedMatches: number;
  upcomingMatches: number;
  ownTeamPoints: number | null;
  ownTeamPosition: number | null;
  table: LeagueTableRow[];
};

export type LeagueAiInsights = {
  seasonName: string;
  competitionName: string;
  ownTeamPosition: number | null;
  ownTeamPoints: number | null;
  winStreak: number;
  recentResults: string[];
  nextFixtures: string[];
  tableTop3: string[];
};
