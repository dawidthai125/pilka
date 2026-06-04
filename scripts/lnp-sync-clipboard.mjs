#!/usr/bin/env node
/**
 * Czeka na token w schowku i od razu woła API.
 * node scripts/lnp-sync-clipboard.mjs
 */
import { execSync, spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fetchLnpTeamPlayers,
  saveLnpPlayersSnapshot,
  LNP_PLAYERS_SNAPSHOT_PATH,
} from "./lib/league-lnp-sources.mjs";

const teamId = process.env.LNP_TEAM_ID || "312e40bc-a65a-4558-ad00-d1edccc66e60";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = "https://competition-api-pro.laczynaspilka.pl/api/bus/competition/v1/";

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

function extractToken(text) {
  const m = String(text).match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  return m ? m[0] : null;
}

function runSync() {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, ["scripts/sync-league-live.mjs"], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    child.on("close", (code) => resolveRun(code ?? 1));
  });
}

async function main() {
  console.log(`
=== Sync ze schowka ===
1) Ten skrypt CZEKA (nie zamykaj okna)
2) Odswiez laczynaspilka.pl (F5)
3) F12 -> GET .../players -> skopiuj authorization (Ctrl+C)

Lub latwiej: dwuklik IMPORT-MPZPN.cmd (import JSON, bez tokenu)
`);

  let last = "";
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    const token = extractToken(readClipboard());
    if (token && token !== last) {
      last = token;
      console.log("Token w schowku — pobieram API...");
      const t0 = Date.now();
      const roster = await fetchLnpTeamPlayers({ enabled: true, token, teamId, baseUrl });
      console.log(`API ${Date.now() - t0} ms →`, roster.ok ? `OK ${roster.count}` : roster.reason);
      if (roster.ok && roster.players.length) {
        saveLnpPlayersSnapshot({ raw: roster.raw, players: roster.players, teamId });
        console.log("Zapisano", LNP_PLAYERS_SNAPSHOT_PATH);
        process.exit(await runSync());
      }
      console.log("Token wygasl — F5 i skopiuj ponownie.");
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  console.error("Timeout. Uzyj: dwuklik IMPORT-MPZPN.cmd");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
