#!/usr/bin/env node
/**
 * Sprint 18.5C — Sync History v1 validation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testSources() {
  const history = readFileSync(join(root, "src/lib/platform/sync-history.ts"), "utf8");
  const health = readFileSync(join(root, "src/lib/platform/health.ts"), "utf8");
  const view = readFileSync(join(root, "src/features/platform/components/sync-monitoring-view.tsx"), "utf8");

  assert(history.includes("loadSyncHistory"), "sync-history loader missing");
  assert(history.includes("league_sync_jobs"), "must query league_sync_jobs");
  assert(!history.includes("platform_sync_metrics"), "must not use platform_sync_metrics");
  assert(!history.includes("league_sync_logs"), "v1 must not query logs");
  assert(health.includes("syncHistory"), "bundle must include syncHistory");
  assert(health.includes("loadSyncHistory"), "bundle must load sync history");
  const interactive = readFileSync(
    join(root, "src/features/platform/components/monitoring-interactive.tsx"),
    "utf8",
  );
  assert(
    view.includes("MonitoringInteractive"),
    "monitoring view must use interactive shell",
  );
  assert(interactive.includes("SyncHistorySection"), "interactive must render Sync History");
  assert(
    readFileSync(join(root, "src/features/platform/components/monitoring-interactive.tsx"), "utf8").includes(
      "onRowSelect",
    ),
    "health rows must drive sync history filters",
  );
  assert(!view.includes("Ostatnie synchronizacje"), "legacy sync table should be removed");
  console.log("OK source constraints");
}

async function main() {
  testSources();
  console.log("\nvalidate-185c-sync-history: PASS");
}

main().catch((err) => {
  console.error("\nvalidate-185c-sync-history: FAIL", err.message);
  process.exit(1);
});
