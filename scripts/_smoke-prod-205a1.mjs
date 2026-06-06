#!/usr/bin/env node
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const BASE = "https://pilka-mu.vercel.app";
const PROJECT_REF = "pwkqnwqvrdiaycveacxa";
const PASS = process.env.SETUP_TEST_PASSWORD ?? "Piorun2026!";
const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

async function signInCookie(email) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: PASS });
  if (error || !data.session) throw new Error(`sign-in ${email}: ${error?.message}`);
  const payload = JSON.stringify({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: data.session.user,
  });
  return {
    cookie: `sb-${PROJECT_REF}-auth-token=${encodeURIComponent(payload)}`,
    userId: data.session.user.id,
  };
}

async function fetchMembers(cookie) {
  const res = await fetch(`${BASE}/members`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  return { status: res.status, location: res.headers.get("location"), text: await res.text() };
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

let failed = 0;
function pass(label, detail) {
  console.log(`[PASS] ${label} — ${detail}`);
}
function fail(label, detail) {
  console.log(`[FAIL] ${label} — ${detail}`);
  failed += 1;
}

const { cookie: ownerCookie } = await signInCookie("wlasciciel@piorun.test");
const ownerPage = await fetchMembers(ownerCookie);
if (ownerPage.status === 200 && ownerPage.text.includes("Członkowie klubu") && ownerPage.text.includes("Akcje")) {
  pass("prod-owner-members", "tabela + akcje");
} else {
  fail("prod-owner-members", `HTTP ${ownerPage.status}`);
}

const { cookie: presidentCookie } = await signInCookie("prezes@piorun.test");
const presidentPage = await fetchMembers(presidentCookie);
if (presidentPage.status === 200 && presidentPage.text.includes("Akcje członka")) {
  pass("prod-president-members", "menu akcji");
} else {
  fail("prod-president-members", `HTTP ${presidentPage.status}`);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const smokeEmail = "smoke-prod-205a1@piorun.test";
const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
let smokeUserId = listed?.users?.find((u) => u.email === smokeEmail)?.id;
if (!smokeUserId) {
  const { data, error } = await admin.auth.admin.createUser({
    email: smokeEmail,
    password: PASS,
    email_confirm: true,
    user_metadata: { full_name: "Prod Smoke 205A1" },
  });
  if (error) throw error;
  smokeUserId = data.user.id;
}
await admin.from("club_memberships").upsert(
  { club_id: CLUB_ID, user_id: smokeUserId, role: "scout", status: "invited" },
  { onConflict: "club_id,user_id,role" },
);

const client = await connectDb();
const beforeLayout = await layoutWorks(client, smokeUserId);
await admin
  .from("club_memberships")
  .update({ status: "active" })
  .eq("user_id", smokeUserId)
  .eq("status", "invited");
const afterLayout = await layoutWorks(client, smokeUserId);
await admin.from("club_memberships").delete().eq("club_id", CLUB_ID).eq("user_id", smokeUserId);
await client.end();

if (!beforeLayout) {
  pass("prod-invited-active", "invited bez layout context (oczekiwane)");
} else {
  fail("prod-invited-active", "invited nadal ma layout context");
}
if (afterLayout) {
  pass("prod-invited-active", "po aktywacji layout context OK");
} else {
  fail("prod-invited-active", "po aktywacji brak layout context");
}

if (failed > 0) {
  console.log(`\nprod smoke 205A.1: FAIL (${failed})`);
  process.exit(1);
}
console.log("\nprod smoke 205A.1: PASS");
