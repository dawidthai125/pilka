#!/usr/bin/env node
/**
 * Bramki per zawodnik z publicznych protokołów Regiowyniki (/mecz/{id}/).
 * Nie wymaga tokenu mPZPN.
 */
import { normalizeName, parseLeaguePlayerName } from "./league-player-utils.mjs";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; PiorunLeagueSync/1.0)" };
const TEAM_PAGE =
  "https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/Wroclaw_VII/";
const OWN_TEAM = /mietk/i;

export function parseGoalScorerFromDetails(raw) {
  const text = raw.replace(/\s+/g, " ").trim();
  const main = text.split("(")[0].trim();
  return main;
}

export function parseRegiowynikiMatchGoals(html) {
  const goals = [];
  const rows = [...html.matchAll(/<tr>[\s\S]*?imagemap goal[\s\S]*?<\/tr>/gi)];
  for (const row of rows) {
    const r = row[0];
    const nameRaw = r.match(/details[^>]*>([^<]+)</)?.[1];
    if (!nameRaw) continue;
    const scorer = parseGoalScorerFromDetails(nameRaw);
    if (!scorer || scorer.length < 3) continue;
    goals.push({ scorer, raw: nameRaw, source: "regiowyniki_match_goal" });
  }
  const suicides = [...html.matchAll(/<tr>[\s\S]*?imagemap suicide[\s\S]*?<\/tr>/gi)];
  for (const row of suicides) {
    const r = row[0];
    const nameRaw = r.match(/details[^>]*>([^<]+)</)?.[1];
    if (!nameRaw) continue;
    goals.push({
      scorer: parseGoalScorerFromDetails(nameRaw),
      raw: nameRaw,
      source: "regiowyniki_own_goal",
    });
  }
  return goals;
}

export async function fetchRegiowynikiMietkowMatchIds() {
  const html = await fetch(TEAM_PAGE, { headers: UA }).then((r) => r.text());
  return [...new Set([...html.matchAll(/\/mecz\/(\d+)\//g)].map((m) => m[1]))];
}

function nameMatchesRoster(scorer, rosterKeys) {
  const key = normalizeName(scorer);
  if (rosterKeys.has(key)) return true;
  const p = parseLeaguePlayerName(scorer);
  const alt = normalizeName(`${p.lastName} ${p.firstName}`);
  if (rosterKeys.has(alt)) return true;
  const alt2 = normalizeName(`${p.firstName} ${p.lastName}`);
  return rosterKeys.has(alt2);
}

export async function aggregateGoalsFromRegiowynikiMatches(rosterNames, { delayMs = 120 } = {}) {
  const rosterKeys = new Set();
  for (const n of rosterNames) {
    rosterKeys.add(normalizeName(n));
    const p = parseLeaguePlayerName(n);
    rosterKeys.add(normalizeName(`${p.lastName} ${p.firstName}`));
  }

  const matchIds = await fetchRegiowynikiMietkowMatchIds();
  const byPlayer = new Map();
  const matchLog = [];

  for (const id of matchIds) {
    const url = `https://regiowyniki.pl/mecz/${id}/Pilka_Nozna/Dolnoslaskie/Klasa_B/`;
    const html = await fetch(url, { headers: UA }).then((r) => r.text());
    if (!OWN_TEAM.test(html)) {
      matchLog.push({ id, skipped: true, reason: "not mietkow match" });
      continue;
    }

    const goals = parseRegiowynikiMatchGoals(html);
    let counted = 0;
    for (const g of goals) {
      if (!nameMatchesRoster(g.scorer, rosterKeys)) continue;
      const key = normalizeName(g.scorer);
      const prev = byPlayer.get(key) ?? { leaguePlayerName: g.scorer, goals: 0, matches: new Set() };
      prev.goals += 1;
      prev.matches.add(id);
      byPlayer.set(key, prev);
      counted++;
    }
    matchLog.push({ id, url, totalGoals: goals.length, mietkowGoals: counted });
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  }

  const players = [...byPlayer.values()].map((p) => ({
    leaguePlayerName: p.leaguePlayerName,
    goals: p.goals,
    appearances: 0,
    yellowCards: 0,
    redCards: 0,
    minutes: 0,
    benchEntries: 0,
    sources: ["regiowyniki_match_goals"],
    matchCount: p.matches.size,
  }));

  return {
    ok: true,
    matchIds: matchIds.length,
    players,
    hasAnyStats: players.some((p) => p.goals > 0),
    matchLog,
  };
}
