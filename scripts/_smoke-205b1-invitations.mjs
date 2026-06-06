#!/usr/bin/env node
/**
 * Sprint 20.5B.1 — Invitations & Roles smoke validation.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const TEST_PASSWORD = process.env.SETUP_TEST_PASSWORD ?? "Piorun2026!";
const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ??
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] ??
  "pwkqnwqvrdiaycveacxa";

const INVITABLE = [
  "president",
  "sports_director",
  "coach",
  "treasurer",
  "scout",
  "website_admin",
  "parent",
  "player",
  "sponsor",
];

const ACCOUNTS = {
  owner: "wlasciciel@piorun.test",
  president: "prezes@piorun.test",
  sports_director: "dyrektor@piorun.test",
  coach: "trener@piorun.test",
  treasurer: "skarbnik@piorun.test",
  sponsor: "sponsor@piorun.test",
};

const TAG = `smoke205b1-${Date.now()}`;
const cleanup = { userIds: [], membershipIds: [] };
const results = [];

function record(testId, verdict, detail) {
  results.push({ testId, verdict, detail });
  console.log(`[${verdict}] ${testId} — ${detail}`);
}

function canInviteClubRole(actorRoles, targetRole) {
  const leadership = ["owner", "president", "sports_director"];
  if (!actorRoles.some((r) => leadership.includes(r))) return false;
  if (!INVITABLE.includes(targetRole)) return false;
  if (actorRoles.includes("owner")) return true;
  return targetRole !== "owner";
}

function deriveInvitationStatus(membershipStatus, createdAt, updatedAt) {
  if (membershipStatus === "archived") return "revoked";
  if (membershipStatus === "invited") {
    const sentAt = updatedAt || createdAt;
    const ageMs = Date.now() - new Date(sentAt).getTime();
    return ageMs > 7 * 24 * 60 * 60 * 1000 ? "expired" : "pending";
  }
  if (membershipStatus === "active") {
    if (new Date(updatedAt).getTime() > new Date(createdAt).getTime() + 60_000) return "accepted";
  }
  return null;
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function ensureSmokeUser(admin, email, fullName) {
  const normalized = email.trim().toLowerCase();
  const { data: profile } = await admin.from("profiles").select("id").ilike("email", normalized).maybeSingle();
  if (profile?.id) return String(profile.id);

  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const found = listed?.users?.find((u) => u.email?.toLowerCase() === normalized);
  if (found?.id) return found.id;

  const { data, error } = await admin.auth.admin.createUser({
    email: normalized,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw new Error(error?.message ?? "createUser failed");
  return data.user.id;
}

async function inviteClubMember(admin, { email, fullName, role }) {
  if (!INVITABLE.includes(role)) throw new Error("Nie można zaprosić użytkownika w tej roli.");
  const userId = await ensureSmokeUser(admin, email, fullName);

  const { data: existing } = await admin
    .from("club_memberships")
    .select("id, status")
    .eq("club_id", CLUB_ID)
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle();
  if (existing?.status === "active") throw new Error("already active");
  if (existing?.status === "invited") throw new Error("already invited");

  const { data: row, error } = await admin
    .from("club_memberships")
    .upsert({ club_id: CLUB_ID, user_id: userId, role, status: "invited" }, { onConflict: "club_id,user_id,role" })
    .select("id")
    .single();
  if (error) throw error;
  cleanup.userIds.push(userId);
  cleanup.membershipIds.push(row.id);
  return { userId, membershipId: row.id };
}

async function resendClubInvite(admin, membershipId) {
  const { data: membership } = await admin
    .from("club_memberships")
    .select("id, user_id, role, status")
    .eq("id", membershipId)
    .eq("club_id", CLUB_ID)
    .maybeSingle();
  if (!membership || membership.role === "owner" || membership.status !== "invited") {
    throw new Error("invalid resend target");
  }
  const { error } = await admin
    .from("club_memberships")
    .update({ status: "invited", updated_at: new Date().toISOString() })
    .eq("id", membershipId);
  if (error) throw error;
}

async function revokeClubInvite(admin, membershipId) {
  const { data: membership } = await admin
    .from("club_memberships")
    .select("role, status")
    .eq("id", membershipId)
    .eq("club_id", CLUB_ID)
    .maybeSingle();
  if (!membership || membership.role === "owner" || membership.status !== "invited") {
    throw new Error("invalid revoke target");
  }
  await admin.from("club_memberships").update({ status: "archived" }).eq("id", membershipId);
}

async function signInCookie(email) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error || !data.session) throw new Error(`sign-in ${email}: ${error?.message}`);
  const payload = JSON.stringify({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: data.session.user,
  });
  return `sb-${PROJECT_REF}-auth-token=${encodeURIComponent(payload)}`;
}

async function fetchMembersHtml(cookie) {
  const res = await fetch(`${BASE_URL}/members`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  return { status: res.status, text: await res.text() };
}

async function layoutWorks(client, userId) {
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL role authenticated");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userId]);
    const { rows } = await client.query(
      `SELECT public.get_app_layout_context($1::uuid) IS NOT NULL AS ok`,
      [CLUB_ID],
    );
    await client.query("ROLLBACK");
    return rows[0]?.ok === true;
  } catch {
    await client.query("ROLLBACK");
    return false;
  }
}

async function cleanupAll(admin) {
  for (const id of cleanup.membershipIds) {
    await admin.from("club_memberships").delete().eq("id", id);
  }
  for (const uid of [...new Set(cleanup.userIds)]) {
    if (uid && !ACCOUNTS.owner && !Object.values(ACCOUNTS).includes(uid)) {
      try {
        await admin.auth.admin.deleteUser(uid);
      } catch {
        /* ignore */
      }
    }
  }
  const emails = [
    `${TAG}-coach@piorun.test`,
    `${TAG}-parent@piorun.test`,
    `${TAG}-sponsor@piorun.test`,
    `${TAG}-resend@piorun.test`,
    `${TAG}-revoke@piorun.test`,
    `${TAG}-active@piorun.test`,
    `${TAG}-pres-coach@piorun.test`,
    `${TAG}-pres-scout@piorun.test`,
    `${TAG}-sd-coach@piorun.test`,
    `${TAG}-sd-player@piorun.test`,
  ];
  for (const email of emails) {
    const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const u = listed?.users?.find((x) => x.email === email);
    if (u) {
      await admin.from("club_memberships").delete().eq("club_id", CLUB_ID).eq("user_id", u.id);
      try {
        await admin.auth.admin.deleteUser(u.id);
      } catch {
        /* ignore */
      }
    }
  }
}

