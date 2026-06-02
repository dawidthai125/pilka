#!/usr/bin/env node
/**
 * Test adaptera mPZPN — wymaga .env.local z LNP_ACCESS_TOKEN i LNP_TEAM_ID.
 *
 * node scripts/probe-lnp-team-players.mjs
 */
import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fetchLnpSquadAndStats,
  fetchLnpTeamPlayers,
  getLnpConfig,
  resolveLnpDictionaryIds,
} from "./lib/league-lnp-sources.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(root, ".env.local") });

const cfg = getLnpConfig();
console.log("enabled:", cfg.enabled, "teamId:", cfg.teamId || "(brak)");

if (!cfg.enabled) {
  console.log("\nUstaw w .env.local:");
  console.log("  LNP_ACCESS_TOKEN=...");
  console.log("  LNP_TEAM_ID=uuid-druzyny (z URL drużyny w laczynaspilka.pl / mPZPN)");
  process.exit(1);
}

const resolved = await resolveLnpDictionaryIds(cfg);
console.log("seasonId:", resolved.seasonId || "(auto fail)");
console.log("leagueId:", resolved.leagueId || "(auto fail)");

const roster = await fetchLnpTeamPlayers(resolved);
console.log("\nGET teams/.../players:", roster.ok ? "OK" : roster.reason);
if (roster.preview) console.log("preview:", roster.preview);

const full = await fetchLnpSquadAndStats(cfg);
console.log("\nPełny sync:", full.ok ? `${full.count} zawodników` : full.reason);
console.log("hasAnyStats:", full.hasAnyStats);

for (const p of (full.players ?? []).slice(0, 12)) {
  console.log(
    `  ${p.leaguePlayerName} — ${p.appearances}m, ${p.goals}g, ${p.yellowCards}żk [${p.sources.join("+")}]`,
  );
}
