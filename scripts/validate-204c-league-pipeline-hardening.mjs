#!/usr/bin/env node
/**
 * Sprint 20.4C — League pipeline hardening validation.
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

function testCronConfig() {
  const vercel = read("vercel.json");
  const route = read("src/app/api/cron/league-sync/route.ts");
  assert(vercel.includes("/api/cron/league-sync"), "vercel.json cron path");
  assert(vercel.includes("0 6 * * *"), "daily cron schedule");
  assert(route.includes("LEAGUE_SYNC_CRON_SECRET"), "LEAGUE_SYNC_CRON_SECRET support");
  assert(route.includes("CRON_SECRET"), "CRON_SECRET fallback");
  assert(route.includes("maxDuration = 300"), "sync timeout budget");
  console.log("OK cron config");
}

function testFreshnessMetrics() {
  const syncMetrics = read("src/lib/platform/sync-metrics.ts");
  const migration = read("supabase/migrations/20260706120000_sprint_204c_sync_metrics_hardening.sql");
  const health = read("src/lib/platform/health.ts");

  assert(syncMetrics.includes("lastMirrorLiveAt"), "lastMirrorLiveAt type");
  assert(syncMetrics.includes("lastManualImportAt"), "lastManualImportAt type");
  assert(syncMetrics.includes("mirrorLiveFreshnessHours"), "mirrorLiveFreshnessHours type");
  assert(syncMetrics.includes("manualImportFreshnessHours"), "manualImportFreshnessHours type");
  assert(syncMetrics.includes("mirrorFreshnessHours"), "mirrorFreshnessHours helper");
  assert(migration.includes("last_mirror_live_at"), "RPC last_mirror_live_at");
  assert(migration.includes("manual_import_freshness_hours"), "RPC manual_import_freshness");
  assert(health.includes("mirrorFreshnessHours"), "health uses mirror freshness");
  assert(health.includes("manualImportFreshnessHours"), "health shows manual import age");
  console.log("OK freshness metrics split");
}

function testNormalization() {
  const pipeline = read("scripts/lib/league-live-pipeline.mjs");
  const clubConfig = read("scripts/lib/league-club-config.mjs");

  assert(clubConfig.includes("normalizeMirrorUrl"), "URL normalization");
  assert(pipeline.includes("normalizeTeamName(resolveDisplayName"), "table name normalization");
  assert(pipeline.includes("snapshotKeys"), "snapshot cleanup keys");
  assert(pipeline.includes('from("league_table_entries").delete()'), "stale entry delete");
  console.log("OK team name + URL normalization");
}

function testPropagation() {
  const pipeline = read("scripts/lib/league-live-pipeline.mjs");
  assert(pipeline.includes('"pending", "conflict", "synced"'), "propagate synced rows");
  assert(pipeline.includes("namesChanged"), "detect team name changes in ingest");
  console.log("OK match propagation");
}

function testStaleAlert() {
  const alerts = read("src/lib/platform/platform-alerts.ts");
  assert(alerts.includes("league_sync_stale"), "league_sync_stale type");
  assert(alerts.includes("League Sync Stale"), "alert title");
  assert(alerts.includes("mirrorFreshnessHours"), "alert uses mirror freshness");
  assert(alerts.includes("freshness > 48"), "CRITICAL threshold 48h");
  assert(alerts.includes("freshness > 24"), "WARNING threshold 24h");
  console.log("OK League Sync Stale alert");
}

async function testLiveRpcColumns() {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  const projectRef = process.env.SUPABASE_PROJECT_REF ?? "pwkqnwqvrdiaycveacxa";
  if (!dbPassword) {
    console.log("SKIP live RPC columns (no SUPABASE_DB_PASSWORD)");
    return;
  }

  const client = new pg.Client({
    connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows } = await client.query(
    `SELECT * FROM public.platform_sync_metrics(NULL::uuid, NULL::text, 7) LIMIT 1`,
  );
  assert(rows.length > 0, "platform_sync_metrics returns rows");
  const sample = rows[0];
  for (const col of [
    "last_mirror_live_at",
    "last_manual_import_at",
    "mirror_live_freshness_hours",
    "manual_import_freshness_hours",
  ]) {
    assert(col in sample, `RPC column ${col}`);
  }
  await client.end();
  console.log("OK live RPC columns");
}

async function testUrlNormalizer() {
  const { normalizeMirrorUrl } = await import("./lib/league-club-config.mjs");
  assert(
    normalizeMirrorUrl("regionalnyfutbol.pl/wroclaw-vii").startsWith("https://"),
    "RF shorthand gets https",
  );
  assert(
    normalizeMirrorUrl("90minut.pl/liga14526").startsWith("http://"),
    "90minut shorthand gets http",
  );
  console.log("OK normalizeMirrorUrl runtime");
}

async function main() {
  testCronConfig();
  testFreshnessMetrics();
  testNormalization();
  testPropagation();
  testStaleAlert();
  await testUrlNormalizer();
  await testLiveRpcColumns();
  console.log("\nvalidate-204c-league-pipeline-hardening: PASS");
}

main().catch((err) => {
  console.error("\nvalidate-204c-league-pipeline-hardening: FAIL", err.message);
  process.exit(1);
});
