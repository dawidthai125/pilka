#!/usr/bin/env node
/**
 * Adapter competition-api-pro (mPZPN / laczynaspilka.pl).
 * Wymaga Bearer token + UUID drużyny z ekosystemu PZPN.
 *
 * Env:
 *   LNP_ACCESS_TOKEN | LNP_API_BEARER_TOKEN
 *   LNP_TEAM_ID (wymagane)
 *   LNP_SEASON_ID, LNP_LEAGUE_ID (opcjonalne — do stats per liga)
 *   LNP_PLAY_ID (opcjonalne — rezerwa na play-off)
 *   LNP_API_BASE (opcjonalne)
 */
import { normalizeName, parseLeaguePlayerName } from "./league-player-utils.mjs";

const DEFAULT_BASE = "https://competition-api-pro.laczynaspilka.pl/api/bus/competition/v1/";

export function getLnpConfig() {
  const token = process.env.LNP_ACCESS_TOKEN || process.env.LNP_API_BEARER_TOKEN || "";
  const teamId = process.env.LNP_TEAM_ID || "";
  const seasonId = process.env.LNP_SEASON_ID || "";
  const leagueId = process.env.LNP_LEAGUE_ID || "";
  const playId = process.env.LNP_PLAY_ID || "";
  const baseUrl = (process.env.LNP_API_BASE || DEFAULT_BASE).replace(/\/?$/, "/");

  return {
    enabled: Boolean(token && teamId),
    token,
    teamId,
    seasonId,
    leagueId,
    playId,
    baseUrl,
  };
}

