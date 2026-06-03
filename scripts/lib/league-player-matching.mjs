/**
 * Sprint 16.1 — dopasowanie nazwisk ligowych (regiowyniki: „Nazwisko Imię”) do FC OS.
 */
import { normalizeName, parseLeaguePlayerName } from "./league-player-utils.mjs";

export const MATCH_AUTO_THRESHOLD = 95;
export const MATCH_SUGGEST_MIN = 60;

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function surnameSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 100;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return Math.round((1 - dist / maxLen) * 100);
}

function isDemoPlayer(player) {
  return String(player.email ?? "").endsWith("@piorun.test");
}

function scoreCandidate(leagueLast, leagueFirst, clubLast, clubFirst) {
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

/**
 * @param {string} leaguePlayerName
 * @param {Array<{ id: string, first_name: string, last_name: string, email?: string | null, status?: string }>} clubPlayers
 */
export function findBestPlayerMatch(leaguePlayerName, clubPlayers) {
  const { lastName, firstName } = parseLeaguePlayerName(leaguePlayerName);
  const leagueLast = normalizeName(lastName);
  const leagueFirst = normalizeName(firstName);
  if (!leagueLast) return null;

  let best = null;

  for (const player of clubPlayers ?? []) {
    if (isDemoPlayer(player)) continue;
    const clubLast = normalizeName(player.last_name);
    const clubFirst = normalizeName(player.first_name);
    const scored = scoreCandidate(leagueLast, leagueFirst, clubLast, clubFirst);
    if (!scored) continue;
    if (!best || scored.confidence > best.confidence) {
      best = { playerId: String(player.id), ...scored };
    }
  }

  return best;
}

export function resolveMatchTier(confidence) {
  if (confidence >= MATCH_AUTO_THRESHOLD) return "auto";
  if (confidence >= MATCH_SUGGEST_MIN) return "suggest";
  return "unmatched";
}

export function buildMatchFields(leaguePlayerName, clubPlayers, { locked = false } = {}) {
  if (locked) return null;

  const best = findBestPlayerMatch(leaguePlayerName, clubPlayers);
  if (!best) {
    return {
      player_id: null,
      suggested_player_id: null,
      match_status: "unmatched",
      match_confidence: null,
    };
  }

  const tier = resolveMatchTier(best.confidence);
  if (tier === "auto") {
    return {
      player_id: best.playerId,
      suggested_player_id: null,
      match_status: "auto_linked",
      match_confidence: best.confidence,
    };
  }

  if (tier === "suggest") {
    return {
      player_id: null,
      suggested_player_id: best.playerId,
      match_status: "suggested",
      match_confidence: best.confidence,
    };
  }

  return {
    player_id: null,
    suggested_player_id: null,
    match_status: "unmatched",
    match_confidence: best.confidence,
  };
}

export function isLockedMatchStatus(status) {
  return status === "confirmed" || status === "rejected";
}

/** @deprecated use findBestPlayerMatch */
export function matchClubPlayer(leaguePlayerName, clubPlayers) {
  const best = findBestPlayerMatch(leaguePlayerName, clubPlayers);
  if (!best || best.confidence < MATCH_AUTO_THRESHOLD) return null;
  return best.playerId;
}
