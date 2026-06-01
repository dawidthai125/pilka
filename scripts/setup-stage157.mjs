#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("ETAP 15.7 — setup Attendance & Availability 2.0\n");
run("npm", ["run", "db:migrate:stage157"]);
run("npm", ["run", "db:migrate:stage157-audit"]);
run("npm", ["run", "audit:stage157"]);
run("npm", ["run", "audit:stage157-roles"]);
console.log("\n✓ Attendance & Availability — migracje, seed i audyt statyczny zakończone.");
