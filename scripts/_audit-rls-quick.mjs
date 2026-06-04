#!/usr/bin/env node
/**
 * RLS quick audit — read-only, no migrations.
 */
import dotenv from "dotenv";
import pg from "pg";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const ref = process.env.SUPABASE_PROJECT_REF;
const password = process.env.SUPABASE_DB_PASSWORD;
const host = process.env.SUPABASE_DB_POOLER_HOST ?? "aws-0-eu-west-1.pooler.supabase.com";
const port = Number(process.env.SUPABASE_DB_POOLER_PORT ?? 5432);

if (!ref || !password) {
  console.log(JSON.stringify({ status: "SKIP", reason: "Brak SUPABASE_PROJECT_REF / SUPABASE_DB_PASSWORD" }));
  process.exit(0);
}

const client = new pg.Client({
  host,
  port,
  user: `postgres.${ref}`,
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

const TENANT_TABLES = [
  "players", "teams", "matches", "trainings", "club_memberships",
  "website_settings", "website_news", "league_sources", "league_matches",
  "finance_income", "finance_expenses", "inventory_items", "player_injuries",
  "crm_contacts", "sponsor_contracts", "academy_groups", "club_notifications",
];

await client.connect();

const { rows: rlsStatus } = await client.query(`
  SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.relname
`);

const { rows: policies } = await client.query(`
  SELECT schemaname, tablename, policyname, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname
`);

const tablesWithRls = rlsStatus.filter((r) => r.rls_enabled);
const tablesWithoutRls = rlsStatus.filter((r) => !r.rls_enabled);

const tenantAudit = TENANT_TABLES.map((table) => {
  const rls = rlsStatus.find((r) => r.table_name === table);
  const tablePolicies = policies.filter((p) => p.tablename === table);
  const usesClubId =
    tablePolicies.some((p) => /club_id/i.test(String(p.qual ?? ""))) ||
    tablePolicies.some((p) => /club_id/i.test(String(p.with_check ?? "")));

  let status = "PASS";
  if (!rls?.rls_enabled) status = "FAIL";
  else if (!usesClubId && tablePolicies.length > 0) status = "WARNING";
  else if (tablePolicies.length === 0) status = "WARNING";

  return { table, rlsEnabled: Boolean(rls?.rls_enabled), policyCount: tablePolicies.length, usesClubId, status };
});

await client.end();

console.log(
  JSON.stringify(
    {
      summary: {
        totalPublicTables: rlsStatus.length,
        withRls: tablesWithRls.length,
        withoutRls: tablesWithoutRls.length,
        totalPolicies: policies.length,
      },
      tenantAudit,
      tablesWithoutRls: tablesWithoutRls.map((r) => r.table_name).slice(0, 30),
    },
    null,
    2,
  ),
);
