import type { LeaguePlayerMatchStatus } from "@/types/league";

export const MATCH_AUTO_THRESHOLD = 95;
export const MATCH_SUGGEST_MIN = 60;

export type ClubPlayerCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  status?: string;
};

export type PlayerMatchResult = {
  playerId: string;
  confidence: number;
  method: "exact" | "reversed" | "initial" | "reversed_initial" | "levenshtein";
};

function normalizeName(name: string): string {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseLeaguePlayerName(name: string): { lastName: string; firstName: string } {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return { lastName: parts[0] ?? "", firstName: "" };
  return { lastName: parts[0] ?? "", firstName: parts.slice(1).join(" ") };
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) {
    dp[i]![0] = i;
  }
  for (let j = 0; j <= n; j += 1) {
    dp[0]![j] = j;
  }
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }
  return dp[m]![n]!;
}

function surnameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 100;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return Math.round((1 - dist / maxLen) * 100);
}

function isDemoPlayer(player: ClubPlayerCandidate): boolean {
  return String(player.email ?? "").endsWith("@piorun.test");
}

function scoreCandidate(
  leagueLast: string,
  leagueFirst: string,
  clubLast: string,
  clubFirst: string,
): { confidence: number; method: PlayerMatchResult["method"] } | null {
  if (!leagueLast || !clubLast) return null;

  if (leagueLast === clubLast && leagueFirst === clubFirst && leagueFirst) {
    return { confidence: 100, method: "exact" };
  }

  if (leagueLast === clubFirst && leagueFirst === clubLast && leagueFirst && clubFirst) {
    return { confidence: 96, method: "reversed" };
  }

  if (leagueLast === clubLast && leagueFirst && clubFirst && leagueFirst[0] === clubFirst[0]) {
    return { confidence: 90, method: "initial" };
  }

  if (leagueLast === clubFirst && leagueFirst && clubLast && leagueFirst[0] === clubLast[0]) {
    return { confidence: 88, method: "reversed_initial" };
  }

  const sim = surnameSimilarity(leagueLast, clubLast);
  if (sim >= 85 && leagueFirst && clubFirst && leagueFirst[0] === clubFirst[0]) {
    return { confidence: Math.min(84, sim - 5), method: "levenshtein" };
  }

  if (sim >= 92) {
    return { confidence: Math.min(75, sim - 15), method: "levenshtein" };
  }

  return null;
}

export function findBestPlayerMatch(
  leaguePlayerName: string,
  clubPlayers: ClubPlayerCandidate[],
): PlayerMatchResult | null {
  const { lastName, firstName } = parseLeaguePlayerName(leaguePlayerName);
  const leagueLast = normalizeName(lastName);
  const leagueFirst = normalizeName(firstName);
  if (!leagueLast) return null;

  let best: PlayerMatchResult | null = null;

  for (const player of clubPlayers) {
    if (isDemoPlayer(player)) continue;
    const clubLast = normalizeName(player.lastName);
    const clubFirst = normalizeName(player.firstName);
    const scored = scoreCandidate(leagueLast, leagueFirst, clubLast, clubFirst);
    if (!scored) continue;
    if (!best || scored.confidence > best.confidence) {
      best = { playerId: player.id, ...scored };
    }
  }

  return best;
}

export function resolveMatchTier(confidence: number): "auto" | "suggest" | "unmatched" {
  if (confidence >= MATCH_AUTO_THRESHOLD) return "auto";
  if (confidence >= MATCH_SUGGEST_MIN) return "suggest";
  return "unmatched";
}

export type MatchFieldUpdate = {
  playerId: string | null;
  suggestedPlayerId: string | null;
  matchStatus: LeaguePlayerMatchStatus;
  matchConfidence: number | null;
};

export function buildMatchFields(
  leaguePlayerName: string,
  clubPlayers: ClubPlayerCandidate[],
  options?: { locked?: boolean },
): MatchFieldUpdate | null {
  if (options?.locked) return null;

  const best = findBestPlayerMatch(leaguePlayerName, clubPlayers);
  if (!best) {
    return {
      playerId: null,
      suggestedPlayerId: null,
      matchStatus: "unmatched",
      matchConfidence: null,
    };
  }

  const tier = resolveMatchTier(best.confidence);
  if (tier === "auto") {
    return {
      playerId: best.playerId,
      suggestedPlayerId: null,
      matchStatus: "auto_linked",
      matchConfidence: best.confidence,
    };
  }

  if (tier === "suggest") {
    return {
      playerId: null,
      suggestedPlayerId: best.playerId,
      matchStatus: "suggested",
      matchConfidence: best.confidence,
    };
  }

  return {
    playerId: null,
    suggestedPlayerId: null,
    matchStatus: "unmatched",
    matchConfidence: best.confidence,
  };
}

export function isLockedMatchStatus(status: LeaguePlayerMatchStatus | null | undefined): boolean {
  return status === "confirmed" || status === "rejected";
}
