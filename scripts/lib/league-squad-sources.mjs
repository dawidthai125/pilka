#!/usr/bin/env node
/**
 * Kadra + statystyki sezonowe GLKS Mietków z mirrorów publicznych.
 * Primary roster: regiowyniki.pl/kadra (29 zawodników).
 * Statystyki per zawodnik w B Klasie często puste w HTML — merge z 90minut gdy dostępne.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { LEAGUE_CONFIG } from "./league-live-sources.mjs";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; PiorunLeagueSync/1.0)" };

async function get(url) {
  const r = await fetch(url, { headers: UA });
  return { status: r.status, text: await r.text() };
}

export function normalizeName(name) {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** regiowyniki: "Nazwisko Imię" */
export function parseLeaguePlayerName(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return { lastName: parts[0] ?? "", firstName: "" };
  return { lastName: parts[0], firstName: parts.slice(1).join(" ") };
}

export function parseRegiowynikiKadra(html) {
  const players = [];
  const rowRe =
    /<tr>\s*<td>([^<]+)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const name = m[1].replace(/&nbsp;/g, " ").trim();
    if (!name || name.length < 4 || /Bramki|Gole|Sezon|Drużyna|Nazwisko/i.test(name)) continue;

    const jerseyRaw = strip(m[2]);
    const jerseyNumber = /^\d{1,2}$/.test(jerseyRaw) ? Number(jerseyRaw) : null;
    const cells = [...m[3].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      strip(c[1]),
    );

    players.push({
      name,
      jerseyNumber,
      appearances: num(cells[0]),
      minutes: num(cells[1]),
      goals: num(cells[2]),
      yellowCards: num(cells[3]),
      redCards: num(cells[4]),
      benchEntries: 0,
      source: "regiowyniki_kadra",
    });
  }
  return players;
}

function parseNinetyMinutStrzelcy(html, teamFilter = /mietk/i) {
  const scorers = [];
  const blocks = html.split(/<table[^>]*class="main2"[^>]*>/i);
  for (const block of blocks) {
    if (!/strzelc|bramk/i.test(block.slice(0, 400))) continue;
    const rowRe =
      /<tr[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>\s*(\d+)\s*<\/td>[\s\S]*?<\/tr>/gi;
    let m;
    while ((m = rowRe.exec(block)) !== null) {
      const playerName = strip(m[1]);
      const teamName = strip(m[2]);
      const goals = Number(m[3]);
      if (!playerName || playerName.length < 4 || !teamFilter.test(teamName)) continue;
      scorers.push({ name: playerName, teamName, goals, source: "90minut_strzelcy" });
    }
  }
  return scorers;
}

function parseNinetyMinutBilans(html) {
  const players = [];
  const rowRe =
    /<tr[^>]*>\s*<td[^>]*>\s*(?:<a[^>]*>)?\s*([A-ZĄĆĘŁŃÓŚŹŻ][^\<]{2,40})\s*(?:<\/a>)?\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    players.push({
      name: m[1].trim(),
      matches: Number(m[2]),
      fullMatches: Number(m[3]),
      benchEntries: Number(m[4]),
      minutes: Number(m[5]),
      yellowCards: Number(m[6]),
      redCards: Number(m[7]),
      goals: Number(m[8]),
      source: "90minut_bilans",
    });
  }
  return players;
}

