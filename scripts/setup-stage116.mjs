#!/usr/bin/env node
/**
 * ETAP 11.6 setup: Production hardening migration (RLS, storage, anon grants).
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { applyMigrationFiles } from "./lib/apply-migrations.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

dotenv.config({ path: join(root, ".env.local") });

const STAGE116_MIGRATIONS = [
  "supabase/migrations/20260606120000_stage116_production_hardening.sql",
  "supabase/migrations/20260606140000_stage116_p2_security_completion.sql",
];

async function main() {
  await applyMigrationFiles(root, STAGE116_MIGRATIONS);
  console.log("ETAP 11.6 (stage116) production hardening complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
