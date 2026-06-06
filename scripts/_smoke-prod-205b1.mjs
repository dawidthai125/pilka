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

let failed = 0;
function pass(l, d) { console.log(`[PASS] ${l} — ${d}`); }
function fail(l, d) { console.log(`[FAIL] ${l} — ${d}`); failed += 1; }

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

async function membersPage(c) {
  const res = await fetch(`${BASE}/members`, { headers: { Cookie: c }, redirect: "manual" });
  return { status: res.status, text: await res.text() };
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ownerC = await cookie("wlasciciel@piorun.test");
const ownerPage = await membersPage(ownerC);
if (
  ownerPage.status === 200 &&
  ownerPage.text.includes("Zaproszenia") &&
  ownerPage.text.includes("Zaproś członka") &&
  !ownerPage.text.includes('value="owner"')
) {
  pass("prod-owner-invite-ui", "zakładki + formularz bez owner");
} else {
  fail("prod-owner-invite-ui", `HTTP ${ownerPage.status}`);
}

const presC = await cookie("prezes@piorun.test");
const presPage = await membersPage(presC);
if (presPage.status === 200 && presPage.text.includes("Zaproś członka")) {
  pass("prod-president-invite-ui", "formularz widoczny");
} else {
  fail("prod-president-invite-ui", `HTTP ${presPage.status}`);
}

const coachC = await cookie("trener@piorun.test");
const coachPage = await membersPage(coachC);
if (
  coachPage.status === 200 &&
  !coachPage.text.includes("Zaproś członka") &&
  !coachPage.text.includes("Ponów zaproszenie")
) {
  pass("prod-coach-readonly", "brak invite/resend");
} else {
  fail("prod-coach-readonly", `HTTP ${coachPage.status}`);
}

const tag = `prod205b1-${Date.now()}`;
const email = `${tag}@piorun.test`;
const { data: u, error: uErr } = await admin.auth.admin.createUser({
  email,
  password: PASS,
  email_confirm: true,
  user_metadata: { full_name: "Prod Smoke 205B1" },
});
if (uErr) fail("prod-invite-db", uErr.message);
else {
  const uid = u.user.id;
  const { data: row } = await admin
    .from("club_memberships")
    .upsert({ club_id: CLUB_ID, user_id: uid, role: "coach", status: "invited" }, { onConflict: "club_id,user_id,role" })
    .select("id, status, updated_at")
    .single();

  if (row?.status === "invited") pass("prod-pending-invite", "membership invited");
  else fail("prod-pending-invite", "brak invited");

  const before = row.updated_at;
  await new Promise((r) => setTimeout(r, 1100));
  await admin.from("club_memberships").update({ updated_at: new Date().toISOString() }).eq("id", row.id);
  const { data: after } = await admin.from("club_memberships").select("status, updated_at").eq("id", row.id).single();
  if (after?.status === "invited" && after.updated_at !== before) pass("prod-resend-proxy", "updated_at bump OK");
  else fail("prod-resend-proxy", "resend proxy fail");

  await admin.from("club_memberships").update({ status: "archived" }).eq("id", row.id);
  const { data: revoked } = await admin.from("club_memberships").select("status").eq("id", row.id).single();
  if (revoked?.status === "archived") pass("prod-revoke", "archived");
  else fail("prod-revoke", revoked?.status);

  await admin.from("club_memberships").update({ status: "active" }).eq("id", row.id);
  const client = await connectDb();
  await client.query("BEGIN");
  await client.query("SET LOCAL role authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [uid]);
  const { rows } = await client.query(
    `SELECT public.get_app_layout_context($1::uuid) IS NOT NULL AS ok`,
    [CLUB_ID],
  );
  await client.query("ROLLBACK");
  await client.end();
  if (rows[0]?.ok) pass("prod-invited-active", "active + layout OK");
  else fail("prod-invited-active", "layout fail");

  await admin.from("club_memberships").delete().eq("id", row.id);
  await admin.auth.admin.deleteUser(uid);
}

if (failed > 0) {
  console.log(`\nprod smoke 205B.1: FAIL (${failed})`);
  process.exit(1);
}
console.log("\nprod smoke 205B.1: PASS");
