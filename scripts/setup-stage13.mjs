#!/usr/bin/env node
/**
 * ETAP 13 setup: AI Club Manager tables + seed.
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { applyMigrationFiles } from "./lib/apply-migrations.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

dotenv.config({ path: join(root, ".env.local") });

const STAGE13_MIGRATIONS = [
  "supabase/migrations/20260615120000_stage13_ai_manager.sql",
  "supabase/migrations/20260615121000_seed_stage13_ai_manager.sql",
  "supabase/migrations/20260615130000_stage13_audit_rls_hardening.sql",
];

async function main() {
  await applyMigrationFiles(root, STAGE13_MIGRATIONS);
  console.log("ETAP 13 (stage13) AI Club Manager migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
