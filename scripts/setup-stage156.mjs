#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("ETAP 15.6 — setup Communication Hub\n");
run("npm", ["run", "db:migrate:stage156"]);
run("npm", ["run", "db:migrate:stage156-audit"]);
run("npm", ["run", "db:migrate:stage156-security"]);
run("npm", ["run", "db:migrate:stage156-fix"]);
run("npm", ["run", "audit:stage156"]);
run("npm", ["run", "audit:stage156-roles"]);
console.log("\n✓ Communication Hub — migracje, seed i audyt statyczny zakończone.");
