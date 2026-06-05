#!/usr/bin/env node
/**
 * Sprint 19.0B — Club Operations Registry validation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testSources() {
  const registry = readFileSync(join(root, "src/lib/platform/club-operations-registry.ts"), "utf8");
  const page = readFileSync(join(root, "src/app/(platform)/platform/clubs/page.tsx"), "utf8");
  const view = readFileSync(
    join(root, "src/features/platform/components/club-operations-registry.tsx"),
    "utf8",
  );
  const lifecycle = readFileSync(join(root, "src/lib/platform/club-lifecycle.ts"), "utf8");

  assert(registry.includes("loadClubOperationsRegistry"), "loader required");
  assert(registry.includes("loadHealthMetricsContext"), "must reuse health context");
  assert(registry.includes("computeClubHealthRows"), "must reuse health rows");
  assert(!registry.includes("listPlatformClubs"), "no N+1 listPlatformClubs");
  assert(registry.includes("loadOwnerByClubId"), "bulk owners");
  assert(
    page.includes("loadClubOperationsRegistryPage") || page.includes("loadClubOperationsRegistry"),
    "clubs page uses registry loader",
  );
  assert(registry.includes("loadClubOperationsRegistryPage"), "paginated registry loader");
  assert(view.includes("Requires Attention"), "attention filter");
  assert(view.includes("attention"), "attention query param");
  assert(view.includes("/platform/monitoring?clubId="), "monitoring deep link");
  assert(lifecycle.includes("platformSetClubStatus"), "archive uses RPC");
  assert(lifecycle.includes("restoreClub"), "restore club lifecycle");
  assert(view.includes("Restore"), "restore UI label");
  assert(
    readFileSync(join(root, "src/features/platform/actions.ts"), "utf8").includes("archiveClubAction"),
    "archive action",
  );
  assert(
    readFileSync(join(root, "src/lib/platform/platform-audit-actions.ts"), "utf8").includes("club_archived"),
    "audit action",
  );
  const monitoringPage = readFileSync(
    join(root, "src/app/(platform)/platform/monitoring/page.tsx"),
    "utf8",
  );
  assert(monitoringPage.includes("initialClubId"), "monitoring accepts clubId param");
  console.log("OK source constraints");
}

async function main() {
  testSources();
  console.log("\nvalidate-190b-club-operations-registry: PASS");
}

main().catch((err) => {
  console.error("\nvalidate-190b-club-operations-registry: FAIL", err.message);
  process.exit(1);
});
