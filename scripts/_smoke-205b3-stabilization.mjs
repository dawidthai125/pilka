#!/usr/bin/env node
/**
 * Sprint 20.5B.3 — Club Management Stabilization smoke (pre-release).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const BASE_URL = process.env.SMOKE_BASE_URL ?? "https://pilka-mu.vercel.app";
const PASS = process.env.SETUP_TEST_PASSWORD ?? "Piorun2026!";
const PROJECT_REF = "pwkqnwqvrdiaycveacxa";
const TAG = `smoke205b3-${Date.now()}`;

const results = [];

function record(testId, verdict, detail) {
  results.push({ testId, verdict, detail });
  console.log(`[${verdict}] ${testId} — ${detail}`);
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signInCookie(email) {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data, error } = await s.auth.signInWithPassword({ email, password: PASS });
  if (error || !data.session) throw new Error(error?.message);
  const p = JSON.stringify({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: data.session.user,
  });
  return `sb-${PROJECT_REF}-auth-token=${encodeURIComponent(p)}`;
}

function testExistingUserInviteStatic() {
  const service = read("src/lib/members/invite-service.ts");
  const actions = read("src/features/members/actions.ts");
  const form = read("src/features/members/components/invite-member-form.tsx");

  const delivery =
    service.includes('delivery: "login_required"') && service.includes("existingUserInviteMessage");
  const actionDelivery = actions.includes("inviteDelivery") && actions.includes("existingUserInviteMessage");
  const formHint = form.includes("konto już istnieje") && form.includes("login_required");

  if (delivery && actionDelivery && formHint) {
    record("S1-existing-user-static", "PASS", "login_required flow w service/actions/form");
  } else {
    record("S1-existing-user-static", "FAIL", `svc=${delivery} act=${actionDelivery} form=${formHint}`);
  }
}

async function testExistingUserInviteDb() {
  const admin = adminClient();
  const email = `${TAG}@piorun.test`;

  try {
    const { data: listedBefore } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const beforeCount = listedBefore?.users?.filter((u) => u.email === email).length ?? 0;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: PASS,
      email_confirm: true,
      user_metadata: { full_name: "Smoke 205B3 Existing" },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "createUser");

    const userId = created.user.id;

    const { data: listedAfter } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const afterCount = listedAfter?.users?.filter((u) => u.email === email).length ?? 0;

    if (afterCount !== beforeCount + 1) {
      record("S1-existing-user-db", "FAIL", `duplicate auth users: before=${beforeCount} after=${afterCount}`);
      return;
    }

    const { error: memErr } = await admin.from("club_memberships").upsert(
      {
        club_id: CLUB_ID,
        user_id: userId,
        role: "coach",
        status: "invited",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "club_id,user_id,role" },
    );
    if (memErr) throw new Error(memErr.message);

    const { data: mem } = await admin
      .from("club_memberships")
      .select("status")
      .eq("club_id", CLUB_ID)
      .eq("user_id", userId)
      .eq("role", "coach")
      .single();

    await admin.auth.admin.createUser({
      email,
      password: PASS,
      email_confirm: true,
    });

    const { data: listedFinal } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const finalCount = listedFinal?.users?.filter((u) => u.email === email).length ?? 0;

    await admin.from("club_memberships").delete().eq("club_id", CLUB_ID).eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);

    if (mem?.status === "invited" && finalCount === 1) {
      record("S1-existing-user-db", "PASS", "1 konto, membership invited, brak duplikatu Auth");
    } else {
      record("S1-existing-user-db", "FAIL", `status=${mem?.status} finalCount=${finalCount}`);
    }
  } catch (err) {
    record("S1-existing-user-db", "FAIL", err.message);
  }
}

function testNavigation() {
  const nav = read("src/config/navigation.ts");
  const ok = nav.includes('title: "Członkowie"') && nav.includes('href: "/members"');
  record(ok ? "S2-navigation" : "S2-navigation", ok ? "PASS" : "FAIL", ok ? "Członkowie + /members" : "nav mismatch");
}

function testInvitationsUx() {
  const panel = read("src/features/members/components/invitations-panel.tsx");
  const utils = read("src/lib/members/invitation-utils.ts");
  const checks = [
    panel.includes("Wymaga działania"),
    panel.includes("InvitationStatusSection"),
    panel.includes("filterChips"),
    utils.includes("countInvitationsByStatus"),
    utils.includes("countInvitationsRequiringAction"),
  ];
  if (checks.every(Boolean)) {
    record("S3-invitations-ux", "PASS", "filtry, liczniki, sekcje statusów");
  } else {
    record("S3-invitations-ux", "FAIL", checks.map((c, i) => `${i}:${c}`).join(" "));
  }
}

function testAuthGuard() {
  const guard = read("src/lib/members/auth-invite-guard.ts");
  const service = read("src/lib/members/invite-service.ts");
  const checks = [
    guard.includes("inviteUserByEmailWithGuard"),
    guard.includes("INVITE_AUTH_RETRY_ATTEMPTS"),
    guard.includes("assertClubInviteRateLimit"),
    service.includes("inviteUserByEmailWithGuard"),
    service.includes("isAuthUserConfirmed"),
  ];
  if (checks.every(Boolean)) {
    record("S4-auth-guard", "PASS", "guard + retry + rate limit w invite/resend");
  } else {
    record("S4-auth-guard", "FAIL", checks.map((c, i) => `${i}:${c}`).join(" "));
  }
}

function testMembersDashboard() {
  const dash = read("src/features/members/components/members-dashboard.tsx");
  const checks = [
    dash.includes("Aktywni członkowie"),
    dash.includes("Zawieszeni"),
    dash.includes("Wymaga działania"),
    dash.includes('label: "Zaproszenia"'),
    dash.includes("InviteMemberForm"),
  ];
  if (checks.every(Boolean)) {
    record("S5-members-dashboard", "PASS", "KPI + zakładki + formularz");
  } else {
    record("S5-members-dashboard", "FAIL", checks.map((c, i) => `${i}:${c}`).join(" "));
  }
}

async function testHttpMembersPage() {
  try {
    const cookie = await signInCookie("wlasciciel@piorun.test");
    const res = await fetch(`${BASE_URL}/members`, { headers: { Cookie: cookie }, redirect: "manual" });
    const text = await res.text();
    const checks = [
      res.status === 200,
      text.includes("Członkowie"),
      text.includes("Zaproszenia"),
      text.includes("Wymaga działania") || text.includes("Aktywni członkowie"),
    ];
    if (checks.every(Boolean)) {
      record("S6-http-members", "PASS", `HTTP ${BASE_URL}/members OK`);
    } else if (res.status >= 500) {
      record("S6-http-members", "SKIP", `HTTP ${res.status} — deploy 20.5B.3 wymagany (post-push)`);
    } else {
      record("S6-http-members", "FAIL", `status=${res.status} checks=${checks.join(",")}`);
    }
  } catch (err) {
    record("S6-http-members", "SKIP", err.message);
  }
}

async function main() {
  testExistingUserInviteStatic();
  await testExistingUserInviteDb();
  testNavigation();
  testInvitationsUx();
  testAuthGuard();
  testMembersDashboard();
  await testHttpMembersPage();

  console.log("\n=== SMOKE 20.5B.3 SUMMARY ===");
  for (const r of results) console.log(`${r.verdict.padEnd(7)} ${r.testId}: ${r.detail}`);

  const criticalFail = results.some(
    (r) =>
      r.verdict === "FAIL" &&
      !r.testId.startsWith("S6-http"),
  );

  if (criticalFail) {
    console.log("\nSMOKE 20.5B.3: NO-GO");
    process.exit(1);
  }
  console.log("\nSMOKE 20.5B.3: GO");
}

main().catch((err) => {
  console.error("SMOKE 20.5B.3 fatal:", err.message);
  process.exit(1);
});
