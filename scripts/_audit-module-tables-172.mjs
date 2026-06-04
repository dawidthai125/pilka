#!/usr/bin/env node
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const tables = ["finance_income","inventory_items","integrations","academy_groups","league_sources","website_settings","sponsors","content_posts","crm_contacts","injury_categories","videos","ai_tasks","push_subscriptions"];
const c = await connectDb();
for (const t of tables) {
  const r = await c.query("SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=$1) AS ok", [t]);
  console.log(t, r.rows[0].ok ? "YES" : "NO");
}
await c.end();
