#!/usr/bin/env node
import dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const TEST_EMAIL = "wlasciciel@piorun.test";

async function timeQuery(client, label, sql, params = []) {
  const start = performance.now();
  await client.query(sql, params);
  const ms = Math.round(performance.now() - start);
  console.log(`${label}: ${ms} ms`);
  return ms;
}

const client = await connectDb();
try {
  const userRes = await client.query("SELECT id FROM auth.users WHERE email = $1", [TEST_EMAIL]);
  const userId = userRes.rows[0]?.id;
  if (!userId) throw new Error("User not found");

  await client.query("SET LOCAL role authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userId]);

  console.log("\nETAP 13.7 — RPC profile (direct pg)\n");
  await timeQuery(client, "get_app_layout_context", "SELECT public.get_app_layout_context($1)", [CLUB_ID]);
  await timeQuery(client, "get_home_dashboard_stats", "SELECT public.get_home_dashboard_stats($1)", [CLUB_ID]);
  await timeQuery(client, "get_sponsor_dashboard_stats", "SELECT public.get_sponsor_dashboard_stats($1)", [CLUB_ID]);
  await timeQuery(client, "get_finance_dashboard_page", "SELECT public.get_finance_dashboard_page($1)", [CLUB_ID]);
  await timeQuery(client, "get_ai_manager_snapshot", "SELECT public.get_ai_manager_snapshot($1)", [CLUB_ID]);
} finally {
  await client.end();
}
