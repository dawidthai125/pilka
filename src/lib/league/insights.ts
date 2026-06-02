import { isOwnLeagueTeamName } from "@/lib/league/helpers";
import type { LeagueAiInsights, LeagueCompetition, LeagueMatch, LeagueSeason, LeagueTableRow, LeagueTeam } from "@/types/league";

function formatResult(home: string, away: string, hs: number | null, as: number | null): string {
  if (hs == null || as == null) return `${home} — ${away}`;
  return `${home} ${hs}:${as} ${away}`;
}

export function buildLeagueAiInsightsFromData(
  season: LeagueSeason,
  competition: LeagueCompetition,
  table: LeagueTableRow[],
  recent: LeagueMatch[],
  upcoming: LeagueMatch[],
  teams: LeagueTeam[],
): LeagueAiInsights {
  const own = table.find((r) => r.isOwnClub);
  const top3 = table.slice(0, 3).map((r) => `${r.position}. ${r.teamName} (${r.points} pkt)`);

  let winStreak = 0;
  for (const match of recent) {
    const hs = match.homeScore;
    const as = match.awayScore;
    if (hs == null || as == null) break;
    const homeOwn = isOwnLeagueTeamName(match.homeTeamName, teams);
    const won = homeOwn ? hs > as : as > hs;
    if (won) winStreak += 1;
    else break;
  }

  return {
    seasonName: season.name,
    competitionName: competition.name,
    ownTeamPosition: own?.position ?? null,
    ownTeamPoints: own?.points ?? null,
    winStreak,
    recentResults: recent.map((m) =>
      formatResult(m.homeTeamName, m.awayTeamName, m.homeScore, m.awayScore),
    ),
    nextFixtures: upcoming.map(
      (m) => `${m.matchDate} ${m.homeTeamName} — ${m.awayTeamName}`,
    ),
    tableTop3: top3,
  };
}

export async function buildLeagueAiInsights(
  clubId: string,
  competitionId?: string,
): Promise<LeagueAiInsights | null> {
  const {
    getActiveLeagueSeason,
    getLatestLeagueTable,
    getLeagueCompetitions,
    getLeagueRecentResults,
    getLeagueTeams,
    getLeagueUpcoming,
  } = await import("@/lib/league/loaders");

  const season = await getActiveLeagueSeason(clubId);
  if (!season) return null;

  const competitions = await getLeagueCompetitions(clubId, season.id);
  const competition = competitionId
    ? competitions.find((c) => c.id === competitionId) ?? competitions[0]
    : competitions[0];
  if (!competition) return null;

  const [table, recent, upcoming, teams] = await Promise.all([
    getLatestLeagueTable(clubId, competition.id),
    getLeagueRecentResults(clubId, competition.id, 10),
    getLeagueUpcoming(clubId, competition.id, 5),
    getLeagueTeams(clubId, competition.id),
  ]);

  return buildLeagueAiInsightsFromData(season, competition, table, recent, upcoming, teams);
}

export function formatLeagueInsightsSummary(insights: LeagueAiInsights): string {
  const lines = [
    `Sezon ${insights.seasonName}, ${insights.competitionName}.`,
    insights.ownTeamPosition
      ? `Pozycja własnej drużyny: ${insights.ownTeamPosition}. (${insights.ownTeamPoints ?? 0} pkt)`
      : "Brak danych o pozycji własnej drużyny.",
    `Seria zwycięstw: ${insights.winStreak}.`,
    `Top 3: ${insights.tableTop3.join("; ") || "—"}.`,
    `Ostatnie wyniki: ${insights.recentResults.slice(0, 3).join(" | ") || "—"}.`,
    `Następne mecze: ${insights.nextFixtures.slice(0, 3).join(" | ") || "—"}.`,
  ];
  return lines.join("\n");
}
