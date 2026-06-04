#!/usr/bin/env node
/**
 * Pełny fetch z karty drużyny ŁNP (wymaga ŚWIEŻEGO tokenu w .env.local lub schowku).
 * node scripts/lnp-fetch-team-auto.mjs
 * node scripts/lnp-fetch-team-auto.mjs "eyJ..."
 */
import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import {
  fetchLnpSquadAndStats,
  getLnpConfig,
  saveLnpPlayersSnapshot,
} from "./lib/league-lnp-sources.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(root, ".env.local") });

const pasted = process.argv[2]?.trim()?.replace(/^Bearer\s+/i, "");
const cfg = getLnpConfig();
if (pasted) cfg.token = pasted;
if (!cfg.token || !cfg.teamId) {
  console.error("Ustaw LNP_TEAM_ID i świeży LNP_ACCESS_TOKEN (lub: node scripts/lnp-fetch-team-auto.mjs \"eyJ...\")");
  process.exit(1);
}

const result = await fetchLnpSquadAndStats({ ...cfg, enabled: true });
if (!result.ok) {
  console.error(result.reason ?? "Błąd API");
  console.error("Token wygasa po ~2 s — skopiuj nowy Bearer i uruchom od razu.");
  process.exit(1);
}

saveLnpPlayersSnapshot({
  raw: null,
  players: result.players,
  teamId: result.teamId,
});

console.log(`OK: ${result.count} zaw., bramki: ${result.players.filter((p) => p.goals > 0).length}`);
console.log(`playId=${result.playId ?? "-"} seasonId=${result.seasonId ?? "-"} leagueId=${result.leagueId ?? "-"}`);
for (const p of result.players.filter((x) => x.goals > 0).slice(0, 12)) {
  console.log(`  ${p.leaguePlayerName}: ${p.goals} g`);
}

spawn(process.execPath, ["scripts/sync-league-live.mjs"], { cwd: root, stdio: "inherit", env: process.env });
