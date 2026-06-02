import type { PublicMatchSummary } from "@/types/website";

function readMatchField(value: unknown): string {
  if (value == null) return "";
  const text = String(value).trim();
  if (!text || text === "undefined" || text === "null") return "";
  return text;
}

export function isDisplayablePublicMatch(match: PublicMatchSummary | null | undefined): match is PublicMatchSummary {
  if (!match) return false;
  if (!readMatchField(match.homeTeamName) || !readMatchField(match.awayTeamName)) return false;
  if (!readMatchField(match.matchDate)) return false;
  const parsed = new Date(`${match.matchDate}T12:00:00`);
  return !Number.isNaN(parsed.getTime());
}

export function formatPublicMatchDate(date: string): string | null {
  const normalized = readMatchField(date);
  if (!normalized) return null;
  const parsed = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("pl-PL", {
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

export function formatPublicMatchKickoff(match: PublicMatchSummary): string | null {
  const date = formatPublicMatchDate(match.matchDate);
  if (!date) return null;
  const time = formatPublicMatchTime(match.matchTime);
  return time ? `${date} · ${time}` : date;
}