function strip(s) {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function num(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function mergePlayerStats(kadra, strzelcy, bilans) {
  const map = new Map();

  for (const p of kadra) {
    const key = normalizeName(p.name);
    map.set(key, {
      leaguePlayerName: p.name,
      jerseyNumber: p.jerseyNumber,
      appearances: p.appearances,
      goals: p.goals,
      yellowCards: p.yellowCards,
      redCards: p.redCards,
      minutes: p.minutes,
      benchEntries: p.benchEntries ?? 0,
      sources: [p.source],
    });
  }

  for (const s of strzelcy) {
    const key = normalizeName(s.name);
    const existing = map.get(key) ?? {
      leaguePlayerName: s.name,
      jerseyNumber: null,
      appearances: 0,
      goals: 0,
      yellowCards: 0,
      redCards: 0,
      minutes: 0,
      benchEntries: 0,
      sources: [],
    };
    existing.goals = Math.max(existing.goals, s.goals);
    if (!existing.sources.includes(s.source)) existing.sources.push(s.source);
    map.set(key, existing);
  }

  for (const b of bilans) {
    const key = normalizeName(b.name);
    const existing = map.get(key) ?? {
      leaguePlayerName: b.name,
      jerseyNumber: null,
      appearances: 0,
      goals: 0,
      yellowCards: 0,
      redCards: 0,
      minutes: 0,
      benchEntries: 0,
      sources: [],
    };
    existing.appearances = Math.max(existing.appearances, b.matches);
    existing.goals = Math.max(existing.goals, b.goals);
    existing.yellowCards = Math.max(existing.yellowCards, b.yellowCards);
    existing.redCards = Math.max(existing.redCards, b.redCards);
    existing.minutes = Math.max(existing.minutes, b.minutes);
    existing.benchEntries = Math.max(existing.benchEntries, b.benchEntries);
    if (!existing.sources.includes(b.source)) existing.sources.push(b.source);
    map.set(key, existing);
  }

  return [...map.values()].sort((a, b) => b.goals - a.goals || b.appearances - a.appearances);
}

export function buildSeasonStatsNotes(player, fetchedAt) {
  return JSON.stringify({
    season: "2025/2026",
    syncedAt: fetchedAt,
    sources: player.sources,
    stats: {
      appearances: player.appearances,
      goals: player.goals,
      yellowCards: player.yellowCards,
      redCards: player.redCards,
      minutes: player.minutes,
      benchEntries: player.benchEntries,
    },
  });
}

export async function fetchSquadAndStats() {
  const urls = {
    regiowynikiKadra: "https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/kadra/",
    ninetyMinutStrzelcy: "http://www.90minut.pl/strzelcy.php?id_liga=14526",
    ninetyMinutBilans: `http://www.90minut.pl/bilans.php?id_klub=3824&id_sezon=107`,
  };

  const [kadraPage, strzelcyPage, bilansPage] = await Promise.all([
    get(urls.regiowynikiKadra),
    get(urls.ninetyMinutStrzelcy),
    get(urls.ninetyMinutBilans),
  ]);

  const kadra = kadraPage.status === 200 ? parseRegiowynikiKadra(kadraPage.text) : [];
  const strzelcy = strzelcyPage.status === 200 ? parseNinetyMinutStrzelcy(strzelcyPage.text) : [];
  const bilans = bilansPage.status === 200 ? parseNinetyMinutBilans(bilansPage.text) : [];
  const players = mergePlayerStats(kadra, strzelcy, bilans);
  const fetchedAt = new Date().toISOString();
  const hasAnyStats = players.some(
    (p) => p.appearances > 0 || p.goals > 0 || p.yellowCards > 0 || p.redCards > 0 || p.minutes > 0,
  );

  return {
    fetchedAt,
    leagueTeamName: LEAGUE_CONFIG.ownLeagueName,
    urls,
    counts: {
      regiowynikiKadra: kadra.length,
      ninetyMinutStrzelcy: strzelcy.length,
      ninetyMinutBilans: bilans.length,
      merged: players.length,
    },
    hasAnyStats,
    statsNote: hasAnyStats
      ? null
      : "Mirror B Klasy nie publikuje statystyk per zawodnik — zaimportowano kadrę (nazwiska).",
    players,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fetchSquadAndStats()
    .then((r) => {
      console.log(JSON.stringify(r.counts, null, 2));
      if (r.statsNote) console.log("\nUwaga:", r.statsNote);
      console.log("\nPlayers:");
      for (const p of r.players.slice(0, 15)) {
        console.log(
          `  ${p.leaguePlayerName} — ${p.appearances}m, ${p.goals}g, ${p.yellowCards}żk [${p.sources.join("+")}]`,
        );
      }
      const out = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures/league/live/squad-stats.json");
      writeFileSync(out, JSON.stringify(r, null, 2) + "\n");
      console.log("\nSaved", out);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
