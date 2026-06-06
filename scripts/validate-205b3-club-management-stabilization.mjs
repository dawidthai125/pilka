#!/usr/bin/env node
/**
 * Sprint 20.5B.3 — Club Management Stabilization validation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function testNavigationCzlonkowie() {
  const nav = read("src/config/navigation.ts");
  const page = read("src/app/(dashboard)/members/page.tsx");

  assert(nav.includes('title: "Członkowie"'), 'nav title must be "Członkowie"');
  assert(nav.includes('href: "/members"'), "nav href unchanged");
  assert(!nav.includes('title: "Role", href: "/members"'), 'old "Role" label removed');
  assert(page.includes("Członkowie"), "page title Członkowie");
  console.log("OK navigation Członkowie");
}

function testExistingUserInviteFlow() {
  const service = read("src/lib/members/invite-service.ts");
  const actions = read("src/features/members/actions.ts");
  const form = read("src/features/members/components/invite-member-form.tsx");

  assert(service.includes("delivery: \"login_required\""), "existing user delivery flag");
  assert(service.includes("existingUserInviteMessage"), "existing user message helper");
  assert(service.includes("newUserInviteMessage"), "new user message helper");
  assert(actions.includes("inviteDelivery"), "action state delivery");
  assert(actions.includes("existingUserInviteMessage"), "actions use existing user message");
  assert(form.includes("konto już istnieje"), "form explains existing account");
  assert(form.includes("inviteDelivery"), "form reads delivery state");
  console.log("OK existing user invite flow");
}

function testInvitationsStatusGrouping() {
  const panel = read("src/features/members/components/invitations-panel.tsx");
  const utils = read("src/lib/members/invitation-utils.ts");

  assert(utils.includes("countInvitationsByStatus"), "status counters");
  assert(utils.includes("countInvitationsRequiringAction"), "action required counter");
  assert(utils.includes("INVITATION_STATUS_ORDER"), "status section order");
  assert(panel.includes("Wymaga działania"), "action required filter");
  assert(panel.includes("InvitationStatusSection"), "status sections");
  assert(panel.includes("filterChips"), "status filter chips");
  console.log("OK invitations status grouping");
}

function testAuthHardening() {
  const guard = read("src/lib/members/auth-invite-guard.ts");
  const service = read("src/lib/members/invite-service.ts");
  const actions = read("src/features/members/actions.ts");

  assert(guard.includes("assertClubInviteRateLimit"), "club rate limit");
  assert(guard.includes("inviteUserByEmailWithGuard"), "guarded invite");
  assert(guard.includes("INVITE_AUTH_RETRY_ATTEMPTS"), "retry attempts");
  assert(guard.includes("AuthInviteRateLimitError"), "rate limit error class");
  assert(service.includes("inviteUserByEmailWithGuard"), "service uses guard");
  assert(service.includes("isAuthUserConfirmed"), "existing user resend skip");
  assert(actions.includes("AuthInviteRateLimitError"), "actions handle rate limit");
  console.log("OK auth hardening");
}

function testNoRegression205a205b() {
  const page = read("src/app/(dashboard)/members/page.tsx");
  const dashboard = read("src/features/members/components/members-dashboard.tsx");
  const panel = read("src/features/members/components/members-panel.tsx");
  const actions = read("src/features/members/actions.ts");
  const activation = read("src/lib/members/activate-invited-memberships.ts");

  assert(page.includes("MembersDashboard"), "205a dashboard");
  assert(dashboard.includes("MembersPanel"), "205a members panel");
  assert(dashboard.includes("InvitationsPanel"), "205b invitations panel");
  assert(dashboard.includes("InviteMemberForm"), "205b invite form");
  assert(panel.includes("changeMemberRole"), "205a role change");
  assert(panel.includes("suspendMember"), "205a suspend");
  assert(actions.includes("export async function inviteMember"), "205b invite");
  assert(actions.includes("export async function resendInvite"), "205b resend");
  assert(actions.includes("export async function revokeInvite"), "205b revoke");
  assert(activation.includes('eq("status", "invited")'), "invited→active hook");
  assert(!panel.includes("@/lib/members/invitations"), "client/server split preserved");
  console.log("OK no regression 20.5A/20.5B");
}

async function main() {
  testNavigationCzlonkowie();
  testExistingUserInviteFlow();
  testInvitationsStatusGrouping();
  testAuthHardening();
  testNoRegression205a205b();
  console.log("\nvalidate-205b3-club-management-stabilization: PASS");
}

main().catch((err) => {
  console.error("\nvalidate-205b3-club-management-stabilization: FAIL");
  console.error(err.message);
  process.exit(1);
});
