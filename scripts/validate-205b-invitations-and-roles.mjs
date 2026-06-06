#!/usr/bin/env node
/**
 * Sprint 20.5B — Invitations & Roles validation.
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

function testInviteForm() {
  const form = read("src/features/members/components/invite-member-form.tsx");
  const actions = read("src/features/members/actions.ts");
  const service = read("src/lib/members/invite-service.ts");
  const roles = read("src/lib/members/invite-roles.ts");

  assert(form.includes("InviteMemberForm"), "invite form component");
  assert(form.includes('name="fullName"'), "full name field");
  assert(form.includes('name="email"'), "email field");
  assert(form.includes('name="role"'), "role field");
  assert(actions.includes("export async function inviteMember"), "inviteMember action");
  assert(service.includes("inviteUserByEmail"), "uses Supabase invite");
  assert(service.includes("inviteClubMember"), "invite service");
  assert(roles.includes('"owner"') === false || !roles.match(/INVITABLE.*owner/s), "owner not invitable");
  assert(roles.includes("president"), "president invitable");
  assert(roles.includes("coach"), "coach invitable");
  console.log("OK invite form");
}

function testPendingInvitations() {
  const panel = read("src/features/members/components/invitations-panel.tsx");
  const invitations = read("src/lib/members/invitations.ts");
  const invitationUtils = read("src/lib/members/invitation-utils.ts");
  const dashboard = read("src/features/members/components/members-dashboard.tsx");

  assert(panel.includes("InvitationsPanel"), "invitations panel");
  assert(panel.includes("Oczekujące"), "pending status label");
  assert(panel.includes("Zaakceptowane"), "accepted status label");
  assert(panel.includes("Wygasłe"), "expired status label");
  assert(panel.includes("Anulowane"), "revoked status label");
  assert(invitationUtils.includes("deriveInvitationStatus"), "status derivation");
  assert(invitations.includes("getClubInvitations"), "invitations loader");
  assert(!panel.includes("@/lib/members/invitations"), "client panel must not import server invitations");
  assert(dashboard.includes("Zaproszenia"), "invitations tab");
  console.log("OK pending invitations");
}

function testResendRevoke() {
  const actions = read("src/features/members/actions.ts");
  const service = read("src/lib/members/invite-service.ts");
  const panel = read("src/features/members/components/invitations-panel.tsx");

  assert(actions.includes("export async function resendInvite"), "resendInvite action");
  assert(actions.includes("export async function revokeInvite"), "revokeInvite action");
  assert(service.includes("resendClubInvite"), "resend service");
  assert(service.includes("revokeClubInvite"), "revoke service");
  assert(service.includes('status: "archived"'), "revoke sets archived");
  assert(panel.includes("Ponów zaproszenie"), "resend UI");
  assert(panel.includes("Anuluj zaproszenie"), "revoke UI");
  console.log("OK resend and revoke");
}

function testOwnerProtection() {
  const guards = read("src/lib/members/guards.ts");
  const actions = read("src/features/members/actions.ts");
  const service = read("src/lib/members/invite-service.ts");
  const roles = read("src/lib/members/invite-roles.ts");

  assert(guards.includes("canInviteClubRole"), "invite role guard");
  assert(actions.includes("canInviteClubRole"), "actions use invite guard");
  assert(!roles.includes('"owner"'), "owner excluded from invitable roles");
  assert(service.includes('membership.role === "owner"'), "blocks owner resend/revoke");
  assert(guards.includes('targetRole === "owner"'), "owner protection in manage");
  console.log("OK owner protection");
}

function testInvitedToActive() {
  const activation = read("src/lib/members/activate-invited-memberships.ts");
  const session = read("src/lib/auth/session.ts");
  const auth = read("src/features/auth/actions.ts");

  assert(activation.includes('eq("status", "invited")'), "activates invited");
  assert(session.includes("activateInvitedMemberships"), "dashboard hook");
  assert(auth.includes("activateInvitedMemberships"), "sign-in hook");
  console.log("OK invited → active preserved");
}

function testDashboardIntegration() {
  const page = read("src/app/(dashboard)/members/page.tsx");
  const dashboard = read("src/features/members/components/members-dashboard.tsx");

  assert(page.includes("MembersDashboard"), "page uses dashboard");
  assert(page.includes("getClubInvitations"), "loads invitations");
  assert(dashboard.includes("Członkowie"), "members tab");
  assert(dashboard.includes("Aktywni:"), "active counter");
  assert(dashboard.includes("Oczekujące zaproszenia:"), "pending counter");
  console.log("OK dashboard integration");
}

async function main() {
  testInviteForm();
  testPendingInvitations();
  testResendRevoke();
  testOwnerProtection();
  testInvitedToActive();
  testDashboardIntegration();
  console.log("\nvalidate-205b-invitations-and-roles: PASS");
}

main().catch((err) => {
  console.error("\nvalidate-205b-invitations-and-roles: FAIL");
  console.error(err.message);
  process.exit(1);
});
