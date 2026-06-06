#!/usr/bin/env node
/**
 * Sprint 20.3C — Platform UX Cleanup validation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testDashboardUx() {
  const view = readFileSync(join(root, "src/features/platform/components/platform-dashboard.tsx"), "utf8");
  const loader = readFileSync(join(root, "src/lib/platform/dashboard.ts"), "utf8");

  assert(view.indexOf("Wymaga dzisiaj") < view.indexOf("Stan platformy"), "today section before KPI");
  assert(view.indexOf("Stan platformy") < view.indexOf("Monitoring i operacje"), "KPI before operations");
  assert(loader.includes("buildPendingOwnerInvites"), "pending owner loader");
  assert(loader.includes("failedRecentSyncs"), "failed sync slice");
  assert(loader.includes("testClubs"), "test club KPI");
  console.log("OK dashboard UX structure");
}

function testLifecycleOnDetail() {
  const detail = readFileSync(join(root, "src/app/(platform)/platform/clubs/[clubId]/page.tsx"), "utf8");
  const shared = readFileSync(join(root, "src/features/platform/components/club-lifecycle-actions.tsx"), "utf8");
  const registry = readFileSync(join(root, "src/features/platform/components/club-operations-registry.tsx"), "utf8");

  assert(detail.includes("ClubLifecycleActionBar"), "lifecycle on club detail");
  assert(shared.includes("archiveClubAction"), "reuse archive action");
  assert(registry.includes("club-lifecycle-actions"), "registry uses shared lifecycle");
  assert(!registry.includes("LifecycleConfirmButton"), "no duplicated lifecycle dialog");
  console.log("OK lifecycle actions shared");
}

function testPlatformDiscoverability() {
  const header = readFileSync(join(root, "src/components/layout/dashboard-header.tsx"), "utf8");
  const shell = readFileSync(join(root, "src/features/platform/components/platform-shell.tsx"), "utf8");

  assert(header.includes('href="/platform"'), "header link to platform dashboard");
  assert(header.includes("Platforma"), "visible platform CTA label");
  assert(shell.includes("Operacje"), "grouped platform nav");
  assert(shell.includes("Rejestr klubów"), "PL registry label");
  assert(shell.includes("Audit") && !shell.includes("Audit Center"), "audit label PL");
  console.log("OK platform discoverability & nav labels");
}

try {
  testDashboardUx();
  testLifecycleOnDetail();
  testPlatformDiscoverability();
  console.log("\nvalidate-203c-platform-ux: PASS");
} catch (err) {
  console.error("\nvalidate-203c-platform-ux: FAIL", err.message);
  process.exit(1);
}
