#!/usr/bin/env node
/**
 * Sprint 17.3 — static baseline analysis + read-only prod diff.
 * Does NOT apply baseline.sql to any database.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const baselineSql = readFileSync(join(root, "supabase/baseline.sql"), "utf8");
const classification = JSON.parse(
  readFileSync(join(root, "docs/architecture/sprint-173-migration-classification.json"), "utf8"),
);

function countPattern(sql, re) {
  return (sql.match(re) ?? []).length;
}

function extractTables(sql) {
  const tables = new Set();
  for (const m of sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? public\.(\w+)/gi)) {
    tables.add(m[1]);
  }
  return [...tables].sort();
}

function extractFunctions(sql) {
  const fns = new Set();
  for (const m of sql.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)/gi)) {
    fns.add(m[1]);
  }
  return [...fns].sort();
}

function extractRpc(sql) {
  return extractFunctions(sql).filter((n) => n.startsWith("get_") || n.startsWith("list_"));
}

async function prodSnapshot() {
  const client = await connectDb();
  try {
    const { rows: tables } = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    const { rows: enums } = await client.query(`
      SELECT t.typname FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype = 'e'
      ORDER BY t.typname
    `);
    const { rows: fns } = await client.query(`
      SELECT p.proname FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
      ORDER BY p.proname
    `);
    const { rows: policies } = await client.query(
      `SELECT count(*)::int AS c FROM pg_policies WHERE schemaname = 'public'`,
    );
    const { rows: buckets } = await client.query(
      `SELECT id FROM storage.buckets ORDER BY id`,
    );
    return {
      tables: tables.map((r) => r.tablename),
      enums: enums.map((r) => r.typname),
      functions: fns.map((r) => r.proname),
      policyCount: policies[0]?.c ?? 0,
      buckets: buckets.map((r) => r.id),
    };
  } finally {
    await client.end();
  }
}

async function main() {
  const baselineStats = {
    bytes: baselineSql.length,
    tables: extractTables(baselineSql),
    tableCount: extractTables(baselineSql).length,
    enumStatements: countPattern(baselineSql, /CREATE TYPE public\.\w+/gi),
    alterTypeEnum: countPattern(baselineSql, /ALTER TYPE public\.\w+ ADD VALUE/gi),
    indexes: countPattern(baselineSql, /CREATE (?:UNIQUE )?INDEX/gi),
    policies: countPattern(baselineSql, /CREATE POLICY/gi),
    dropPolicies: countPattern(baselineSql, /DROP POLICY/gi),
    functions: extractFunctions(baselineSql),
    functionCount: extractFunctions(baselineSql).length,
    rpc: extractRpc(baselineSql),
    rpcCount: extractRpc(baselineSql).length,
    triggers: countPattern(baselineSql, /CREATE TRIGGER/gi),
    storageBuckets: countPattern(baselineSql, /INSERT INTO storage\.buckets/gi),
    strippedBlocks: countPattern(baselineSql, /\[stripped:/gi),
    piorunRefs: countPattern(baselineSql, /a1b2c3d4-e5f6-7890-abcd-ef1234567890/gi),
  };

  let prod = null;
  let diff = null;
  try {
    prod = await prodSnapshot();
    const baselineSet = new Set(baselineStats.tables);
    const prodSet = new Set(prod.tables);
    diff = {
      baselineOnlyTables: baselineStats.tables.filter((t) => !prodSet.has(t)),
      prodOnlyTables: prod.tables.filter((t) => !baselineSet.has(t)),
      sharedTables: baselineStats.tables.filter((t) => prodSet.has(t)),
      baselineOnlyRpc: baselineStats.rpc.filter((r) => !prod.functions.includes(r)),
      prodMissingRpcOnBaseline: baselineStats.rpc.filter((r) => !prod.functions.includes(r)),
    };
  } catch (e) {
    prod = { error: e.message };
  }

  const report = {
    generatedAt: new Date().toISOString(),
    classification: {
      totalHistorical: classification.totalMigrations,
      baselineSources: classification.baselineSourceCount,
      archived: classification.excludedCount,
    },
    baselineStats,
    prod,
    diff,
    validationVerdict: {
      staticAnalysis: baselineStats.piorunRefs === 0 ? "PASS" : "FAIL",
      prodParity:
        diff && diff.baselineOnlyTables.length === 0
          ? "PASS"
          : diff && diff.baselineOnlyTables.length <= 50
            ? "WARNING"
            : "FAIL",
      note: "baseline.sql NOT executed — counts from static parse + read-only prod query",
    },
  };

  const outPath = join(root, "docs/architecture/sprint-173-baseline-validation.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
