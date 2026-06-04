#!/usr/bin/env node
import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getLnpConfig, lnpFetch } from "./lib/league-lnp-sources.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(root, ".env.local") });

const cfg = getLnpConfig();
const teamId = cfg.teamId || "312e40bc-a65a-4558-ad00-d1edccc66e60";
console.log("enabled", cfg.enabled);

const tries = [
  `teams/${teamId}/play-dictionaries`,
  `teams/${teamId}`,
  "seasons/dictionaries",
];

for (const path of tries) {
  const r = await lnpFetch({ ...cfg, enabled: !!cfg.token, teamId }, path);
  console.log("\n", path, r.status);
  if (r.ok && r.json) {
    const s = JSON.stringify(r.json);
    console.log(s.slice(0, 1500));
    if (s.length > 1500) console.log("...");
  } else console.log(r.text);
}
