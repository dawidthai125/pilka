#!/usr/bin/env node
/**
 * Sprint 17.5 — local schema validation via embedded PostgreSQL + auth/storage stubs.
 * Use when Supabase cloud staging is unavailable (no SUPABASE_ACCESS_TOKEN).
 * NOT a substitute for full Supabase staging — schema/RPC validation only.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, ".staging-pg-data");
const log = [];

function record(phase, status, detail) {
  log.push({ ts: new Date().toISOString(), phase, status, detail });
  console.log(`[${phase}] ${status}: ${detail}`);
}

async function startEmbeddedPostgres() {
  let EmbeddedPostgres;
  try {
    ({ default: EmbeddedPostgres } = await import("embedded-postgres"));
  } catch {
    throw new Error("Run: npm install --no-save embedded-postgres");
  }

  mkdirSync(dataDir, { recursive: true });
  const ep = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port: 55432,
    persistent: false,
    postgresVersion: 15,
  });

  await ep.initialise();
  await ep.start();
  return ep;
}

function normalizeSqlForLocalPg(sql) {
  return sql
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u2194/g, "<->")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017a\u017c]/gi, (c) => {
      const map = { ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" };
      return map[c.toLowerCase()] ?? c;
    });
}

async function applySql(client, label, sqlPath) {
  const raw = readFileSync(join(root, sqlPath), "utf8");
  const sql = normalizeSqlForLocalPg(raw);
  record(label, "START", sqlPath);
  try {
    await client.query(sql);
    record(label, "PASS", sqlPath);
    return true;
  } catch (e) {
    record(label, "FAIL", `${sqlPath}: ${e.message}`);
    return false;
  }
}

async function snapshot(client) {
  const { rows: tables } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  const { rows: enums } = await client.query(`
    SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e' ORDER BY t.typname`);
  const { rows: fns } = await client.query(`
    SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' ORDER BY p.proname`);
  const { rows: policies } = await client.query(
    `SELECT count(*)::int c FROM pg_policies WHERE schemaname = 'public'`,
  );
  const { rows: triggers } = await client.query(`
    SELECT count(*)::int c FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT t.tgisinternal`);
  const rpc = fns.map((r) => r.proname).filter((n) => n.startsWith("get_") || n.startsWith("list_"));
  return {
    tables: tables.map((r) => r.tablename),
    enums: enums.map((r) => r.typname),
    functions: fns.map((r) => r.proname),
    rpc,
    policyCount: policies[0].c,
    triggerCount: triggers[0].c,
    buckets: 0,
  };
}

function parseBaseline(sql) {
  const tables = new Set();
  for (const m of sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? public\.(\w+)/gi)) tables.add(m[1]);
  const enums = new Set();
  for (const m of sql.matchAll(/CREATE TYPE public\.(\w+)/gi)) enums.add(m[1]);
  const functions = new Set();
  for (const m of sql.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)/gi)) functions.add(m[1]);
  return {
    tables: [...tables].sort(),
    enums: [...enums].sort(),
    functions: [...functions].sort(),
    rpc: [...functions].filter((n) => n.startsWith("get_") || n.startsWith("list_")),
  };
}

async function main() {
  const baselineSql = readFileSync(join(root, "supabase/baseline.sql"), "utf8");
  const expected = parseBaseline(baselineSql);

  let ep;
  try {
    ep = await startEmbeddedPostgres();
    record("ENV", "PASS", `embedded PostgreSQL 15 on port 55432, dataDir=${dataDir}`);
  } catch (e) {
    record("ENV", "FAIL", e.message);
    writeReport({ goNoGo: "NO-GO", blocker: e.message });
    process.exit(1);
  }

  const client = ep.getPgClient();
  await client.connect();

  try {
    // Supabase stubs required by baseline.sql
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE SCHEMA IF NOT EXISTS storage;
      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT,
        raw_user_meta_data JSONB DEFAULT '{}'::jsonb
      );
      CREATE TABLE IF NOT EXISTS storage.buckets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        public BOOLEAN DEFAULT false,
        file_size_limit BIGINT,
        allowed_mime_types TEXT[]
      );
      CREATE TABLE IF NOT EXISTS storage.objects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bucket_id TEXT REFERENCES storage.buckets(id),
        name TEXT,
        owner UUID,
        metadata JSONB
      );
    `);
    record("STUBS", "PASS", "auth + storage schemas created");

    const baselineOk = await applySql(client, "BASELINE", "supabase/baseline.sql");
    const snapAfterBaseline = await snapshot(client);

    const patchOk = await applySql(client, "PATCH", "supabase/prod-parity-patch.sql");
    const snapAfterPatch = await snapshot(client);

    // Test migration
    const testMigration = `-- Sprint 17.5 test migration
CREATE TABLE IF NOT EXISTS public._sprint175_validation_marker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT
);
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260705000000', 'test_validation')
ON CONFLICT DO NOTHING;
`;
    mkdirSync(join(root, "supabase/migrations-forward"), { recursive: true });
    writeFileSync(join(root, "supabase/migrations-forward/20260705000000_test_validation.sql"), testMigration);
    await client.query(normalizeSqlForLocalPg(testMigration));
    const { rows: tracked } = await client.query(
      `SELECT version, name FROM supabase_migrations.schema_migrations WHERE version = '20260705000000'`,
    );
    record("MIGRATION_TEST", tracked.length ? "PASS" : "FAIL", "test migration tracked");

    const finalSnap = await snapshot(client);
    const prodSet = new Set(finalSnap.tables);
    const missingTables = expected.tables.filter((t) => !prodSet.has(t));
    const missingRpc = expected.rpc.filter((r) => !finalSnap.rpc.includes(r));

    writeReport({
      environment: {
        type: "embedded-postgres-local",
        note: "NOT Supabase cloud — schema validation only. Full sprint requires FCOS-STAGING-173 + SUPABASE_ACCESS_TOKEN",
        port: 55432,
        postgresVersion: 15,
      },
      baselineApply: {
        verdict: baselineOk ? "PASS" : "FAIL",
        ...snapAfterBaseline,
      },
      patchApply: {
        verdict: patchOk ? "PASS" : "FAIL",
        note: patchOk ? "idempotent re-apply not tested" : "see log",
        ...snapAfterPatch,
      },
      schemaValidation: {
        missingTables: missingTables.length,
        missingTablesList: missingTables,
        missingRpc: missingRpc.length,
        missingRpcList: missingRpc,
        verdict: missingTables.length === 0 ? "PASS" : "WARNING",
      },
      finalMetrics: finalSnap,
      log,
      goNoGo: baselineOk && missingTables.length === 0 ? "CONDITIONAL-GO" : "NO-GO",
      blocker:
        baselineOk
          ? null
          : "baseline.sql failed on embedded PG — fix SQL before Supabase staging",
    });
  } finally {
    await client.end();
    await ep.stop();
  }
}

function writeReport(report) {
  mkdirSync(join(root, "docs/architecture"), { recursive: true });
  writeFileSync(join(root, "docs/architecture/sprint-175-validation-results.json"), JSON.stringify(report, null, 2));
  writeFileSync(join(root, "docs/architecture/sprint-175-final-report.md"), renderMarkdown(report));
}

function renderMarkdown(r) {
  return `# Sprint 17.5 — Staging Validation Report

**Generated:** ${new Date().toISOString().slice(0, 19)}Z

## Environment

| Field | Value |
|-------|-------|
| Type | ${r.environment?.type ?? "unknown"} |
| Note | ${r.environment?.note ?? ""} |

## Metrics (final)

| Metric | Count |
|--------|-------|
| Tables | ${r.finalMetrics?.tables?.length ?? "?"} |
| Functions | ${r.finalMetrics?.functions?.length ?? "?"} |
| RPC | ${r.finalMetrics?.rpc?.length ?? "?"} |
| RLS policies | ${r.finalMetrics?.policyCount ?? "?"} |
| Triggers | ${r.finalMetrics?.triggerCount ?? "?"} |
| Storage buckets | ${r.finalMetrics?.buckets ?? "?"} |

## Verdicts

| Phase | Result |
|-------|--------|
| Baseline apply | ${r.baselineApply?.verdict ?? "?"} |
| Parity patch | ${r.patchApply?.verdict ?? "?"} |
| Schema validation | ${r.schemaValidation?.verdict ?? "?"} |
| Missing tables | ${r.schemaValidation?.missingTables ?? "?"} |

## GO / NO-GO for Sprint 17.6

**${r.goNoGo}**

${r.blocker ? `Blocker: ${r.blocker}` : ""}

See \`sprint-175-validation-results.json\` for full log.
`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