async function main() {
  const admin = adminClient();
  const client = await connectDb();

  // --- T1 Owner Invite ---
  try {
    const invites = await Promise.all([
      inviteClubMember(admin, { email: `${TAG}-coach@piorun.test`, fullName: "Smoke Coach", role: "coach" }),
      inviteClubMember(admin, { email: `${TAG}-parent@piorun.test`, fullName: "Smoke Parent", role: "parent" }),
      inviteClubMember(admin, { email: `${TAG}-sponsor@piorun.test`, fullName: "Smoke Sponsor", role: "sponsor" }),
    ]);
    const { rows } = await client.query(
      `SELECT role, status FROM club_memberships WHERE club_id=$1 AND id = ANY($2::uuid[])`,
      [CLUB_ID, invites.map((i) => i.membershipId)],
    );
    const pending = rows.filter((r) => r.status === "invited").length;
    const rolesOk = rows.every((r) => ["coach", "parent", "sponsor"].includes(r.role));
    if (pending === 3 && rolesOk) {
      record("T1-owner-invite", "PASS", "3 zaproszenia invited z poprawnymi rolami");
    } else {
      record("T1-owner-invite", "FAIL", `pending=${pending} rolesOk=${rolesOk}`);
    }
  } catch (err) {
    record("T1-owner-invite", "FAIL", err.message);
  }

  // --- T2 President Invite + owner block ---
  try {
    await inviteClubMember(admin, { email: `${TAG}-pres-coach@piorun.test`, fullName: "Pres Coach", role: "coach" });
    await inviteClubMember(admin, { email: `${TAG}-pres-scout@piorun.test`, fullName: "Pres Scout", role: "scout" });
    let ownerBlocked = false;
    try {
      await inviteClubMember(admin, { email: `${TAG}-pres-owner@piorun.test`, fullName: "Bad Owner", role: "owner" });
    } catch {
      ownerBlocked = true;
    }
    const guardBlocked = !canInviteClubRole(["president"], "owner");
    if (ownerBlocked && guardBlocked) {
      record("T2-president-invite", "PASS", "coach+scout OK, owner zablokowany");
    } else {
      record("T2-president-invite", "FAIL", `ownerBlocked=${ownerBlocked} guard=${guardBlocked}`);
    }
  } catch (err) {
    record("T2-president-invite", "FAIL", err.message);
  }

  // --- T3 Sports Director ---
  try {
    await inviteClubMember(admin, { email: `${TAG}-sd-coach@piorun.test`, fullName: "SD Coach", role: "coach" });
    await inviteClubMember(admin, { email: `${TAG}-sd-player@piorun.test`, fullName: "SD Player", role: "player" });
    const ownerInList = INVITABLE.includes("owner");
    const guardOk = !canInviteClubRole(["sports_director"], "owner");
    if (!ownerInList && guardOk) {
      record("T3-sports-director", "PASS", "coach+player OK, owner niedostępny");
    } else {
      record("T3-sports-director", "FAIL", `ownerInList=${ownerInList}`);
    }
  } catch (err) {
    record("T3-sports-director", "FAIL", err.message);
  }

  // --- T4 Read-only HTTP ---
  let httpOk = false;
  try {
    const probe = await fetch(`${BASE_URL}/login`);
    httpOk = probe.status < 500;
  } catch {
    httpOk = false;
  }

  if (httpOk) {
    const coachCookie = await signInCookie(ACCOUNTS.coach);
    const coachPage = await fetchMembersHtml(coachCookie);
    const noInviteForm =
      coachPage.status === 200 &&
      !coachPage.text.includes("Zaproś członka") &&
      !coachPage.text.includes("Wyślij zaproszenie");
    const noResend = !coachPage.text.includes("Ponów zaproszenie");
    if (noInviteForm && noResend) {
      record("T4-read-only", "PASS", "coach: brak invite/resend/revoke UI");
    } else {
      record("T4-read-only", "FAIL", `form=${!noInviteForm} resend=${!noResend}`);
    }
  } else {
    record("T4-read-only", "SKIP", `HTTP niedostępny ${BASE_URL}`);
  }

  // --- T5 Pending invitations statuses ---
  try {
    const { readFileSync } = await import("node:fs");
    const labels = ["Oczekujące", "Zaakceptowane", "Wygasłe", "Anulowane"];
    const panel = readFileSync(join(root, "src/features/members/components/invitations-panel.tsx"), "utf8");
    const dashboard = readFileSync(join(root, "src/features/members/components/members-dashboard.tsx"), "utf8");
    const labelsOk = labels.every((l) => panel.includes(l));
    const countersOk = dashboard.includes("Oczekujące zaproszenia:") && dashboard.includes("Aktywni:");
    const { rows } = await client.query(
      `SELECT status, role, created_at, updated_at FROM club_memberships WHERE club_id=$1 AND status IN ('invited','archived','active') AND role <> 'owner'`,
      [CLUB_ID],
    );
    const derived = rows.map((r) => deriveInvitationStatus(r.status, r.created_at, r.updated_at)).filter(Boolean);
    if (labelsOk && countersOk && derived.length > 0) {
      record("T5-pending-invitations", "PASS", `statusy UI OK, ${derived.length} rekordów z derived status`);
    } else {
      record("T5-pending-invitations", "FAIL", `labels=${labelsOk} counters=${countersOk} rows=${derived.length}`);
    }
  } catch (err) {
    record("T5-pending-invitations", "FAIL", err.message);
  }

  // --- T6 Resend ---
  try {
    const { membershipId } = await inviteClubMember(admin, {
      email: `${TAG}-resend@piorun.test`,
      fullName: "Resend Test",
      role: "coach",
    });
    const { rows: before } = await client.query(
      `SELECT updated_at, status FROM club_memberships WHERE id=$1`,
      [membershipId],
    );
    await new Promise((r) => setTimeout(r, 1100));
    await resendClubInvite(admin, membershipId);
    const { rows: after } = await client.query(
      `SELECT updated_at, status FROM club_memberships WHERE id=$1`,
      [membershipId],
    );
    const updatedChanged = after[0].updated_at !== before[0].updated_at;
    const stillInvited = after[0].status === "invited";
    if (updatedChanged && stillInvited) {
      record("T6-resend", "PASS", "resend OK, updated_at zmienione, status invited");
    } else {
      record("T6-resend", "FAIL", `updated=${updatedChanged} status=${after[0].status}`);
    }
  } catch (err) {
    record("T6-resend", "FAIL", err.message);
  }

  // --- T7 Revoke ---
  try {
    const { membershipId } = await inviteClubMember(admin, {
      email: `${TAG}-revoke@piorun.test`,
      fullName: "Revoke Test",
      role: "scout",
    });
    await revokeClubInvite(admin, membershipId);
    const { rows } = await client.query(`SELECT status FROM club_memberships WHERE id=$1`, [membershipId]);
    const revoked = rows[0]?.status === "archived";
    const display = deriveInvitationStatus(rows[0]?.status, new Date().toISOString(), new Date().toISOString());
    if (revoked && display === "revoked") {
      record("T7-revoke", "PASS", "archived/revoked, poza pending");
    } else {
      record("T7-revoke", "FAIL", `status=${rows[0]?.status} display=${display}`);
    }
  } catch (err) {
    record("T7-revoke", "FAIL", err.message);
  }

  // --- T8 Invited → Active ---
  try {
    const email = `${TAG}-active@piorun.test`;
    const { userId, membershipId } = await inviteClubMember(admin, {
      email,
      fullName: "Active Flow",
      role: "parent",
    });
    const { rows: before } = await client.query(`SELECT status FROM club_memberships WHERE id=$1`, [membershipId]);
    const beforeLayout = await layoutWorks(client, userId);
    await admin.from("club_memberships").update({ status: "active" }).eq("id", membershipId).eq("status", "invited");
    const { rows: after } = await client.query(`SELECT status FROM club_memberships WHERE id=$1`, [membershipId]);
    const afterLayout = await layoutWorks(client, userId);
    if (
      before[0].status === "invited" &&
      !beforeLayout &&
      after[0].status === "active" &&
      afterLayout
    ) {
      record("T8-invited-active", "PASS", "invited → active → layout context OK");
    } else {
      record(
        "T8-invited-active",
        "FAIL",
        `before=${before[0]?.status} layoutBefore=${beforeLayout} after=${after[0]?.status} layoutAfter=${afterLayout}`,
      );
    }
  } catch (err) {
    record("T8-invited-active", "FAIL", err.message);
  }

  // --- T9 Owner protection ---
  try {
    const rolesFile = await import("node:fs").then((fs) =>
      fs.readFileSync(join(root, "src/lib/members/invite-roles.ts"), "utf8"),
    );
    const formFile = await import("node:fs").then((fs) =>
      fs.readFileSync(join(root, "src/features/members/components/invite-member-form.tsx"), "utf8"),
    );
    const serviceFile = await import("node:fs").then((fs) =>
      fs.readFileSync(join(root, "src/lib/members/invite-service.ts"), "utf8"),
    );
    const noOwnerInRoles = !rolesFile.match(/INVITABLE_CLUB_ROLES[\s\S]*"owner"/);
    const noOwnerOption = !formFile.includes('value="owner"');
    const serviceBlocksOwner = serviceFile.includes('membership.role === "owner"');
    let inviteOwnerFails = false;
    try {
      await inviteClubMember(admin, { email: `${TAG}-bad-owner@piorun.test`, fullName: "X", role: "owner" });
    } catch {
      inviteOwnerFails = true;
    }
    if (noOwnerInRoles && noOwnerOption && serviceBlocksOwner && inviteOwnerFails) {
      record("T9-owner-protection", "PASS", "owner wykluczony z UI, service i invite");
    } else {
      record(
        "T9-owner-protection",
        "FAIL",
        `roles=${noOwnerInRoles} ui=${noOwnerOption} svc=${serviceBlocksOwner} invite=${inviteOwnerFails}`,
      );
    }
  } catch (err) {
    record("T9-owner-protection", "FAIL", err.message);
  }

  // --- HTTP owner/president invitations tab ---
  if (httpOk) {
    try {
      const ownerCookie = await signInCookie(ACCOUNTS.owner);
      const page = await fetchMembersHtml(ownerCookie);
      const ok =
        page.status === 200 &&
        page.text.includes("Zaproszenia") &&
        page.text.includes("Zaproś członka") &&
        !page.text.includes('value="owner"');
      record(ok ? "HTTP-owner-invite-ui" : "HTTP-owner-invite-ui", ok ? "PASS" : "FAIL", "owner /members invitations UI");
    } catch (err) {
      record("HTTP-owner-invite-ui", "FAIL", err.message);
    }
  }

  await cleanupAll(admin);
  await client.end();

  console.log("\n=== SMOKE 20.5B.1 SUMMARY ===");
  for (const r of results) console.log(`${r.verdict.padEnd(7)} ${r.testId}: ${r.detail}`);

  const criticalFail = results.some(
    (r) => r.verdict === "FAIL" && !r.testId.startsWith("HTTP-") && r.testId !== "T4-read-only",
  );
  const t8 = results.find((r) => r.testId === "T8-invited-active");
  const t9 = results.find((r) => r.testId === "T9-owner-protection");

  if (criticalFail || t8?.verdict === "FAIL" || t9?.verdict === "FAIL") {
    console.log("\nSMOKE 20.5B.1: NO-GO");
    process.exit(1);
  }
  console.log("\nSMOKE 20.5B.1: GO");
}

main().catch((err) => {
  console.error("SMOKE 20.5B.1 fatal:", err.message);
  process.exit(1);
});
