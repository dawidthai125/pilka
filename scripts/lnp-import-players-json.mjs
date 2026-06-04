#!/usr/bin/env node
/**
 * Import kadry z JSON (DevTools → Odpowiedź → Copy response).
 * node scripts/lnp-import-players-json.mjs
 * node scripts/lnp-import-players-json.mjs --clipboard
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LNP_PLAYERS_SNAPSHOT_PATH,
  playersFromLnpJson,
  saveLnpPlayersSnapshot,
  unwrapItems,
} from "./lib/league-lnp-sources.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultIn = resolve(root, "fixtures/league/live/mpzpn-response.json");

function readClipboard() {
  try {
    return execSync(
      'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Get-Clipboard -Raw"',
      { encoding: "utf8", timeout: 5000 },
    );
  } catch {
    return "";
  }
}

function loadRaw() {
  if (process.argv.includes("--clipboard")) {
    const text = readClipboard().trim();
    if (!text.startsWith("{") && !text.startsWith("[")) {
      console.error("Schowek nie zawiera JSON. Skopiuj Odpowiedz z DevTools (nie Bearer!).");
      process.exit(1);
    }
    writeFileSync(defaultIn, text, "utf8");
    console.log("Zapisano ze schowka →", defaultIn);
    return JSON.parse(text);
  }
  const inputPath = resolve(root, process.argv[2] || defaultIn);
  if (!existsSync(inputPath)) {
    console.error(`\nBrak pliku:\n  ${inputPath}\n`);
    console.error("ZROB TO:");
    console.error("  1) F12 → Siec → GET .../players (200)");
    console.error("  2) Zakladka ODPOWIEDZ (Response) → Copy response");
    console.error("  3) Cursor: nowy plik mpzpn-response.json → wklej → Ctrl+S");
    console.error("  4) node scripts/lnp-import-players-json.mjs");
    console.error("\nAlbo: node scripts/lnp-import-players-json.mjs --clipboard");
    console.error("Albo: dwuklik IMPORT-MPZPN.cmd w folderze projektu\n");
    process.exit(1);
  }
  const text = readFileSync(inputPath, "utf8").trim();
  if (text.startsWith("eyJ") || /^Bearer/i.test(text)) {
    console.error("To wyglada na TOKEN, nie JSON odpowiedzi.");
    console.error("Skopiuj zakladke ODPOWIEDZ (Response), nie authorization.");
    process.exit(1);
  }
  return JSON.parse(text);
}

const raw = loadRaw();
const items = unwrapItems(raw);
const players = playersFromLnpJson(raw);

if (!players.length) {
  console.error("JSON nie zawiera listy zawodnikow.");
  if (items[0]) console.error("Klucze pierwszego rekordu:", Object.keys(items[0]).join(", "));
  process.exit(1);
}

saveLnpPlayersSnapshot({
  raw,
  players,
  teamId: process.env.LNP_TEAM_ID || "312e40bc-a65a-4558-ad00-d1edccc66e60",
});

const withGoals = players.filter((p) => p.goals > 0);
console.log(`OK: ${players.length} zawodnikow → ${LNP_PLAYERS_SNAPSHOT_PATH}`);
console.log(`Z bramkami w JSON: ${withGoals.length}`);
if (items[0]) {
  console.log("Przyklad kluczy:", Object.keys(items[0]).slice(0, 12).join(", "));
}
for (const p of withGoals.slice(0, 12)) {
  console.log(`  ${p.leaguePlayerName}: ${p.goals} g`);
}
if (withGoals.length === 0) {
  console.log(`
Uwaga: endpoint /teams/.../players ma TYLKO kadre (imiona, numery) — bez bramek.
To normalne. Bramki sa w INNYM zapytaniu w DevTools:
  - otworz widok strzelcow / statystyk zawodnikow na laczynaspilka.pl
  - w Sieci filtruj: points  lub  stats  lub  goals
  - skopiuj Odpowiedz do fixtures/league/live/mpzpn-stats.json
  - node scripts/lnp-merge-stats-json.mjs
`);
}
console.log("\nNastepny krok: node scripts/sync-league-live.mjs");
