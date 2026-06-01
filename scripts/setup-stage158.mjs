#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("ETAP 15.8 — setup Club CRM\n");
run("npm", ["run", "db:migrate:stage158"]);
run("npm", ["run", "db:migrate:stage158-audit"]);
run("npm", ["run", "db:migrate:stage158-fix"]);
run("npm", ["run", "db:migrate:stage158-parent"]);
run("npm", ["run", "db:migrate:stage158-coach-events"]);
run("npm", ["run", "audit:stage158"]);
run("npm", ["run", "audit:stage158-roles"]);
console.log("\n✓ Club CRM — migracje, seed i audyt statyczny zakończone.");
