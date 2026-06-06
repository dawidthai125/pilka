#!/usr/bin/env node
/**
 * Sprint 19.1 / 20.3C — Club Attention Dashboard validation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testSources() {
  const dashboard = readFileSync(join(root, "src/lib/platform/dashboard.ts"), "utf8");
  const view = readFileSync(
    join(root, "src/features/platform/components/platform-dashboard.tsx"),
    "utf8",
  );

  assert(dashboard.includes("loadHealthMetricsContext"), "single health context");
  assert(dashboard.includes("computeClubHealthRows(ctx)"), "reuse health rows");
  assert(dashboard.includes("evaluatePlatformAlerts"), "reuse alerts");
  assert(!dashboard.includes("computeClubOnboardingStatus("), "no per-club onboarding N+1");
  assert(!dashboard.includes("computePlatformHealthSummary()"), "no duplicate health summary load");
  assert(dashboard.includes("clubsRequiringAttention"), "attention section data");
  assert(dashboard.includes("topAlerts"), "top alerts data");
  assert(dashboard.includes("pendingOwnerInvites"), "pending owner invites data");
  assert(dashboard.includes("onboardingNeedingAction"), "onboarding section data");
  assert(view.includes("Wymaga dzisiaj"), "today priority UI");
  assert(view.includes("Stan platformy"), "platform status KPI UI");
  assert(view.includes("Monitoring i operacje"), "operations section UI");
  assert(!view.includes("Szybkie akcje"), "removed duplicate quick actions");
  assert(!view.includes("Platform Health"), "removed duplicate health section title");
  assert(view.includes("/platform/clubs?status=onboarding"), "onboarding registry link");
  assert(view.includes("monitoring?clubId="), "monitoring deep link");
  console.log("OK source constraints");
}

try {
  testSources();
  console.log("\nvalidate-191a-club-attention-dashboard: PASS");
} catch (err) {
  console.error("\nvalidate-191a-club-attention-dashboard: FAIL", err.message);
  process.exit(1);
}
