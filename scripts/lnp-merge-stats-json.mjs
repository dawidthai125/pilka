#!/usr/bin/env node
/**
 * Łączy bramki z drugiego JSON (DevTools → inne żądanie niż /players).
 * Np. plays/.../points lub players/.../stats
 *
 * node scripts/lnp-merge-stats-json.mjs fixtures/league/live/mpzpn-stats.json
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LNP_PLAYERS_SNAPSHOT_PATH,
  loadLnpPlayersSnapshot,
  saveLnpPlayersSnapshot,
  unwrapItems,
  mapLnpStats,
  formatLnpPlayerName,
} from "./lib/league-lnp-sources.mjs";
import { normalizeName } from "./lib/league-player-utils.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const statsPath = resolve(root, process.argv[2] || "fixtures/league/live/mpzpn-stats.json");

const snap = loadLnpPlayersSnapshot();
if (!snap?.ok) {
  console.error("Najpierw: node scripts/lnp-import-players-json.mjs");
  process.exit(1);
}
if (!existsSync(statsPath)) {
  console.error(`Brak: ${statsPath}`);
  console.error("W DevTools (przy widoku strzelcow) szukaj GET z: points, stats, goals");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(statsPath, "utf8"));
const rows = unwrapItems(raw);
const byId = new Map();
const byName = new Map();

for (const row of rows) {
  const id = row?.playerId ?? row?.id ?? row?.personId ?? null;
  const name = formatLnpPlayerName(row);
  const st = mapLnpStats(row);
  if (id) byId.set(id, st);
  if (name) byName.set(normalizeName(name), st);
}

const merged = snap.players.map((p) => {
  const st = (p.lnpPlayerId && byId.get(p.lnpPlayerId)) || byName.get(normalizeName(p.leaguePlayerName));
  if (!st) return p;
  return {
    ...p,
    appearances: Math.max(p.appearances, st.appearances),
    goals: Math.max(p.goals, st.goals),
    yellowCards: Math.max(p.yellowCards, st.yellowCards),
    redCards: Math.max(p.redCards, st.redCards),
    minutes: Math.max(p.minutes, st.minutes),
    sources: p.sources.includes("mpzpn_lnp_stats") ? p.sources : [...p.sources, "mpzpn_lnp_stats"],
  };
});

saveLnpPlayersSnapshot({ raw: snap.raw, players: merged, teamId: snap.teamId });
const g = merged.filter((p) => p.goals > 0);
console.log(`Polaczono ${rows.length} wierszy statystyk. Z bramkami: ${g.length}`);
for (const p of g.slice(0, 15)) console.log(`  ${p.leaguePlayerName}: ${p.goals} g`);
