#!/usr/bin/env node
/**
 * Sprint 20.5A — Members Management Foundation validation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function testMembersPage() {
  const page = read("src/app/(dashboard)/members/page.tsx");
  const panel = read("src/features/members/components/members-panel.tsx");

  assert(
    page.includes("MembersPanel") || page.includes("MembersDashboard"),
    "members page uses members UI",
  );
  assert(page.includes("Członkowie"), "members page title");
  assert(panel.includes("Imię i nazwisko"), "table column: name");
  assert(panel.includes("Email"), "table column: email");
  assert(panel.includes("Data dołączenia"), "table column: join date");
  assert(panel.includes("Zmień rolę"), "action: change role");
  assert(panel.includes("Zawieś"), "action: suspend");
  assert(panel.includes("Przywróć"), "action: reactivate");
  assert(panel.includes("Usuń"), "action: remove");
  assert(panel.includes("Brak członków klubu"), "empty state");
  console.log("OK members page and UI");
}

function testActions() {
  const actions = read("src/features/members/actions.ts");
  const mutation = read("src/lib/members/member-mutation.ts");

  assert(actions.includes("export async function changeMemberRole"), "changeMemberRole");
  assert(actions.includes("export async function suspendMember"), "suspendMember");
  assert(actions.includes("export async function reactivateMember"), "reactivateMember");
  assert(actions.includes("export async function removeMember"), "removeMember");
  assert(
    actions.includes("canManageMemberTarget") || mutation.includes("canManageMemberTarget"),
    "owner protection in actions or mutation core",
  );
  assert(
    actions.includes("canAssignClubRole") || mutation.includes("canAssignClubRole"),
    "role assignment guard",
  );
  assert(
    actions.includes("changeMembershipRoleById") || actions.includes("canAssignClubRole"),
    "changeMemberRole mutation path",
  );
  assert(actions.includes('revalidatePath("/members")'), "revalidate members path");
  console.log("OK server actions");
}

function testRbacGuards() {
  const guards = read("src/lib/members/guards.ts");
  const session = read("src/lib/auth/session.ts");
  const permissions = read("src/config/permissions.ts");

  assert(guards.includes('targetRole === "owner"'), "owner protection guard");
  assert(guards.includes("canManageMembers"), "leadership check");
  assert(session.includes("requireMemberManageAccess"), "requireMemberManageAccess");
  assert(permissions.includes("canManageMembers"), "canManageMembers helper");
  assert(
    permissions.includes('"owner", "president", "sports_director"'),
    "leadership roles for manage",
  );
  console.log("OK RBAC guards");
}

function testInvitedToActive() {
  const activation = read("src/lib/members/activate-invited-memberships.ts");
  const session = read("src/lib/auth/session.ts");
  const authActions = read("src/features/auth/actions.ts");
  const callback = read("src/app/auth/callback/route.ts");

  assert(activation.includes('eq("status", "invited")'), "targets invited memberships");
  assert(activation.includes('status: "active"'), "promotes to active");
  assert(session.includes("activateInvitedMemberships"), "dashboard context activates");
  assert(authActions.includes("activateInvitedMemberships"), "sign-in activates");
  assert(callback.includes("activateInvitedMemberships"), "auth callback activates");
  console.log("OK invited → active flow");
}

function testClubMembersQuery() {
  const session = read("src/lib/auth/session.ts");

  assert(session.includes("created_at"), "ClubMemberRow includes created_at");
  assert(session.includes('"active", "invited", "suspended"'), "filters visible statuses");
  console.log("OK getClubMembers shape");
}

async function testActorCanAssignRole() {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) {
    console.log("SKIP actor_can_assign_role DB: no SUPABASE_DB_PASSWORD");
    return;
  }

  const projectRef = process.env.SUPABASE_PROJECT_REF ?? "pwkqnwqvrdiaycveacxa";
  const client = new pg.Client({
    connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows } = await client.query(`
    SELECT
      public.actor_can_assign_role('00000000-0000-0000-0000-000000000001'::uuid, 'owner'::public.club_role) AS anon_owner,
      public.actor_can_assign_role('00000000-0000-0000-0000-000000000001'::uuid, 'coach'::public.club_role) AS anon_coach
  `);

  assert(rows.length === 1, "actor_can_assign_role callable");
  assert(rows[0].anon_owner === false, "unauthenticated context cannot assign owner");
  console.log("OK actor_can_assign_role RPC exists");

  await client.end();
}

async function main() {
  testMembersPage();
  testActions();
  testRbacGuards();
  testInvitedToActive();
  testClubMembersQuery();
  await testActorCanAssignRole();
  console.log("\nvalidate-205a-members-management-foundation: PASS");
}

main().catch((err) => {
  console.error("\nvalidate-205a-members-management-foundation: FAIL");
  console.error(err.message);
  process.exit(1);
});
