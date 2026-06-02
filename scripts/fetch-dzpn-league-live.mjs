#!/usr/bin/env node
/**
 * @deprecated Użyj: npm run sync:league-live
 * Zachowane dla kompatybilności — przekierowuje do pełnej synchronizacji.
 */
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
console.warn("fetch:league-live → sync:league-live (90minut + regionalnyfutbol)\n");
const result = spawnSync("node", [join(root, "scripts/sync-league-live.mjs"), ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
