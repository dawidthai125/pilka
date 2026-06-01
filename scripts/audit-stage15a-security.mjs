#!/usr/bin/env node
/**
 * Static security audit — ETAP 15A Content Hub (post-fix).
 * Exit 0 = pass, 1 = failures found.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const checks = [];
let failed = 0;

function pass(id, message) {
  checks.push({ id, status: "PASS", message });
}

function fail(id, message) {
  checks.push({ id, status: "FAIL", message });
  failed += 1;
}

function read(relPath) {
  return readFileSync(join(root, relPath), "utf8");
}

function fileExists(relPath) {
  return existsSync(join(root, relPath));
}

const actions = read("src/features/content/actions.ts");
const migration = read("supabase/migrations/20260617123000_stage15a_audit_hardening.sql");
const baseMigration = read("supabase/migrations/20260617120000_stage15a_content_hub.sql");
const createFromAi = read("src/lib/content/create-from-ai.ts");
const publish = read("src/lib/content/publish.ts");
const writeTools = read("src/lib/ai/agent/tools/write.ts");
const verifyRefs = read("src/lib/content/verify-references.ts");
const listView = read("src/features/content/components/content-post-list.tsx");
const dashboard = read("src/features/content/components/content-dashboard-stats.tsx");

// P0 — channel variant publish bypass
if (
  migration.includes("enforce_content_channel_variant_status") &&
  migration.includes("insufficient role for channel variant status")
) {
  pass("S15A-01", "Trigger blokuje publikację wariantu kanału bez roli publish");
} else {
  fail("S15A-01", "Brak triggera statusu wariantów kanałów");
}

if (
  migration.includes("content_channel_variants_update") &&
  migration.includes("OR status = 'draft'")
) {
  pass("S15A-02", "RLS UPDATE wariantów — coach tylko draft");
} else {
  fail("S15A-02", "content_channel_variants_manage nadal bez ograniczenia statusu");
}

// P0 — post publish role
if (
  baseMigration.includes("enforce_content_publish_role") &&
  baseMigration.includes("insufficient role to publish content")
) {
  pass("S15A-03", "Trigger blokuje publikację posta bez roli publish");
} else {
  fail("S15A-03", "Brak enforce_content_publish_role na content_posts");
}

// P1 — cross-club references
if (
  migration.includes("enforce_content_post_reference_consistency") &&
  migration.includes("enforce_content_asset_reference_consistency")
) {
  pass("S15A-04", "Triggery spójności match/video/sponsor/clip z club_id");
} else {
  fail("S15A-04", "Brak triggerów spójności referencji Content Hub");
}

if (actions.includes("verifyContentReferences") && verifyRefs.includes("Mecz nie należy")) {
  pass("S15A-05", "Walidacja referencji w server actions");
} else {
  fail("S15A-05", "Brak verifyContentReferences w actions");
}

if (createFromAi.includes('throw new Error("Mecz nie należy do tego klubu.")')) {
  pass("S15A-06", "AI generator odrzuca obce match/video/sponsor ID");
} else {
  fail("S15A-06", "createContentPostFromAi akceptuje obce ID");
}

// P1 — publish workflow
if (
  actions.includes('!["approved", "pending_approval"].includes(post.status)') &&
  publish.includes('!["approved", "pending_approval"].includes(post.status)')
) {
  pass("S15A-07", "Publikacja wymaga statusu approved lub pending_approval");
} else {
  fail("S15A-07", "publishContentPostAction / publishContentToWebsite bez walidacji statusu");
}

if (actions.includes('post.status !== "pending_approval"') && actions.includes("approveContentPostAction")) {
  pass("S15A-08", "Akceptacja tylko z pending_approval");
} else {
  fail("S15A-08", "approveContentPostAction bez walidacji statusu");
}

// P1 — approval audit log
if (
  migration.includes("content_approvals_insert") &&
  migration.includes("action = 'submitted'") &&
  migration.includes("actor_can_publish_content")
) {
  pass("S15A-09", "Coach może logować tylko submitted w content_approvals");
} else {
  fail("S15A-09", "content_approvals_insert bez ograniczenia action");
}

// P2 — sponsor asset isolation
if (
  migration.includes("actor_is_sponsor_user") &&
  migration.includes("sponsor_id_for_user") &&
  !migration.includes("OR post_id IS NULL")
) {
  pass("S15A-10", "Sponsor nie widzi biblioteki assetów klubu (post_id IS NULL)");
} else {
  fail("S15A-10", "content_assets_select nadal ujawnia assety bez post_id sponsorowi");
}

// P2 — AI agent
if (writeTools.includes('existing.status === "published"')) {
  pass("S15A-11", "Agent nie resetuje opublikowanego materiału");
} else {
  fail("S15A-11", "proposeContentPublication bez blokady published");
}

if (writeTools.includes('canPublishContent(access.roles) ? "draft" : "pending_approval"')) {
  pass("S15A-12", "generateContentPost zwraca rzeczywisty status");
} else {
  fail("S15A-12", "generateContentPost zawsze zwraca pending_approval");
}

// P2 — mobile responsive
if (
  listView.includes("flex-col") &&
  listView.includes("sm:flex-row") &&
  dashboard.includes("sm:grid-cols-2")
) {
  pass("S15A-13", "Layout Content Hub responsywny (mobile)");
} else {
  fail("S15A-13", "Brak klas responsywnych w komponentach Content Hub");
}

if (fileExists("docs/audit/stage-15a-audit.md")) {
  pass("S15A-14", "Raport audytu stage-15a-audit.md istnieje");
} else {
  fail("S15A-14", "Brak docs/audit/stage-15a-audit.md");
}

console.log("\n=== ETAP 15A Security Audit ===\n");
for (const check of checks) {
  const icon = check.status === "PASS" ? "✓" : "✗";
  console.log(`${icon} [${check.id}] ${check.message}`);
}
console.log(`\n${checks.length - failed}/${checks.length} PASS\n`);

process.exit(failed > 0 ? 1 : 0);
