#!/usr/bin/env node
import { spawnSync } from "node:child_process";

function run(label, script) {
  console.log(`\n=== ${label} ===\n`);
  const result = spawnSync("npm", ["run", script], { stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("Migracja ETAP 15.9", "db:migrate:stage159");
run("Audit hardening", "db:migrate:stage159-audit");
run("RLS fix", "db:migrate:stage159-fix");
run("Player link", "db:migrate:stage159-player");
run("Parent guardian", "db:migrate:stage159-parent-guardian");
run("Ensure player_guardians", "db:migrate:stage159-guardians");
run("Audyt statyczny", "audit:stage159");
run("Audyt ról RLS", "audit:stage159-roles");
console.log("\nETAP 15.9 setup complete.\n");
