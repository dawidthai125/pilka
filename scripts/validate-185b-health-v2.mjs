#!/usr/bin/env node
/**
 * Sprint 18.5B — Health v2 validation (scoring checks + health.ts constraints + optional live RPC).
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

function freshnessScore(hours) {
  if (hours == null) return 0;
  if (hours <= 24) return 100;
  if (hours <= 48) return 80;
  if (hours <= 72) return 60;
  if (hours <= 96) return 40;
  return 0;
}

function successScore(rate, jobCount) {
  if (jobCount === 0) return 100;
  if (rate == null) return 0;
  return Math.max(0, Math.min(100, rate));
}

function latencyScore(avgMs) {
  if (avgMs == null) return 100;
  const seconds = avgMs / 1000;
  if (seconds < 30) return 100;
  if (seconds < 60) return 80;
  if (seconds < 120) return 60;
  if (seconds < 300) return 30;
  return 0;
}

function computeSyncHealthScore(metrics) {
  const jobCount = metrics?.jobCount ?? 0;
  const score =
    freshnessScore(metrics?.freshnessHours ?? null) * 0.4 +
    successScore(metrics?.successRate ?? null, jobCount) * 0.35 +
    latencyScore(metrics?.avgDurationMs ?? null) * 0.25;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function testScoring() {
  assert(freshnessScore(12) === 100, "freshness 12h");
  assert(freshnessScore(36) === 80, "freshness 36h");
  assert(freshnessScore(100) === 0, "freshness 100h");
  assert(successScore(95, 10) === 95, "success rate");
  assert(successScore(null, 0) === 100, "success no jobs");
  assert(latencyScore(25000) === 100, "latency 25s");
  assert(latencyScore(45000) === 80, "latency 45s");
  assert(
    computeSyncHealthScore({
      freshnessHours: 10,
      successRate: 100,
      jobCount: 5,
      avgDurationMs: 20000,
    }) >= 95,
    "composite high",
  );
  console.log("OK scoring formulas");
}

function testHealthSource() {
  const healthPath = join(root, "src/lib/platform/health.ts");
  const src = readFileSync(healthPath, "utf8");
  assert(!src.includes("league_sync_jobs"), "health.ts must not query league_sync_jobs");
  assert(!src.includes("league_sync_logs"), "health.ts must not query league_sync_logs");
  assert(src.includes("loadPlatformSyncMetrics"), "health.ts must use loadPlatformSyncMetrics");
  assert(src.includes("loadHealthMetricsContext"), "health.ts must define loadHealthMetricsContext");
  console.log("OK health.ts source constraints");
}

async function testLiveRpc() {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  const projectRef = process.env.SUPABASE_PROJECT_REF ?? "pwkqnwqvrdiaycveacxa";
  if (!dbPassword) {
    console.log("SKIP live RPC (no SUPABASE_DB_PASSWORD)");
    return;
  }

  const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS n FROM public.platform_sync_metrics(NULL::uuid, NULL::text, 7)`,
  );
  await client.end();
  console.log("OK live RPC rows:", rows[0]?.n ?? 0);
}

async function main() {
  testHealthSource();
  testScoring();
  await testLiveRpc();
  console.log("\nvalidate-185b-health-v2: PASS");
}

main().catch((err) => {
  console.error("\nvalidate-185b-health-v2: FAIL", err.message);
  process.exit(1);
});
