#!/usr/bin/env node
/**
 * Sprint 18.5A — validate league_sync_jobs columns + platform_sync_metrics RPC.
 * Requires migration applied on target DB and SUPABASE_DB_PASSWORD in .env.local.
 */
import dotenv from "dotenv";
import pg from "pg";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const dbUrl = process.env.SUPABASE_DB_URL;
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "pwkqnwqvrdiaycveacxa";

if (!dbPassword && !dbUrl) {
  console.error("Brak SUPABASE_DB_PASSWORD lub SUPABASE_DB_URL w .env.local");
  process.exit(1);
}

const connectionString =
  dbUrl ??
  `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;

async function main() {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const cols = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'league_sync_jobs'
       AND column_name IN ('provider', 'trigger_source', 'duration_ms')
     ORDER BY column_name`,
  );
  const names = cols.rows.map((r) => r.column_name);
  if (names.length !== 3) {
    throw new Error(`Missing columns on league_sync_jobs: got ${names.join(", ") || "(none)"}`);
  }
  console.log("OK columns:", names.join(", "));

  const indexes = await client.query(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = 'league_sync_jobs'
       AND indexname IN (
         'league_sync_jobs_created_at_idx',
         'league_sync_jobs_club_status_created_idx'
       )`,
  );
  if (indexes.rows.length < 2) {
    throw new Error(`Missing indexes: found ${indexes.rows.map((r) => r.indexname).join(", ")}`);
  }
  console.log("OK indexes:", indexes.rows.map((r) => r.indexname).join(", "));

  const fn = await client.query(
    `SELECT 1 FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'platform_sync_metrics'`,
  );
  if (!fn.rows.length) throw new Error("platform_sync_metrics not found");
  console.log("OK RPC: platform_sync_metrics");

  const metrics = await client.query(
    `SELECT * FROM public.platform_sync_metrics(NULL::uuid, NULL::text, 7) LIMIT 5`,
  );
  console.log(`OK metrics rows (sample): ${metrics.rows.length}`);
  if (metrics.rows[0]) {
    console.log(JSON.stringify(metrics.rows[0], null, 2));
  }

  await client.end();
  console.log("\n18.5A DB validation passed.");
}

main().catch((err) => {
  console.error("\n18.5A DB validation failed:", err.message);
  process.exit(1);
});
