#!/usr/bin/env node
/**
 * Sprint 17.4 — production parity inventory (read-only prod query).
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const baselineSql = readFileSync(join(root, "supabase/baseline.sql"), "utf8");

function extractFromBaseline(sql) {
  const tables = new Set();
  for (const m of sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? public\.(\w+)/gi)) tables.add(m[1]);

  const enums = new Set();
  for (const m of sql.matchAll(/CREATE TYPE public\.(\w+) AS ENUM/gi)) enums.add(m[1]);

  const functions = new Set();
  for (const m of sql.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)/gi)) functions.add(m[1]);

  const rpc = [...functions].filter((n) => n.startsWith("get_") || n.startsWith("list_"));

  const policies = [];
  for (const m of sql.matchAll(/CREATE POLICY "?(\w+)"? ON public\.(\w+)/gi)) {
    policies.push({ name: m[1], table: m[2] });
  }

  const triggers = [];
  for (const m of sql.matchAll(/CREATE TRIGGER (\w+)[\s\S]*?ON public\.(\w+)/gi)) {
    triggers.push({ name: m[1], table: m[2] });
  }

  return {
    tables: [...tables].sort(),
    enums: [...enums].sort(),
    functions: [...functions].sort(),
    rpc: rpc.sort(),
    policies,
    triggerCount: triggers.length,
    triggers,
  };
}

function extractFromRepoMigrations() {
  const dir = join(root, "supabase/migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  let combined = "";
  for (const f of files) combined += readFileSync(join(dir, f), "utf8") + "\n";
  return extractFromBaseline(combined);
}

async function prodSnapshot(client) {
  const { rows: tables } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  const { rows: enums } = await client.query(`
    SELECT t.typname FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e' ORDER BY t.typname
  `);
  const { rows: fns } = await client.query(`
    SELECT p.proname FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' ORDER BY p.proname
  `);
  const { rows: policies } = await client.query(`
    SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `);
  const { rows: triggers } = await client.query(`
    SELECT tgname AS name, c.relname AS table_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT t.tgisinternal
    ORDER BY c.relname, tgname
  `);
  const { rows: buckets } = await client.query(`SELECT id FROM storage.buckets ORDER BY id`);
  return {
    tables: tables.map((r) => r.tablename),
    enums: enums.map((r) => r.typname),
    functions: fns.map((r) => r.proname),
    rpc: fns.map((r) => r.proname).filter((n) => n.startsWith("get_") || n.startsWith("list_")),
    policies,
    triggers,
    buckets: buckets.map((r) => r.id),
  };
}

function diff(baselineList, prodList) {
  const prodSet = new Set(prodList);
  return baselineList.filter((x) => !prodSet.has(x));
}

function diffPolicies(baselinePolicies, prodPolicies) {
  const prodSet = new Set(prodPolicies.map((p) => `${p.tablename}.${p.policyname}`));
  return baselinePolicies.filter((p) => !prodSet.has(`${p.table}.${p.name}`));
}

function diffTriggers(baselineTriggers, prodTriggers) {
  const prodSet = new Set(prodTriggers.map((t) => `${t.table_name}.${t.name}`));
  return baselineTriggers.filter((t) => !prodSet.has(`${t.table}.${t.name}`));
}

function moduleForTable(table) {
  if (table.startsWith("finance_")) return "Finance";
  if (table.startsWith("inventory_")) return "Inventory";
  if (
    table.startsWith("academy_") ||
    ["player_assessments", "player_development", "player_development_history", "player_goals", "player_team_transitions", "fitness_tests", "opponent_analysis", "scouting_clubs", "scouting_players", "scouting_reports"].includes(table)
  )
    return "Academy";
  if (
    table.startsWith("integration") ||
    table.startsWith("external_") ||
    table.startsWith("sync_") ||
    table === "integrations"
  )
    return "Integrations";
  return "Other";
}

async function main() {
  const baseline = extractFromBaseline(baselineSql);
  const repo = extractFromRepoMigrations();

  const client = await connectDb();
  let prod;
  try {
    prod = await prodSnapshot(client);
  } finally {
    await client.end();
  }

  const missingTables = diff(baseline.tables, prod.tables);
  const missingEnums = diff(baseline.enums, prod.enums);
  const missingFunctions = diff(baseline.functions, prod.functions);
  const missingRpc = diff(baseline.rpc, prod.rpc);
  const missingPolicies = diffPolicies(baseline.policies, prod.policies);
  const missingTriggers = diffTriggers(baseline.triggers, prod.triggers);
  const missingBuckets = diff(["club-assets", "club-videos"], prod.buckets);

  const repoBaselineTableDiff = diff(baseline.tables, repo.tables);

  const inventory = {
    generatedAt: new Date().toISOString(),
    counts: {
      baselineTables: baseline.tables.length,
      prodTables: prod.tables.length,
      repoTables: repo.tables.length,
      missingTables: missingTables.length,
      missingEnums: missingEnums.length,
      missingFunctions: missingFunctions.length,
      missingRpc: missingRpc.length,
      missingPolicies: missingPolicies.length,
      missingTriggers: missingTriggers.length,
      missingBuckets: missingBuckets.length,
      baselineFunctions: baseline.functions.length,
      prodFunctions: prod.functions.length,
      baselineRpc: baseline.rpc.length,
      prodRpc: prod.rpc.length,
      prodPolicies: prod.policies.length,
      baselinePolicyStatements: baseline.policies.length,
    },
    verdict: {
      tables: missingTables.length === 0 ? "PASS" : missingTables.length <= 5 ? "WARNING" : "FAIL",
      enums: missingEnums.length === 0 ? "PASS" : "WARNING",
      functions: missingFunctions.length === 0 ? "PASS" : missingFunctions.length <= 10 ? "WARNING" : "FAIL",
      rpc: missingRpc.length === 0 ? "PASS" : "WARNING",
      policies: missingPolicies.length === 0 ? "PASS" : "WARNING",
      triggers: missingTriggers.length === 0 ? "PASS" : "WARNING",
      buckets: missingBuckets.length === 0 ? "PASS" : "FAIL",
      repoVsBaseline: repoBaselineTableDiff.length === 0 ? "PASS" : "WARNING",
    },
    missing: {
      tables: missingTables,
      enums: missingEnums,
      functions: missingFunctions,
      rpc: missingRpc,
      policies: missingPolicies.slice(0, 500),
      triggers: missingTriggers.slice(0, 500),
      buckets: missingBuckets,
    },
    byModule: missingTables.reduce((acc, t) => {
      const m = moduleForTable(t);
      acc[m] = acc[m] ?? [];
      acc[m].push(t);
      return acc;
    }, {}),
    prodOnlyTables: diff(prod.tables, baseline.tables),
    repoBaselineTableDiff,
  };

  const out = join(root, "docs/architecture/sprint-174-parity-inventory.json");
  writeFileSync(out, JSON.stringify(inventory, null, 2));
  console.log(JSON.stringify({ counts: inventory.counts, verdict: inventory.verdict, byModule: inventory.byModule }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
