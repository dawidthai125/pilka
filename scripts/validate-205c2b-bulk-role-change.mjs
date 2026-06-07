#!/usr/bin/env node
/**
 * Sprint 20.5C.2B — Bulk Role Change validation.
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

function testRoleMutationCore() {
  const core = read("src/lib/members/member-mutation.ts");
  const types = read("src/lib/members/bulk-member-types.ts");
  const eligibility = read("src/lib/members/member-bulk-eligibility.ts");

  assert(core.includes("changeMembershipRoleById"), "changeMembershipRoleById");
  assert(core.includes("runBulkMemberRoleMutation"), "runBulkMemberRoleMutation");
  assert(core.includes("canAssignClubRole"), "canAssignClubRole in core");
  assert(core.includes("canManageMemberTarget"), "canManageMemberTarget in core");
  assert(core.includes("isExcludedFromBulkMemberMutation"), "owner guard in bulk core");
  assert(core.includes("ROLE_UNCHANGED_SKIP_MESSAGE"), "no-op skip message");
  assert(core.includes('"Rola bez zmian"'), "no-op reason text");
  assert(eligibility.includes("isExcludedFromBulkMemberMutation"), "generalized owner exclusion");
  assert(eligibility.includes("isEligibleForBulkRoleChange"), "bulk role eligibility");
  assert(eligibility.includes("countEligibleForBulkRoleChange"), "bulk role count");
  assert(eligibility.includes("getBulkRoleChangeTargetIds"), "bulk role target ids");
  assert(types.includes('"changeRole"'), "changeRole operation type");
  assert(types.includes("targetRole"), "targetRole on result");
  console.log("OK role mutation core");
}

function testBulkRoleAction() {
  const actions = read("src/features/members/actions.ts");

  assert(actions.includes("export async function bulkChangeMemberRoles"), "bulkChangeMemberRoles");
  assert(actions.includes("changeMembershipRoleById"), "single role uses core");
  assert(actions.includes("runBulkMemberRoleMutation"), "bulk role uses core");
  assert(!actions.includes("bulkChangeMemberRole("), "no typo singular action name");
  console.log("OK bulk role server action");
}

function testMembersPanelRoleUx() {
  const panel = read("src/features/members/components/members-panel.tsx");

  assert(panel.includes("bulkChangeMemberRoles"), "panel wires bulk role change");
  assert(panel.includes("Zmień rolę"), "bulk role toolbar label");
  assert(panel.includes("countEligibleForBulkRoleChange"), "eligible role count");
  assert(panel.includes("getBulkRoleChangeTargetIds"), "eligible-only role targets");
  assert(panel.includes("Nowa rola:"), "role select label in dialog");
  assert(panel.includes('name="role"'), "role form field");
  assert(panel.includes("Zmień rolę dla"), "bulk role confirm label");
  assert(
    panel.includes("Właściciel wykluczony z operacji zbiorczych"),
    "owner exclusion UI hint",
  );
  console.log("OK members panel bulk role UX");
}

function testRegression205a205c1205c2a() {
  const panel = read("src/features/members/components/members-panel.tsx");
  const actions = read("src/features/members/actions.ts");

  assert(panel.includes("bulkSuspendMembers"), "205c2a suspend preserved");
  assert(panel.includes("bulkReactivateMembers"), "205c2a reactivate preserved");
  assert(panel.includes("Eksportuj zaznaczone"), "205c1 export preserved");
  assert(panel.includes("changeMemberRole"), "205a single role preserved");
  assert(actions.includes("export async function bulkSuspendMembers"), "205c2a action");
  assert(actions.includes("export async function bulkReactivateMembers"), "205c2a action");
  assert(actions.includes("export async function changeMemberRole"), "205a action");
  assert(actions.includes("export async function removeMember"), "205a remove");
  console.log("OK regression 20.5A / 20.5C.1 / 20.5C.2A");
}

function main() {
  testRoleMutationCore();
  testBulkRoleAction();
  testMembersPanelRoleUx();
  testRegression205a205c1205c2a();
  console.log("\nvalidate-205c2b-bulk-role-change: PASS");
}

main();
