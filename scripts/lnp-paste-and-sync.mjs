#!/usr/bin/env node
/**
 * Token mPZPN żyje ~kilka sekund — wklej go i uruchom OD RAZU (bez edycji pliku).
 *
 * PowerShell:
 *   node scripts/lnp-paste-and-sync.mjs "WklejTokenBezSlowaBearer"
 *
 * Lub: odśwież ŁNP → skopiuj Bearer → wklej w .env.local → natychmiast:
 *   npm run sync:league-live
 */
import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchLnpSquadAndStats, getLnpConfig } from "./lib/league-lnp-sources.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(root, ".env.local") });

function normalizeToken(raw) {
  if (!raw) return "";
  let t = raw.trim();
  t = t.replace(/^Bearer\s+/i, "").replace(/^earer\s+/i, "");
  const m = raw.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  return m ? m[0] : t.replace(/\s+/g, "");
}
const pasted = normalizeToken(process.argv[2]);
const teamId =
  process.env.LNP_TEAM_ID || "312e40bc-a65a-4558-ad00-d1edccc66e60";
const token = pasted || process.env.LNP_ACCESS_TOKEN || "";

if (!token) {
  console.error("Brak tokenu. Użycie: node scripts/lnp-paste-and-sync.mjs \"eyJ...\"");
  process.exit(1);
}

const cfg = { ...getLnpConfig(), enabled: true, token, teamId };
const t0 = Date.now();
const result = await fetchLnpSquadAndStats(cfg);
console.log(`Czas: ${Date.now() - t0} ms`);

if (!result.ok) {
  console.error("Błąd:", result.reason ?? result.status);
  console.error("\nToken wygasa po ~2 s. Odśwież laczynaspilka.pl, skopiuj Bearer i uruchom ten skrypt w ciągu kilku sekund.");
  process.exit(1);
}

console.log(`OK: ${result.count} zawodników, hasAnyStats=${result.hasAnyStats}`);
for (const p of (result.players ?? []).filter((x) => x.goals > 0).slice(0, 12)) {
  console.log(`  ${p.leaguePlayerName}: ${p.goals} g, ${p.appearances} m`);
}

if (!result.hasAnyStats) {
  console.log("\nKadra pobrana, ale brak bramek w odpowiedzi API (może brak LNP_SEASON_ID / LNP_LEAGUE_ID).");
}
