import type { PublicMatchSummary } from "@/types/website";

export function formatPublicMatchDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pl-PL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPublicMatchTime(time: string | null | undefined): string | null {
  if (!time) return null;
  const normalized = time.slice(0, 5);
  if (normalized === "00:00") return null;
  return normalized;
}

export function hasPublicMatchResult(match: PublicMatchSummary): boolean {
  return match.homeScore != null && match.awayScore != null;
}

export function formatPublicMatchScore(match: PublicMatchSummary): string | null {
  if (!hasPublicMatchResult(match)) return null;
  return `${match.homeScore}:${match.awayScore}`;
}

export function formatPublicMatchKickoff(match: PublicMatchSummary): string {
  const date = formatPublicMatchDate(match.matchDate);
  const time = formatPublicMatchTime(match.matchTime);
  return time ? `${date} · ${time}` : date;
}
