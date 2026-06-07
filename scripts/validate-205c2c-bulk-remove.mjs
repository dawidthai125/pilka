#!/usr/bin/env node
/**
 * Sprint 20.5C.2C — Bulk Remove validation.
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

function testRemoveMutationCore() {
  const core = read("src/lib/members/member-mutation.ts");
  const types = read("src/lib/members/bulk-member-types.ts");
  const eligibility = read("src/lib/members/member-bulk-eligibility.ts");

  assert(core.includes("removeMembershipById"), "removeMembershipById");
  assert(core.includes("runBulkMemberRemoveMutation"), "runBulkMemberRemoveMutation");
  assert(core.includes("evaluateRemoveEligibility"), "evaluateRemoveEligibility");
  assert(core.includes("applyMembershipDelete"), "applyMembershipDelete");
  assert(core.includes("canManageMemberTarget"), "canManageMemberTarget in remove core");
  assert(core.includes("isExcludedFromBulkMemberMutation"), "owner guard in bulk remove core");
  assert(eligibility.includes("isEligibleForBulkRemove"), "bulk remove eligibility");
  assert(eligibility.includes("countEligibleForBulkRemove"), "bulk remove count");
  assert(eligibility.includes("getBulkRemoveTargetIds"), "bulk remove target ids");
  assert(types.includes('"remove"'), "remove operation type");
  assert(types.includes('past: "Usunięto"'), "remove summary verb");
  console.log("OK remove mutation core");
}

function testBulkRemoveAction() {
  const actions = read("src/features/members/actions.ts");

  assert(actions.includes("export async function bulkRemoveMembers"), "bulkRemoveMembers");
  assert(actions.includes("removeMembershipById"), "single remove uses core");
  assert(actions.includes("runBulkMemberRemoveMutation"), "bulk remove uses core");
  console.log("OK bulk remove server action");
}

function testMembersPanelRemoveUx() {
  const panel = read("src/features/members/components/members-panel.tsx");

  assert(panel.includes("bulkRemoveMembers"), "panel wires bulk remove");
  assert(panel.includes("Usuń{removeEligibleCount"), "bulk remove toolbar label Variant A");
  assert(panel.includes('setBulkDialog("remove")'), "bulk remove dialog trigger");
  assert(panel.includes("countEligibleForBulkRemove"), "eligible remove count");
  assert(panel.includes("getBulkRemoveTargetIds"), "eligible-only remove targets");
  assert(panel.includes('title="UWAGA"'), "danger dialog title");
  assert(
    panel.includes("Profil użytkownika pozostanie w systemie"),
    "danger dialog profile note",
  );
  assert(
    panel.includes("Tej operacji nie można cofnąć"),
    "danger dialog irreversibility note",
  );
  assert(
    panel.includes("Rozumiem, że operacja jest nieodwracalna"),
    "confirmation checkbox label",
  );
  assert(panel.includes("requireIrreversibleAck"), "checkbox gating prop");
  assert(panel.includes('tone="danger"'), "danger tone on remove dialog");
  assert(
    panel.includes("Właściciel wykluczony z operacji zbiorczych"),
    "owner exclusion UI hint",
  );
  console.log("OK members panel bulk remove UX");
}

function testOwnerExclusion() {
  const eligibility = read("src/lib/members/member-bulk-eligibility.ts");
  const core = read("src/lib/members/member-mutation.ts");

  assert(
    eligibility.includes("!isExcludedFromBulkMemberMutation(member.role)") &&
      eligibility.includes("isEligibleForBulkRemove"),
    "owner excluded in eligibility",
  );
  assert(core.includes("OWNER_BULK_EXCLUSION_MESSAGE"), "owner skip message in bulk core");
  console.log("OK owner exclusion");
}

function testRegression205a() {
  const panel = read("src/features/members/components/members-panel.tsx");
  const actions = read("src/features/members/actions.ts");

  assert(panel.includes("changeMemberRole"), "205a single role preserved");
  assert(panel.includes("removeMember"), "205a single remove preserved");
  assert(actions.includes("export async function changeMemberRole"), "205a changeMemberRole");
  assert(actions.includes("export async function removeMember"), "205a removeMember");
  console.log("OK regression 20.5A");
}

function testRegression205c1() {
  const panel = read("src/features/members/components/members-panel.tsx");

  assert(panel.includes("Eksportuj zaznaczone"), "205c1 export preserved");
  assert(panel.includes("downloadMembersCsv"), "205c1 csv helper");
  console.log("OK regression 20.5C.1");
}

function testRegression205c2a() {
  const panel = read("src/features/members/components/members-panel.tsx");
  const actions = read("src/features/members/actions.ts");

  assert(panel.includes("bulkSuspendMembers"), "205c2a suspend preserved");
  assert(panel.includes("bulkReactivateMembers"), "205c2a reactivate preserved");
  assert(actions.includes("export async function bulkSuspendMembers"), "205c2a suspend action");
  assert(actions.includes("export async function bulkReactivateMembers"), "205c2a reactivate action");
  console.log("OK regression 20.5C.2A");
}

function testRegression205c2b() {
  const panel = read("src/features/members/components/members-panel.tsx");
  const actions = read("src/features/members/actions.ts");
  const core = read("src/lib/members/member-mutation.ts");

  assert(panel.includes("bulkChangeMemberRoles"), "205c2b bulk role preserved");
  assert(panel.includes("Zmień rolę"), "205c2b toolbar preserved");
  assert(actions.includes("export async function bulkChangeMemberRoles"), "205c2b action");
  assert(core.includes("runBulkMemberRoleMutation"), "205c2b core preserved");
  console.log("OK regression 20.5C.2B");
}

function main() {
  testRemoveMutationCore();
  testBulkRemoveAction();
  testMembersPanelRemoveUx();
  testOwnerExclusion();
  testRegression205a();
  testRegression205c1();
  testRegression205c2a();
  testRegression205c2b();
  console.log("\nvalidate-205c2c-bulk-remove: PASS");
}

main();
