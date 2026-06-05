#!/usr/bin/env node
/**
 * Sprint 19.3B — SaaS Readiness P0 validation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testSources() {
  const onboarding = readFileSync(join(root, "src/lib/platform/onboarding-status.ts"), "utf8");
  const registry = readFileSync(join(root, "src/lib/platform/club-operations-registry.ts"), "utf8");
  const health = readFileSync(join(root, "src/lib/platform/health.ts"), "utf8");
  const audit = readFileSync(join(root, "src/lib/platform/audit.ts"), "utf8");
  const clubsPage = readFileSync(join(root, "src/app/(platform)/platform/clubs/page.tsx"), "utf8");
  const registryView = readFileSync(
    join(root, "src/features/platform/components/club-operations-registry.tsx"),
    "utf8",
  );
  const monitoringPage = readFileSync(
    join(root, "src/app/(platform)/platform/monitoring/page.tsx"),
    "utf8",
  );
  const sql = readFileSync(join(root, "scripts/sql/hotfix-193b-platform-audit-prune.sql"), "utf8");

  assert(!onboarding.includes("listPlatformClubs()") || !/getPlatformClubDetail[\s\S]*listPlatformClubs/.test(onboarding), "detail must not call listPlatformClubs");
  assert(onboarding.includes(".eq(\"id\", clubId)"), "single-club fetch in detail");
  assert(registry.includes("loadClubOperationsRegistryPage"), "registry pagination loader");
  assert(registry.includes("REGISTRY_DEFAULT_PAGE_SIZE"), "registry default page size");
  assert(registry.includes("25"), "page size 25 option");
  assert(clubsPage.includes("loadClubOperationsRegistryPage"), "clubs page uses paginated loader");
  assert(registryView.includes("pagination.totalPages"), "registry pagination UI");
  assert(health.includes("clubHealthPagination"), "monitoring health pagination");
  assert(health.includes("paginateRows"), "health paginate helper");
  assert(monitoringPage.includes("clubHealthPage"), "monitoring page params");
  assert(audit.includes("PLATFORM_AUDIT_MAX_ENTRIES"), "audit max entries");
  assert(audit.includes("trimPlatformAuditEntries"), "audit trim on write");
  assert(sql.includes("platform_prune_platform_audit"), "SQL audit prune");
  console.log("OK source constraints");
}

try {
  testSources();
  console.log("\nvalidate-193b-saas-readiness-p0: PASS");
} catch (err) {
  console.error("\nvalidate-193b-saas-readiness-p0: FAIL", err.message);
  process.exit(1);
}
