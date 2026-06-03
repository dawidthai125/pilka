#!/usr/bin/env node
/**
 * Kadra + statystyki sezonowe GLKS Mietków.
 * Kadra (nazwiska): regiowyniki.pl/kadra.
 * Statystyki M/G/ŻK: competition-api-pro (mPZPN) gdy LNP_ACCESS_TOKEN + LNP_TEAM_ID;
 * w przeciwnym razie merge z 90minut (często puste w B Klasie).
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeName, parseLeaguePlayerName } from "./league-player-utils.mjs";
import {
  fetchLnpSquadAndStats,
  getLnpConfig,
  getLnpConfigFromClubConfig,
  loadLnpPlayersSnapshot,
  mergeLnpIntoMirrorRoster,
} from "./league-lnp-sources.mjs";
import { aggregateGoalsFromRegiowynikiMatches } from "./regiowyniki-match-goals.mjs";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; PiorunLeagueSync/1.0)" };

async function get(url) {
  const r = await fetch(url, { headers: UA });
  return { status: r.status, text: await r.text() };
}

export { normalizeName, parseLeaguePlayerName } from "./league-player-utils.mjs";

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

export function parseNinetyMinutStrzelcy(html, teamFilter = /mietk/i) {
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

export function parseNinetyMinutBilans(html) {
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

  if (players.length === 0) {
    const looseRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    while ((m = looseRe.exec(html)) !== null) {
      const row = m[1];
      if (!/<a[^>]*>/.test(row)) continue;
      const name = row.match(/<a[^>]*>([^<]+)</)?.[1]?.trim();
      if (!name || name.length < 4 || /(bilans|mecz|sezon|zawodnik)/i.test(name)) continue;
      const nums = [...row.matchAll(/>\s*(\d+)\s*</g)].map((x) => Number(x[1]));
      if (nums.length < 6) continue;
      const goals = nums[nums.length - 1];
      players.push({
        name,
        matches: nums[0] ?? 0,
        fullMatches: nums[1] ?? 0,
        benchEntries: nums[2] ?? 0,
        minutes: nums[3] ?? 0,
        yellowCards: nums[4] ?? 0,
        redCards: nums[5] ?? 0,
        goals,
        source: "90minut_bilans",
      });
    }
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

export async function fetchSquadAndStats(clubConfig) {
  if (!clubConfig?.clubId) {
    throw new Error("Brak konfiguracji klubu dla pobrania kadry.");
  }

  const squad = clubConfig.squadSources ?? {};
  const urls = {
    regiowynikiKadra: squad.regiowynikiKadra,
    ninetyMinutStrzelcy: squad.ninetyMinutStrzelcy,
    ninetyMinutBilans: squad.ninetyMinutBilans,
    ninetyMinutBilansFallback: squad.ninetyMinutBilansFallback,
  };

  if (!urls.regiowynikiKadra) {
    throw new Error(
      `Brak regiowynikiKadraUrl w league_sources.config dla klubu ${clubConfig.clubId}.`,
    );
  }

  const bilansFallbackUrl =
    urls.ninetyMinutBilansFallback ??
    (urls.ninetyMinutBilans
      ? urls.ninetyMinutBilans.replace(/id_sezon=\d+/, "id_sezon=91")
      : null);

  const [kadraPage, strzelcyPage, bilans107, bilans91] = await Promise.all([
    get(urls.regiowynikiKadra),
    urls.ninetyMinutStrzelcy ? get(urls.ninetyMinutStrzelcy) : Promise.resolve({ status: 404, text: "" }),
    urls.ninetyMinutBilans ? get(urls.ninetyMinutBilans) : Promise.resolve({ status: 404, text: "" }),
    bilansFallbackUrl ? get(bilansFallbackUrl) : Promise.resolve({ status: 404, text: "" }),
  ]);

  const kadra = kadraPage.status === 200 ? parseRegiowynikiKadra(kadraPage.text) : [];
  const strzelcy = strzelcyPage.status === 200 ? parseNinetyMinutStrzelcy(strzelcyPage.text) : [];
  const bilans =
    bilans107.status === 200
      ? parseNinetyMinutBilans(bilans107.text)
      : bilans91.status === 200
        ? parseNinetyMinutBilans(bilans91.text)
        : [];
  let players = mergePlayerStats(kadra, strzelcy, bilans);

  let rwGoals = { ok: false, players: [], matchIds: 0 };
  try {
    rwGoals = await aggregateGoalsFromRegiowynikiMatches(
      players.map((p) => p.leaguePlayerName),
      { delayMs: 100 },
    );
  } catch (err) {
    rwGoals = { ok: false, players: [], matchIds: 0, error: String(err?.message ?? err) };
  }
  if (rwGoals.ok && rwGoals.players.length) {
    const byName = new Map(players.map((p) => [normalizeName(p.leaguePlayerName), p]));
    for (const g of rwGoals.players) {
      const key = normalizeName(g.leaguePlayerName);
      const ex = byName.get(key) ?? {
        leaguePlayerName: g.leaguePlayerName,
        jerseyNumber: null,
        appearances: 0,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
        minutes: 0,
        benchEntries: 0,
        sources: [],
      };
      ex.goals = Math.max(ex.goals, g.goals);
      for (const s of g.sources) {
        if (!ex.sources.includes(s)) ex.sources.push(s);
      }
      byName.set(key, ex);
    }
    players = [...byName.values()].sort((a, b) => b.goals - a.goals || b.appearances - a.appearances);
  }

  const lnpConfig = getLnpConfigFromClubConfig(clubConfig);
  let lnp = await fetchLnpSquadAndStats(lnpConfig);
  if (lnp.ok && lnp.players.length) {
    players = mergeLnpIntoMirrorRoster(players, lnp.players);
  } else {
    const snap = loadLnpPlayersSnapshot();
    if (snap?.ok) {
      players = mergeLnpIntoMirrorRoster(players, snap.players);
      lnp = {
        ok: true,
        skipped: false,
        fromSnapshot: true,
        count: snap.count,
        hasAnyStats: snap.hasAnyStats,
        reason: `Użyto zapisu ${snap.path} (${snap.savedAt ?? "?"})`,
        players: snap.players,
      };
    }
  }

  const fetchedAt = new Date().toISOString();
  const hasAnyStats = players.some(
    (p) => p.appearances > 0 || p.goals > 0 || p.yellowCards > 0 || p.redCards > 0 || p.minutes > 0,
  );

  let statsNote = null;
  if (!hasAnyStats) {
    if (!lnpConfig.enabled) {
      statsNote =
        "Regiowyniki/90minut nie mają bramek per zawodnik w B Klasie. Skopiuj token i UUID drużyny z przeglądarki ŁNP (node scripts/discover-lnp-setup.mjs).";
    } else if (lnp.skipped) {
      statsNote = lnp.reason ?? "Adapter mPZPN pominięty.";
    } else if (!lnp.ok) {
      statsNote = `mPZPN API: ${lnp.reason ?? "błąd pobierania"} — sprawdź token i LNP_TEAM_ID.`;
    } else {
      statsNote = "mPZPN zwróciło kadrę bez statystyk sezonowych (brak LNP_SEASON_ID / LNP_LEAGUE_ID?).";
    }
  }

  return {
    fetchedAt,
    leagueTeamName: clubConfig.ownLeagueName,
    urls,
    lnp: {
      enabled: lnpConfig.enabled,
      ok: lnp.ok,
      skipped: lnp.skipped ?? false,
      count: lnp.players?.length ?? 0,
      hasAnyStats: lnp.hasAnyStats ?? false,
      reason: lnp.reason ?? null,
      teamId: lnpConfig.teamId || null,
    },
    counts: {
      regiowynikiKadra: kadra.length,
      regiowynikiMatchGoals: rwGoals.players?.filter((p) => p.goals > 0).length ?? 0,
      regiowynikiMatchesScanned: rwGoals.matchIds ?? 0,
      ninetyMinutStrzelcy: strzelcy.length,
      ninetyMinutBilans: bilans.length,
      mpzpnLnp: lnp.players?.length ?? 0,
      merged: players.length,
    },
    hasAnyStats,
    statsNote,
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
