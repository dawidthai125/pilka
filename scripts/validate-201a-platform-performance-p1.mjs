#!/usr/bin/env node
/**
 * Sprint 20.1 — Platform Performance P1 validation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testSources() {
  const health = readFileSync(join(root, "src/lib/platform/health.ts"), "utf8");
  const dashboard = readFileSync(join(root, "src/lib/platform/dashboard.ts"), "utf8");
  const monitoring = readFileSync(join(root, "src/lib/platform/monitoring.ts"), "utf8");
  const bootstrap = readFileSync(join(root, "src/lib/platform/club-bootstrap.ts"), "utf8");
  const onboarding = readFileSync(join(root, "src/lib/platform/onboarding-status.ts"), "utf8");
  const actions = readFileSync(join(root, "src/features/platform/actions.ts"), "utf8");
  const sql = readFileSync(join(root, "scripts/sql/hotfix-201a-sync-jobs-retention.sql"), "utf8");

  assert(health.includes('import { cache } from "react"'), "health.ts must use React.cache");
  assert(health.includes("cache(loadHealthMetricsContextImpl)"), "health context wrapped in cache");
  assert(health.includes("loadSyncMonitoring(50, clubLookup)"), "monitoring bundle passes club lookup");

  assert(!dashboard.includes("clubsAuditRes"), "dashboard must not fetch clubs for audit");
  assert(!dashboard.includes('from("league_sources").select("id", { count: "exact"'), "dashboard must not count leagues separately");
  assert(dashboard.includes("buildSyncMonitoringData"), "dashboard builds sync monitoring from shared jobs");
  assert(dashboard.includes("countActiveLeagues"), "active leagues from health context");

  assert(monitoring.includes("buildSyncMonitoringData"), "monitoring exports buildSyncMonitoringData");
  assert(monitoring.includes("clubLookup?: Map"), "loadSyncMonitoring accepts optional club lookup");

  assert(bootstrap.includes('.from("profiles")'), "owner lookup uses profiles by email");
  assert(!bootstrap.includes("listUsers"), "owner lookup must not listUsers");

  assert(!onboarding.includes("listPlatformClubs"), "legacy listPlatformClubs removed");
  assert(!actions.includes("fetchPlatformClubs"), "legacy fetchPlatformClubs removed");

  assert(sql.includes("platform_prune_league_sync_jobs"), "SQL retention function");
  assert(sql.includes("league_sync_jobs"), "SQL targets league_sync_jobs");

  console.log("OK source constraints");
}

try {
  testSources();
  console.log("\nvalidate-201a-platform-performance-p1: PASS");
} catch (err) {
  console.error("\nvalidate-201a-platform-performance-p1: FAIL", err.message);
  process.exit(1);
}
