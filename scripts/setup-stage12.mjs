#!/usr/bin/env node
/**
 * ETAP 12 setup: PWA tables (push subscriptions, notification preferences, queue).
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { applyMigrationFiles } from "./lib/apply-migrations.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

dotenv.config({ path: join(root, ".env.local") });

const STAGE12_MIGRATIONS = ["supabase/migrations/20260610120000_stage12_pwa.sql"];

async function main() {
  await applyMigrationFiles(root, STAGE12_MIGRATIONS);
  console.log("ETAP 12 (stage12) PWA migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