function pickNumber(obj, ...keys) {
  for (const key of keys) {
    const raw = obj?.[key];
    if (raw == null || raw === "") continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function pickString(obj, ...keys) {
  for (const key of keys) {
    const v = obj?.[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

export function formatLnpPlayerName(player) {
  const direct = pickString(player, "displayName", "fullName", "name", "playerName");
  if (direct) return direct.replace(/\s+/g, " ").trim();

  const first = pickString(player, "firstName", "name", "givenName");
  const last = pickString(player, "lastName", "surname", "familyName");
  if (first && last) return `${last} ${first}`;
  if (last) return last;
  return first;
}

export function mapLnpStats(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      appearances: 0,
      goals: 0,
      yellowCards: 0,
      redCards: 0,
      minutes: 0,
      benchEntries: 0,
    };
  }

  const nested = raw.stats && typeof raw.stats === "object" ? raw.stats : raw;
  const appearances = Math.max(
    pickNumber(nested, "appearances", "matchesPlayed", "playedMatches", "matches", "gamesPlayed", "played"),
    pickNumber(raw, "appearances", "matchesPlayed", "playedMatches", "matches", "gamesPlayed", "played"),
  );
  const benchEntries = Math.max(
    pickNumber(nested, "benchEntries", "benchAppearances", "substituteEntries", "onBench"),
    pickNumber(raw, "benchEntries", "benchAppearances", "substituteEntries", "onBench"),
  );

  return {
    appearances,
    goals: Math.max(pickNumber(nested, "goals", "goalsScored"), pickNumber(raw, "goals", "goalsScored")),
    yellowCards: Math.max(
      pickNumber(nested, "yellowCards", "yellowCardCount", "cardsYellow"),
      pickNumber(raw, "yellowCards", "yellowCardCount", "cardsYellow"),
    ),
    redCards: Math.max(
      pickNumber(nested, "redCards", "redCardCount", "cardsRed"),
      pickNumber(raw, "redCards", "redCardCount", "cardsRed"),
    ),
    minutes: Math.max(
      pickNumber(nested, "minutes", "minutesPlayed", "playedMinutes", "minutesOnPitch"),
      pickNumber(raw, "minutes", "minutesPlayed", "playedMinutes", "minutesOnPitch"),
    ),
    benchEntries,
  };
}

export function mapLnpPlayerToSquadEntry(player, statsOverride = null) {
  const leaguePlayerName = formatLnpPlayerName(player);
  const jerseyRaw = pickNumber(player, "shirtNumber", "jerseyNumber", "number", "squadNumber");
  const stats = mapLnpStats(statsOverride ?? player);

  return {
    leaguePlayerName,
    jerseyNumber: jerseyRaw > 0 ? jerseyRaw : null,
    appearances: stats.appearances,
    goals: stats.goals,
    yellowCards: stats.yellowCards,
    redCards: stats.redCards,
    minutes: stats.minutes,
    benchEntries: stats.benchEntries,
    lnpPlayerId: pickString(player, "id", "playerId", "uuid") || null,
    sources: ["mpzpn_lnp"],
  };
}

function unwrapItems(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.players)) return json.players;
  if (Array.isArray(json?.content)) return json.content;
  return [];
}

export async function lnpFetch(config, path, { method = "GET" } = {}) {
  const url = `${config.baseUrl}${path.replace(/^\//, "")}`;
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.token}`,
      Origin: "https://www.laczynaspilka.pl",
      Referer: "https://www.laczynaspilka.pl/rozgrywki",
      "User-Agent": "PiorunLeagueSync/1.0 (FC OS)",
    },
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { ok: res.ok, status: res.status, url, json, text: text.slice(0, 500) };
}

export async function fetchLnpTeamPlayers(config = getLnpConfig()) {
  if (!config.enabled) {
    return { ok: false, skipped: true, reason: "Brak LNP_ACCESS_TOKEN lub LNP_TEAM_ID", players: [] };
  }

  const res = await lnpFetch(config, `teams/${config.teamId}/players`);
  if (!res.ok) {
    return {
      ok: false,
      skipped: false,
      reason: `teams/${config.teamId}/players → HTTP ${res.status}`,
      status: res.status,
      preview: res.text,
      players: [],
    };
  }

  const players = unwrapItems(res.json).map((p) => mapLnpPlayerToSquadEntry(p));
  return { ok: true, status: res.status, count: players.length, players, raw: res.json };
}

export async function fetchLnpPlayerSeasonStats(config, playerId) {
  if (!config.seasonId || !config.leagueId) return null;
  const path = `players/${playerId}/seasons/${config.seasonId}/leagues/${config.leagueId}/stats`;
  const res = await lnpFetch(config, path);
  if (!res.ok) return null;
  return res.json;
}

export async function enrichLnpPlayersWithSeasonStats(config, players) {
  if (!config.seasonId || !config.leagueId || !players.length) return players;

  const enriched = [];
  for (const player of players) {
    if (!player.lnpPlayerId) {
      enriched.push(player);
      continue;
    }
    const statsJson = await fetchLnpPlayerSeasonStats(config, player.lnpPlayerId);
    if (!statsJson) {
      enriched.push(player);
      continue;
    }
    const stats = mapLnpStats(statsJson);
    enriched.push({
      ...player,
      appearances: Math.max(player.appearances, stats.appearances),
      goals: Math.max(player.goals, stats.goals),
      yellowCards: Math.max(player.yellowCards, stats.yellowCards),
      redCards: Math.max(player.redCards, stats.redCards),
      minutes: Math.max(player.minutes, stats.minutes),
      benchEntries: Math.max(player.benchEntries, stats.benchEntries),
      sources: player.sources.includes("mpzpn_lnp_stats")
        ? player.sources
        : [...player.sources, "mpzpn_lnp_stats"],
    });
  }
  return enriched;
}

/** Resolve season/league IDs from seasons/dictionaries when not set in env. */
export async function resolveLnpDictionaryIds(config) {
  if (config.seasonId && config.leagueId) return config;

  const res = await lnpFetch(config, "seasons/dictionaries");
  if (!res.ok) return config;

  const items = unwrapItems(res.json);
  const current =
    items.find((s) => s.isCurrent === true || s.current === true) ??
    items.find((s) => /2025\/2026|2025-2026/i.test(String(s.name ?? s.label ?? ""))) ??
    items[0];

  if (!current) return config;

  const leagues = unwrapItems(current.leagues ?? current.competitions ?? current.leagueDictionaries);
  const target =
    leagues.find((l) => /wrocław.*vii|wroclaw.*vii|b klasa.*wroc/i.test(String(l.name ?? l.label ?? ""))) ??
    leagues.find((l) => /b klasa/i.test(String(l.name ?? l.label ?? ""))) ??
    leagues[0];

  return {
    ...config,
    seasonId: config.seasonId || pickString(current, "id", "seasonId"),
    leagueId: config.leagueId || pickString(target, "id", "leagueId"),
  };
}

export async function fetchLnpSquadAndStats(config = getLnpConfig()) {
  if (!config.enabled) {
    return {
      ok: false,
      skipped: true,
      reason: "Ustaw LNP_ACCESS_TOKEN i LNP_TEAM_ID w .env.local (UUID drużyny z mPZPN / laczynaspilka.pl).",
      players: [],
    };
  }

  const resolved = await resolveLnpDictionaryIds(config);
  const roster = await fetchLnpTeamPlayers(resolved);
  if (!roster.ok) return roster;

  const players = await enrichLnpPlayersWithSeasonStats(resolved, roster.players);
  const hasAnyStats = players.some(
    (p) => p.appearances > 0 || p.goals > 0 || p.yellowCards > 0 || p.redCards > 0 || p.minutes > 0,
  );

  return {
    ok: true,
    skipped: false,
    status: roster.status,
    count: players.length,
    hasAnyStats,
    seasonId: resolved.seasonId || null,
    leagueId: resolved.leagueId || null,
    teamId: resolved.teamId,
    players,
  };
}

/** Merge LNP stats into mirror roster (regiowyniki names + mPZPN numbers). */
export function mergeLnpIntoMirrorRoster(mirrorPlayers, lnpPlayers) {
  const lnpByName = new Map();
  for (const p of lnpPlayers) {
    const key = normalizeName(p.leaguePlayerName);
    if (key) lnpByName.set(key, p);
  }

  const merged = mirrorPlayers.map((mirror) => {
    const key = normalizeName(mirror.leaguePlayerName);
    const lnp = lnpByName.get(key);
    if (!lnp) return mirror;

    const sources = [...new Set([...(mirror.sources ?? []), ...(lnp.sources ?? ["mpzpn_lnp"])])];
    return {
      ...mirror,
      jerseyNumber: mirror.jerseyNumber ?? lnp.jerseyNumber,
      appearances: Math.max(mirror.appearances, lnp.appearances),
      goals: Math.max(mirror.goals, lnp.goals),
      yellowCards: Math.max(mirror.yellowCards, lnp.yellowCards),
      redCards: Math.max(mirror.redCards, lnp.redCards),
      minutes: Math.max(mirror.minutes, lnp.minutes),
      benchEntries: Math.max(mirror.benchEntries ?? 0, lnp.benchEntries ?? 0),
      sources,
      lnpPlayerId: lnp.lnpPlayerId ?? null,
    };
  });

  for (const lnp of lnpPlayers) {
    const key = normalizeName(lnp.leaguePlayerName);
    if (merged.some((p) => normalizeName(p.leaguePlayerName) === key)) continue;
    merged.push(lnp);
  }

  return merged.sort((a, b) => b.goals - a.goals || b.appearances - a.appearances);
}

export function lnpNameMatchScore(a, b) {
  const pa = parseLeaguePlayerName(a);
  const pb = parseLeaguePlayerName(b);
  let score = 0;
  if (normalizeName(pa.lastName) === normalizeName(pb.lastName)) score += 2;
  if (normalizeName(pa.firstName) === normalizeName(pb.firstName)) score += 1;
  return score;
}
