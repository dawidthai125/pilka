#!/usr/bin/env node
/**
 * Sprint 17.7 — Production Parity Execution.
 * Enum ALTER TYPE runs autocommit first (PG cannot use new enum values in same txn).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(root, "docs/architecture");
dotenv.config({ path: join(root, ".env.local") });

function normalizeSql(sql) {
  return sql
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u2194/g, "<->")
    .replace(/\u26a0\ufe0f/g, "")
    .replace(/[\u2013\u2014]/g, "-");
}

async function inventorySnapshot(client) {
  const one = async (sql) => (await client.query(sql)).rows[0].c;
  return {
    tables: await one(`SELECT count(*)::int AS c FROM pg_tables WHERE schemaname='public'`),
    enums: await one(`
      SELECT count(*)::int AS c FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
      WHERE n.nspname='public' AND t.typtype='e'`),
    functions: await one(`
      SELECT count(*)::int AS c FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'`),
    rpc: await one(`
      SELECT count(*)::int AS c FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND (p.proname LIKE 'get_%' OR p.proname LIKE 'list_%')`),
    policies: await one(`SELECT count(*)::int AS c FROM pg_policies WHERE schemaname='public'`),
    triggers: await one(`
      SELECT count(*)::int AS c FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal`),
    buckets: await one(`SELECT count(*)::int AS c FROM storage.buckets`),
  };
}

async function applyPatch(client, patchSql) {
  const enumStatements = [
    ...patchSql.matchAll(/ALTER TYPE public\.\w+ ADD VALUE IF NOT EXISTS '[^']+';/g),
  ].map((m) => m[0]);

  console.log(`Phase 2a: ${enumStatements.length} enum ALTER TYPE (autocommit)`);
  for (const st of enumStatements) {
    await client.query(st);
  }

  let body = patchSql
    .replace(/^BEGIN;\s*/m, "")
    .replace(/\s*COMMIT;\s*[\s\S]*$/m, "");
  for (const st of enumStatements) {
    body = body.replace(st, `-- [applied pre-commit] ${st}`);
  }

  console.log("Phase 2b: main patch body");
  await client.query(body);
}

async function main() {
  mkdirSync(docsDir, { recursive: true });
  const t0Iso = new Date().toISOString();
  const report = { sprint: "17.7", t0: t0Iso, preflight: {}, phases: {} };

  if (process.env.FCOS_PROD_PARITY_PREFLIGHT !== "1") {
    const msg = "FAZA 0 FAIL: set FCOS_PROD_PARITY_PREFLIGHT=1 after dashboard checklist";
    report.phases.f0 = { verdict: "FAIL", msg };
    writeFileSync(join(docsDir, "sprint-177-execution-report.json"), JSON.stringify(report, null, 2));
    console.error(msg);
    process.exit(2);
  }

  report.preflight = {
    pitrEnabled: "OPERATOR_CONFIRMED",
    retentionVerified: "OPERATOR_CONFIRMED",
    adminAccess: "PASS",
    rollbackOwner: "OPERATOR_CONFIRMED",
    maintenanceWindow: "OPERATOR_CONFIRMED",
    cronDisabled: "OPERATOR_CONFIRMED",
    t0Timestamp: t0Iso,
  };

  const client = await connectDb();

  try {
    const t0 = await inventorySnapshot(client);
    report.phases.f1 = { verdict: "PASS", counts: t0, timestamp: t0Iso };
    writeFileSync(join(docsDir, "sprint-177-t0-inventory.json"), JSON.stringify({ generatedAt: t0Iso, counts: t0 }, null, 2));

    if (t0.tables !== 104) {
      throw new Error(`FAZA 1 FAIL: expected 104 tables, got ${t0.tables}`);
    }

    const patchSql = normalizeSql(readFileSync(join(root, "supabase/prod-parity-patch.sql"), "utf8"));
    const patchStart = new Date().toISOString();
    try {
      await applyPatch(client, patchSql);
      report.phases.f2 = { verdict: "PASS", start: patchStart, end: new Date().toISOString() };
    } catch (e) {
      report.phases.f2 = { verdict: "FAIL", start: patchStart, end: new Date().toISOString(), error: e.message };
      throw e;
    }

    const post = await inventorySnapshot(client);
    const { rows: financeTables } = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'finance_%' ORDER BY 1`);
    const missingRpc = [];
    for (const rpc of ["get_finance_dashboard_totals", "get_inventory_dashboard_stats", "get_inventory_report_summary"]) {
      const { rows } = await client.query(
        `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=$1`,
        [rpc],
      );
      if (rows.length === 0) missingRpc.push(rpc);
    }

    const schemaOk = post.tables === 148 && financeTables.length === 9 && missingRpc.length === 0;
    report.phases.f3 = {
      verdict: schemaOk ? "PASS" : "FAIL",
      counts: post,
      financeTableCount: financeTables.length,
      missingRpc,
      delta: {
        tables: post.tables - t0.tables,
        functions: post.functions - t0.functions,
        rpc: post.rpc - t0.rpc,
        enums: post.enums - t0.enums,
        policies: post.policies - t0.policies,
        triggers: post.triggers - t0.triggers,
      },
    };
    if (!schemaOk) throw new Error("FAZA 3 FAIL: schema validation");

    await client.query(`
      INSERT INTO supabase_migrations.schema_migrations (version, name)
      VALUES
        ('20260704000000', 'fc_os_baseline_173'),
        ('20260704100000', 'fc_os_prod_parity_patch_174'),
        ('20260531120000', 'legacy_applied_manual_pre_baseline')
      ON CONFLICT (version) DO NOTHING;
    `);
    const { rows: migrations } = await client.query(
      `SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version`,
    );
    report.phases.f6 = { verdict: "PASS", migrations };

    writeFileSync(
      join(docsDir, "sprint-177-post-inventory.json"),
      JSON.stringify({ generatedAt: new Date().toISOString(), counts: post, t0, delta: report.phases.f3.delta }, null, 2),
    );
    report.phases.f8 = { verdict: "PASS", counts: post };

    report.success = true;
    report.rollbackRequired = false;
    console.log(JSON.stringify({ success: true, post, delta: report.phases.f3.delta }, null, 2));
  } catch (e) {
    report.success = false;
    report.rollbackRequired = report.phases.f2?.verdict === "PASS";
    report.error = e.message;
    console.error("EXECUTION FAILED:", e.message);
    process.exitCode = 1;
  } finally {
    writeFileSync(join(docsDir, "sprint-177-execution-report.json"), JSON.stringify(report, null, 2));
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
