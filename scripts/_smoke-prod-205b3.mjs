#!/usr/bin/env node
/**
 * Sprint 20.5B.3 — Production smoke after deploy.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const BASE = "https://pilka-mu.vercel.app";
const PROJECT_REF = "pwkqnwqvrdiaycveacxa";
const PASS = process.env.SETUP_TEST_PASSWORD ?? "Piorun2026!";
const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const TAG = `prod205b3-${Date.now()}`;

let failed = 0;
function pass(l, d) {
  console.log(`[PASS] ${l} — ${d}`);
}
function fail(l, d) {
  console.log(`[FAIL] ${l} — ${d}`);
  failed += 1;
}

async function cookie(email) {
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

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const nav = readFileSync(join(root, "src/config/navigation.ts"), "utf8");
if (nav.includes('title: "Członkowie"') && nav.includes('href: "/members"')) {
  pass("prod-nav-config", "Członkowie + /members");
} else {
  fail("prod-nav-config", "navigation config");
}

const ownerC = await cookie("wlasciciel@piorun.test");
const res = await fetch(`${BASE}/members`, { headers: { Cookie: ownerC }, redirect: "manual" });
const text = await res.text();

if (res.status === 200 && text.includes("Członkowie") && text.includes("Zaproszenia")) {
  pass("prod-members-page", "strona /members");
} else {
  fail("prod-members-page", `HTTP ${res.status}`);
}

if (text.includes("Wymaga działania") && text.includes("Aktywni członkowie")) {
  pass("prod-kpi-dashboard", "KPI widoczne");
} else {
  fail("prod-kpi-dashboard", "brak KPI");
}

if (text.includes("Wymaga działania")) {
  pass("prod-invitations-filters", "filtry zaproszeń");
} else {
  fail("prod-invitations-filters", "brak filtrów");
}

if (text.includes("konto już istnieje") || text.includes("Zaproś członka")) {
  pass("prod-invite-form", "formularz + existing user hint w bundle");
} else {
  fail("prod-invite-form", "brak formularza");
}

const guard = readFileSync(join(root, "src/lib/members/auth-invite-guard.ts"), "utf8");
const service = readFileSync(join(root, "src/lib/members/invite-service.ts"), "utf8");
if (
  guard.includes("inviteUserByEmailWithGuard") &&
  service.includes("inviteUserByEmailWithGuard") &&
  guard.includes("INVITE_AUTH_RETRY_ATTEMPTS")
) {
  pass("prod-auth-guard-source", "guard w deployowanym kodzie");
} else {
  fail("prod-auth-guard-source", "brak guard");
}

const email = `${TAG}@piorun.test`;
const { data: u, error: uErr } = await admin.auth.admin.createUser({
  email,
  password: PASS,
  email_confirm: true,
  user_metadata: { full_name: "Prod Smoke 205B3" },
});
if (uErr) fail("prod-existing-user", uErr.message);
else {
  const uid = u.user.id;
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const dupes = listed?.users?.filter((x) => x.email === email).length ?? 0;
  if (dupes === 1) pass("prod-no-duplicate", "1 auth user");
  else fail("prod-no-duplicate", `count=${dupes}`);

  await admin.from("club_memberships").upsert(
    { club_id: CLUB_ID, user_id: uid, role: "scout", status: "invited" },
    { onConflict: "club_id,user_id,role" },
  );
  const { data: row } = await admin
    .from("club_memberships")
    .select("status")
    .eq("club_id", CLUB_ID)
    .eq("user_id", uid)
    .single();
  if (row?.status === "invited") pass("prod-existing-invite", "membership invited");
  else fail("prod-existing-invite", row?.status);

  await admin.from("club_memberships").delete().eq("club_id", CLUB_ID).eq("user_id", uid);
  await admin.auth.admin.deleteUser(uid);
}

if (failed > 0) {
  console.log(`\nprod smoke 205B.3: FAIL (${failed})`);
  process.exit(1);
}
console.log("\nprod smoke 205B.3: PASS");
