export const MATCH_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
  "postponed",
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const MATCH_SQUAD_ROLES = ["squad", "starter", "substitute"] as const;
export type MatchSquadRole = (typeof MATCH_SQUAD_ROLES)[number];

export const MATCH_EVENT_TYPES = [
  "goal",
  "assist",
  "yellow_card",
  "red_card",
  "substitution",
  "injury",
] as const;
export type MatchEventType = (typeof MATCH_EVENT_TYPES)[number];

export const MATCH_CALENDAR_VIEWS = ["month", "week", "list"] as const;
export type MatchCalendarView = (typeof MATCH_CALENDAR_VIEWS)[number];

export const FORMATION_CODES = ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1"] as const;
export type FormationCode = (typeof FORMATION_CODES)[number];

export type Match = {
  id: string;
  clubId: string;
  teamId: string;
  teamName: string | null;
  competition: string;
  season: string;
  roundNumber: number | null;
  matchDate: string;
  matchTime: string;
  homeTeamName: string;
  awayTeamName: string;
  stadium: string | null;
  stadiumAddress: string | null;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  formation: string | null;
  mvpPlayerId: string | null;
  mvpPlayerName: string | null;
  coachNotes: string | null;
};

export type MatchSquadEntry = {
  id: string;
  matchId: string;
  playerId: string;
  playerName: string;
  squadRole: MatchSquadRole;
  jerseyNumber: number | null;
  playerStatus: string;
  attendanceRate: number;
  lastActivity: string | null;
};

export type MatchLineupPosition = {
  id: string;
  matchId: string;
  playerId: string;
  playerName: string;
  slotCode: string;
  posX: number;
  posY: number;
};

export type MatchEvent = {
  id: string;
  matchId: string;
  eventType: MatchEventType;
  minute: number;
  playerId: string | null;
  playerName: string | null;
  relatedPlayerId: string | null;
  relatedPlayerName: string | null;
  notes: string | null;
  createdAt: string;
};

export type MatchPlayerStats = {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
};

export type TeamMatchStats = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type LeagueTableEntry = {
  id: string;
  competition: string;
  season: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  isOwnClub: boolean;
  goalDifference: number;
};

export type PlayerFormStats = {
  playerId: string;
  playerName: string;
  matchesLast30Days: number;
  goals: number;
  assists: number;
  minutes: number;
};

export type TeamFormStats = {
  last5: string;
  last10: string;
  results: Array<{ date: string; result: string; opponent: string }>;
};

export type MatchDetailData = {
  match: Match;
  squad: MatchSquadEntry[];
  lineup: MatchLineupPosition[];
  events: MatchEvent[];
  playerStats: MatchPlayerStats[];
  mvpHistory: Array<{ playerId: string; playerName: string; createdAt: string }>;
  roster: Array<{ id: string; firstName: string; lastName: string }>;
};

export type MatchFilters = {
  teamId?: string;
  season?: string;
  competition?: string;
};
