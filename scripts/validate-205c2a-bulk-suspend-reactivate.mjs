#!/usr/bin/env node
/**
 * Sprint 20.5C.2A — Bulk Suspend + Reactivate validation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function testMutationCore() {
  const core = read("src/lib/members/member-mutation.ts");
  const types = read("src/lib/members/bulk-member-types.ts");
  const eligibility = read("src/lib/members/member-bulk-eligibility.ts");

  assert(core.includes("export const MAX_BULK_MEMBERS"), "MAX_BULK_MEMBERS");
  assert(core.includes("suspendMembershipById"), "suspendMembershipById");
  assert(core.includes("reactivateMembershipById"), "reactivateMembershipById");
  assert(core.includes("runBulkMemberStatusMutation"), "runBulkMemberStatusMutation");
  assert(core.includes("canManageMemberTarget"), "RBAC guard in core");
  assert(
    core.includes("isExcludedFromBulkMemberMutation") ||
      core.includes("isExcludedFromBulkMemberStatusChange"),
    "owner guard in bulk core",
  );
  assert(core.includes("OWNER_BULK_EXCLUSION_MESSAGE"), "owner exclusion message in core");
  assert(
    eligibility.includes("isExcludedFromBulkMemberMutation") ||
      eligibility.includes("isExcludedFromBulkMemberStatusChange"),
    "owner exclusion helper",
  );
  assert(eligibility.includes('targetRole === "owner"'), "owner role excluded");
  assert(eligibility.includes("getBulkSuspendTargetIds"), "bulk suspend target ids");
  assert(eligibility.includes("getBulkReactivateTargetIds"), "bulk reactivate target ids");
  assert(types.includes("BulkMemberActionResult"), "BulkMemberActionResult type");
  assert(types.includes("formatBulkMemberSummary"), "bulk summary formatter");
  console.log("OK member-mutation core");
}

function testBulkActions() {
  const actions = read("src/features/members/actions.ts");

  assert(actions.includes("export async function bulkSuspendMembers"), "bulkSuspendMembers");
  assert(actions.includes("export async function bulkReactivateMembers"), "bulkReactivateMembers");
  assert(actions.includes("suspendMembershipById"), "single suspend uses core");
  assert(actions.includes("reactivateMembershipById"), "single reactivate uses core");
  assert(!actions.includes("bulkRemoveMembers"), "no bulk remove in 2A");
  console.log("OK bulk server actions");
}

function testMembersPanelBulkUx() {
  const panel = read("src/features/members/components/members-panel.tsx");

  assert(panel.includes("bulkSuspendMembers"), "panel wires bulk suspend");
  assert(panel.includes("bulkReactivateMembers"), "panel wires bulk reactivate");
  assert(panel.includes("BulkActionResultPanel"), "partial success panel");
  assert(panel.includes("BulkMemberActionDialog"), "bulk confirm dialog");
  assert(panel.includes("Pokaż szczegóły"), "partial success details");
  assert(panel.includes("countEligibleForBulkSuspend"), "eligible suspend count");
  assert(panel.includes("countEligibleForBulkReactivate"), "eligible reactivate count");
  assert(panel.includes("countOwnersInSelection"), "owner selection counter");
  assert(panel.includes("getBulkSuspendTargetIds"), "eligible-only suspend targets");
  assert(panel.includes("getBulkReactivateTargetIds"), "eligible-only reactivate targets");
  assert(
    panel.includes("Właściciel wykluczony z operacji zbiorczych"),
    "owner exclusion UI hint",
  );
  assert(!panel.includes("bulkRemoveMembers"), "no bulk remove UI");
  assert(!panel.includes("@/lib/members/invitations"), "client/server split");
  console.log("OK members panel bulk UX");
}

function testRegression205a205c1() {
  const panel = read("src/features/members/components/members-panel.tsx");
  const actions = read("src/features/members/actions.ts");

  assert(panel.includes("Zmień rolę"), "205a change role");
  assert(panel.includes("Usuń"), "205a remove");
  assert(panel.includes("Eksportuj zaznaczone"), "205c1 export selected");
  assert(panel.includes("suspendMember"), "205a single suspend");
  assert(actions.includes("export async function changeMemberRole"), "changeMemberRole preserved");
  assert(actions.includes("export async function removeMember"), "removeMember preserved");
  console.log("OK regression 20.5A / 20.5C.1");
}

function testSprintSemanticsDoc() {
  const doc = read("docs/architecture/sprint-20.5c.2a-bulk-suspend-reactivate.md");
  assert(doc.includes("Owner Protection"), "doc: owner protection");
  assert(doc.includes("Variant A"), "doc: eligible-only variant A");
  assert(doc.includes("| `total` | 1 |"), "doc: eligible-only totals");
  console.log("OK sprint 20.5C.2A doc");
}

function main() {
  testMutationCore();
  testBulkActions();
  testMembersPanelBulkUx();
  testRegression205a205c1();
  testSprintSemanticsDoc();
  console.log("\nvalidate-205c2a-bulk-suspend-reactivate: PASS");
}

main();
