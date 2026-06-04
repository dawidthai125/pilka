#!/usr/bin/env node
/**
 * Sprint 18.5A verification gate — RPC matrix + optional sync job check.
 */
import dotenv from "dotenv";
import pg from "pg";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "pwkqnwqvrdiaycveacxa";
const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;

const REQUIRED_OUT = [
  "out_club_id",
  "last_success_at",
  "success_rate",
  "failed_count",
  "job_count",
  "freshness_hours",
  "avg_duration_ms",
  "p95_duration_ms",
  "has_running_job",
];

function assertRowKeys(row) {
  for (const key of REQUIRED_OUT) {
    if (!(key in row)) throw new Error(`Missing RPC column: ${key}`);
  }
}

async function main() {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const globalRes = await client.query(
    `SELECT * FROM public.platform_sync_metrics(NULL::uuid, NULL::text, 7)`,
  );
  console.log("RPC global rows:", globalRes.rows.length);
  if (globalRes.rows[0]) {
    assertRowKeys(globalRes.rows[0]);
    console.log("RPC global sample:", JSON.stringify(globalRes.rows[0], null, 2));
  }

  const { rows: clubs } = await client.query(
    `SELECT id, slug FROM public.clubs WHERE slug = 'pilot-club-test' LIMIT 1`,
  );
  if (!clubs.length) throw new Error("pilot-club-test not found");
  const clubId = clubs[0].id;
  console.log("Pilot club id:", clubId);

  const clubRes = await client.query(
    `SELECT * FROM public.platform_sync_metrics($1::uuid, NULL::text, 7)`,
    [clubId],
  );
  console.log("RPC club-filter rows:", clubRes.rows.length);
  if (clubRes.rows[0]) assertRowKeys(clubRes.rows[0]);

  const providerRes = await client.query(
    `SELECT * FROM public.platform_sync_metrics($1::uuid, 'mirror_live'::text, 7)`,
    [clubId],
  );
  console.log("RPC pilot provider-filter (mirror_live) rows:", providerRes.rows.length);

  const { rows: piorun } = await client.query(
    `SELECT id FROM public.clubs WHERE slug = 'piorun-wawrzenczyce' LIMIT 1`,
  );
  if (piorun[0]) {
    const piorunMirror = await client.query(
      `SELECT * FROM public.platform_sync_metrics($1::uuid, 'mirror_live'::text, 7)`,
      [piorun[0].id],
    );
    console.log("RPC piorun provider-filter rows:", piorunMirror.rows.length);
    if (piorunMirror.rows[0]) {
      console.log("RPC piorun mirror sample:", JSON.stringify(piorunMirror.rows[0], null, 2));
    }
  }

  const latest = await client.query(
    `SELECT id, status, provider, trigger_source, duration_ms, started_at, completed_at, created_at
     FROM public.league_sync_jobs
     WHERE club_id = $1
     ORDER BY created_at DESC
     LIMIT 3`,
    [clubId],
  );
  console.log("Latest pilot jobs:", JSON.stringify(latest.rows, null, 2));

  await client.end();
  console.log("\nverify-185a-gate: PASS");
}

main().catch((err) => {
  console.error("\nverify-185a-gate: FAIL", err.message);
  process.exit(1);
});
