#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("ETAP 15B — setup League Hub\n");
run("npm", ["run", "db:migrate:stage15b"]);
run("npm", ["run", "db:migrate:stage15b-audit"]);
run("npm", ["run", "db:migrate:stage15b-trigger-fix"]);
run("npm", ["run", "db:migrate:stage15b-cleanup"]);
console.log("\n✓ Migracje League Hub (schema, seed, audit, trigger-fix, cleanup) zakończone.");
