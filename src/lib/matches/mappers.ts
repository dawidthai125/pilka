import type {
  LeagueTableEntry,
  Match,
  MatchEvent,
  MatchLineupPosition,
  MatchPlayerStats,
  MatchSquadEntry,
  TeamFormStats,
  TeamMatchStats,
} from "@/types/matches";
import { matchResultLabel } from "@/lib/matches/calendar";

type MatchRow = {
  id: string;
  club_id: string;
  team_id: string;
  competition: string;
  season: string;
  round_number: number | null;
  match_date: string;
  match_time: string;
  home_team_name: string;
  away_team_name: string;
  stadium: string | null;
  stadium_address: string | null;
  status: Match["status"];
  home_score: number | null;
  away_score: number | null;
  formation: string | null;
  mvp_player_id: string | null;
  coach_notes: string | null;
  teams?: { name: string } | null;
  mvp?: { first_name: string; last_name: string } | null;
};

export function mapMatch(row: MatchRow): Match {
  return {
    id: row.id,
    clubId: row.club_id,
    teamId: row.team_id,
    teamName: row.teams?.name ?? null,
    competition: row.competition,
    season: row.season,
    roundNumber: row.round_number,
    matchDate: row.match_date,
    matchTime: row.match_time.slice(0, 5),
    homeTeamName: row.home_team_name,
    awayTeamName: row.away_team_name,
    stadium: row.stadium,
    stadiumAddress: row.stadium_address,
    status: row.status,
    homeScore: row.home_score,
    awayScore: row.away_score,
    formation: row.formation,
    mvpPlayerId: row.mvp_player_id,
    mvpPlayerName: row.mvp ? `${row.mvp.first_name} ${row.mvp.last_name}` : null,
    coachNotes: row.coach_notes,
  };
}

export function mapLeagueEntry(row: {
  id: string;
  competition: string;
  season: string;
  team_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
  is_own_club: boolean;
}): LeagueTableEntry {
  return {
    id: row.id,
    competition: row.competition,
    season: row.season,
    teamName: row.team_name,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
    points: row.points,
    isOwnClub: row.is_own_club,
    goalDifference: row.goals_for - row.goals_against,
  };
}

export function mapMatchEvent(row: {
  id: string;
  match_id: string;
  event_type: MatchEvent["eventType"];
  minute: number;
  player_id: string | null;
  related_player_id: string | null;
  notes: string | null;
  created_at: string;
  playerName?: string | null;
  relatedPlayerName?: string | null;
}): MatchEvent {
  return {
    id: row.id,
    matchId: row.match_id,
    eventType: row.event_type,
    minute: row.minute,
    playerId: row.player_id,
    playerName: row.playerName ?? null,
    relatedPlayerId: row.related_player_id,
    relatedPlayerName: row.relatedPlayerName ?? null,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function mapLineupPosition(row: {
  id: string;
  match_id: string;
  player_id: string;
  slot_code: string;
  pos_x: number;
  pos_y: number;
  playerName?: string;
}): MatchLineupPosition {
  return {
    id: row.id,
    matchId: row.match_id,
    playerId: row.player_id,
    playerName: row.playerName ?? "Zawodnik",
    slotCode: row.slot_code,
    posX: Number(row.pos_x),
    posY: Number(row.pos_y),
  };
}

export function mapSquadEntry(row: {
  id: string;
  match_id: string;
  player_id: string;
  squad_role: MatchSquadEntry["squadRole"];
  playerName?: string;
  jerseyNumber?: number | null;
  playerStatus?: string;
  attendanceRate?: number;
  lastActivity?: string | null;
}): MatchSquadEntry {
  return {
    id: row.id,
    matchId: row.match_id,
    playerId: row.player_id,
    playerName: row.playerName ?? "Zawodnik",
    squadRole: row.squad_role,
    jerseyNumber: row.jerseyNumber ?? null,
    playerStatus: row.playerStatus ?? "active",
    attendanceRate: row.attendanceRate ?? 0,
    lastActivity: row.lastActivity ?? null,
  };
}

export function aggregateTeamStats(
  matches: Match[],
  ownTeamName: string,
): TeamMatchStats {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null) continue;
    const isHome = match.homeTeamName === ownTeamName;
    const our = isHome ? match.homeScore : match.awayScore;
    const their = isHome ? match.awayScore : match.homeScore;
    goalsFor += our;
    goalsAgainst += their;
    const r = matchResultLabel(
      match.homeTeamName,
      match.awayTeamName,
      ownTeamName,
      match.homeScore,
      match.awayScore,
    );
    if (r === "W") wins += 1;
    else if (r === "R") draws += 1;
    else if (r === "P") losses += 1;
  }

  return {
    played: wins + draws + losses,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
  };
}

export function computeTeamForm(
  matches: Match[],
  ownTeamName: string,
): TeamFormStats {
  const completed = matches
    .filter((m) => m.status === "completed" && m.homeScore !== null)
    .sort((a, b) => b.matchDate.localeCompare(a.matchDate));

  const results = completed.map((match) => {
    const letter = matchResultLabel(
      match.homeTeamName,
      match.awayTeamName,
      ownTeamName,
      match.homeScore,
      match.awayScore,
    );
    const opponent =
      match.homeTeamName === ownTeamName ? match.awayTeamName : match.homeTeamName;
    const score = `${match.homeScore}:${match.awayScore}`;
    return {
      date: match.matchDate,
      result: letter,
      opponent,
      label: `${letter} ${score} vs ${opponent}`,
    };
  });

  return {
    last5: results
      .slice(0, 5)
      .map((r) => r.result)
      .join(""),
    last10: results
      .slice(0, 10)
      .map((r) => r.result)
      .join(""),
    results: results.map((r) => ({ date: r.date, result: r.label, opponent: r.opponent })),
  };
}

export function aggregatePlayerMatchStats(
  rows: Array<{
    playerId: string;
    playerName: string;
    minutesPlayed: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  }>,
): MatchPlayerStats[] {
  const map = new Map<string, MatchPlayerStats>();

  for (const row of rows) {
    const current = map.get(row.playerId) ?? {
      playerId: row.playerId,
      playerName: row.playerName,
      matchesPlayed: 0,
      minutesPlayed: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
    };
    current.matchesPlayed += 1;
    current.minutesPlayed += row.minutesPlayed;
    current.goals += row.goals;
    current.assists += row.assists;
    current.yellowCards += row.yellowCards;
    current.redCards += row.redCards;
    map.set(row.playerId, current);
  }

  return [...map.values()].sort((a, b) => b.goals - a.goals || b.minutesPlayed - a.minutesPlayed);
}
