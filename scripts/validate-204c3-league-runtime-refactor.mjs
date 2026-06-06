#!/usr/bin/env node
/**
 * Sprint 20.4C.3 — League sync runtime refactor validation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function testNoSpawnInProductionPaths() {
  const cronRoute = read("src/app/api/cron/league-sync/route.ts");
  const leagueActions = read("src/features/platform/league-actions.ts");
  const runtimeIndex = read("src/lib/league/runtime/index.ts");
  const runtimeRunner = read("src/lib/league/runtime/run-league-sync.ts");

  assert(!cronRoute.includes("spawnSync("), "cron route must not use spawnSync");
  assert(!cronRoute.includes("child_process"), "cron route must not use child_process");
  assert(!cronRoute.includes("sync-league-live.mjs"), "cron route must not shell to CLI script");

  assert(!leagueActions.includes("spawnSync("), "league-actions must not use spawnSync");
  assert(!leagueActions.includes("child_process"), "league-actions must not use child_process");
  assert(!leagueActions.includes("sync-league-live.mjs"), "league-actions must not shell to CLI script");

  assert(!runtimeRunner.includes("child_process"), "runtime must not use child_process");
  assert(!runtimeIndex.includes("child_process"), "runtime index must not use child_process");
  console.log("OK no spawnSync in cron/admin/runtime");
}

function testSharedRuntimeWiring() {
  const cronRoute = read("src/app/api/cron/league-sync/route.ts");
  const leagueActions = read("src/features/platform/league-actions.ts");
  const runtimeMjs = read("scripts/lib/league-sync-runtime.mjs");

  assert(cronRoute.includes("runLeagueSync"), "cron uses runLeagueSync");
  assert(leagueActions.includes("runLeagueSync"), "admin uses runLeagueSync");
  assert(runtimeMjs.includes("export async function runLeagueSync"), "shared runtime export");
  assert(runtimeMjs.includes("runLivePipeline"), "runtime calls pipeline");
  assert(!runtimeMjs.includes("spawnSync("), "shared runtime no spawnSync");
  assert(!runtimeMjs.includes('from "node:child_process"'), "shared runtime no child_process import");
  console.log("OK shared runLeagueSync wiring");
}

function testFixturePolicy() {
  const runtimeMjs = read("scripts/lib/league-sync-runtime.mjs");
  assert(runtimeMjs.includes("process.env.VERCEL"), "Vercel-aware fixture policy");
  assert(runtimeMjs.includes("tmpdir"), "temp dir for serverless fixtures");
  assert(runtimeMjs.includes("shouldPersistFixtures"), "explicit fixture toggle");
  console.log("OK fixture policy for serverless");
}

function testBuildTracing() {
  const nextConfig = read("next.config.ts");
  assert(nextConfig.includes("outputFileTracingIncludes"), "tracing includes configured");
  assert(nextConfig.includes("./scripts/lib/**/*"), "scripts/lib traced for serverless");
  console.log("OK outputFileTracingIncludes");
}

async function testLatestJobShape() {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) {
    console.log("SKIP latest job shape: no SUPABASE_DB_PASSWORD");
    return;
  }

  const projectRef = process.env.SUPABASE_PROJECT_REF ?? "pwkqnwqvrdiaycveacxa";
  const client = new pg.Client({
    connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows } = await client.query(
    `SELECT id, status, provider, trigger_source, records_processed, records_failed, completed_at
     FROM league_sync_jobs
     WHERE provider = 'mirror_live' AND status = 'completed'
     ORDER BY created_at DESC
     LIMIT 1`,
  );

  assert(rows.length > 0, "at least one completed mirror_live job exists");
  const job = rows[0];
  assert(job.records_processed > 0, "latest job has records_processed > 0");
  assert(job.completed_at != null, "latest job completed_at set");
  console.log(`OK league_sync_jobs shape (latest id=${job.id}, processed=${job.records_processed})`);

  await client.end();
}

async function main() {
  testNoSpawnInProductionPaths();
  testSharedRuntimeWiring();
  testFixturePolicy();
  testBuildTracing();
  await testLatestJobShape();
  console.log("\nvalidate-204c3-league-runtime-refactor: PASS");
}

main().catch((err) => {
  console.error("\nvalidate-204c3-league-runtime-refactor: FAIL");
  console.error(err.message);
  process.exit(1);
});
