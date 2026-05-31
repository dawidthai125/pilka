import type { MatchCalendarView } from "@/types/matches";
import { addDays, formatIsoDate, parseLocalDate, startOfWeek, monthGridDates } from "@/lib/training/calendar";

export { formatIsoDate, parseLocalDate, addDays, startOfWeek, monthGridDates };

export function getMatchCalendarRange(
  view: MatchCalendarView,
  anchor: Date,
): { from: string; to: string } {
  if (view === "list") {
    const from = formatIsoDate(addDays(anchor, -90));
    const to = formatIsoDate(addDays(anchor, 90));
    return { from, to };
  }

  if (view === "week") {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    return { from: formatIsoDate(start), to: formatIsoDate(end) };
  }

  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: formatIsoDate(start), to: formatIsoDate(end) };
}

export function groupMatchesByDate<T extends { matchDate: string }>(
  matches: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const match of matches) {
    const list = map.get(match.matchDate) ?? [];
    list.push(match);
    map.set(match.matchDate, list);
  }
  return map;
}

export function matchResultLabel(
  homeTeam: string,
  awayTeam: string,
  ownTeamName: string,
  homeScore: number | null,
  awayScore: number | null,
): string {
  if (homeScore === null || awayScore === null) return "—";
  const isHome = homeTeam === ownTeamName;
  const our = isHome ? homeScore : awayScore;
  const their = isHome ? awayScore : homeScore;
  if (our > their) return "W";
  if (our < their) return "P";
  return "R";
}

export function formStringFromResults(results: string[], count: number): string {
  return results.slice(0, count).join("") || "—";
}
