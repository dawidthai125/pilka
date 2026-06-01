#!/usr/bin/env node
import { spawnSync } from "node:child_process";

function run(label, script) {
  console.log(`\n=== ${label} ===\n`);
  const result = spawnSync("npm", ["run", script], { stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("Migracja ETAP 15.10", "db:migrate:stage1510");
run("Audit hardening", "db:migrate:stage1510-audit");
run("Sync fix", "db:migrate:stage1510-fix");
run("Parent guardian", "db:migrate:stage1510-parent");
run("Seed ETAP 15.10", "db:migrate:stage1510-seed");
run("Audyt statyczny", "audit:stage1510");
run("Audyt ról RLS", "audit:stage1510-roles");
console.log("\nETAP 15.10 setup complete.\n");
