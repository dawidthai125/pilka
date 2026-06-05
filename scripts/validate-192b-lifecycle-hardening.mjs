#!/usr/bin/env node
/**
 * Sprint 19.2B — Lifecycle Hardening validation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testSources() {
  const lifecycle = readFileSync(join(root, "src/lib/platform/club-lifecycle.ts"), "utf8");
  const audit = readFileSync(join(root, "src/lib/platform/platform-audit-actions.ts"), "utf8");
  const registry = readFileSync(
    join(root, "src/features/platform/components/club-operations-registry.tsx"),
    "utf8",
  );
  const clubTest = readFileSync(join(root, "src/lib/platform/club-test.ts"), "utf8");
  const sql = readFileSync(join(root, "scripts/sql/hotfix-192b-platform-restore-club.sql"), "utf8");

  assert(lifecycle.includes("restoreClub"), "restoreClub required");
  assert(lifecycle.includes('"onboarding"'), "restore targets onboarding");
  assert(lifecycle.includes("club_restored"), "club_restored audit");
  assert(lifecycle.includes("resendOwnerInvite"), "owner resend");
  assert(audit.includes("club_restored"), "audit action club_restored");
  assert(audit.includes("owner_invite_resent"), "audit action owner_invite_resent");
  assert(registry.includes("restoreClubAction"), "Restore UI");
  assert(registry.includes("resendOwnerInviteAction"), "Resend UI");
  assert(registry.includes("hideTestClubs"), "hide test filter");
  assert(clubTest.includes("isTestClubFromSettings"), "settings.isTest");
  assert(clubTest.includes("isTestClubSlug"), "slug fallback");
  assert(sql.includes("'onboarding'"), "SQL extends platform_set_club_status");
  assert(sql.includes("archived"), "SQL restore from archived");
  assert(
    readFileSync(join(root, "src/lib/platform/club-db-writes.ts"), "utf8").includes("onboarding"),
    "db writes onboarding status",
  );
  console.log("OK source constraints");
}

try {
  testSources();
  console.log("\nvalidate-192b-lifecycle-hardening: PASS");
} catch (err) {
  console.error("\nvalidate-192b-lifecycle-hardening: FAIL", err.message);
  process.exit(1);
}
