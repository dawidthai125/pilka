#!/usr/bin/env node
/**
 * Sprint 17.5 — apply SQL files one-by-one with logging (staging or local PG).
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const staging = join(root, ".env.staging.local");
  dotenv.config({ path: staging, override: true });
  if (!process.env.SUPABASE_DB_PASSWORD) {
    dotenv.config({ path: join(root, ".env.local") });
  }
}

function normalizeSql(sql) {
  return sql
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u2194/g, "<->")
    .replace(/\u26a0\ufe0f/g, "")
    .replace(/[\u2013\u2014]/g, "-");
}

function stripClubData(sql) {
  const PIORUN = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const lines = sql.split("\n");
  const kept = [];
  let skip = false;
  for (const line of lines) {
    const t = line.trim();
    if (!skip && /^INSERT INTO public\./i.test(t) && !/^INSERT INTO storage\./i.test(t)) skip = true;
    if (!skip && /^UPDATE public\./i.test(t)) skip = true;
    if (!skip && /^DELETE FROM public\./i.test(t)) skip = true;
    if (!skip && t.includes(PIORUN)) skip = true;
    if (skip) {
      if (t.endsWith(";")) {
        kept.push("-- [stripped data block]");
        skip = false;
      }
      continue;
    }
    kept.push(line);
  }
  return kept.join("\n");
}

export async function createStagingClient(local) {
  if (local?.client) return local.client;
  const ref =
    process.env.STAGING_PROJECT_REF ??
    process.env.SUPABASE_PROJECT_REF ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
  const password = process.env.SUPABASE_DB_PASSWORD;
  const host = process.env.SUPABASE_DB_POOLER_HOST ?? "aws-0-eu-west-1.pooler.supabase.com";
  const client = new pg.Client({
    host: local?.host ?? host,
    port: Number(local?.port ?? process.env.SUPABASE_DB_POOLER_PORT ?? 5432),
    user: local?.user ?? `postgres.${ref}`,
    password: local?.password ?? password,
    database: "postgres",
    ssl: local?.ssl === false ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

export async function ensureSupabaseStubs(client) {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULL::uuid;
    $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
      SELECT 'authenticated'::text;
    $$;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT '{}'::jsonb;
    $$;
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT,
      raw_user_meta_data JSONB DEFAULT '{}'::jsonb
    );
    CREATE TABLE IF NOT EXISTS storage.buckets (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, public BOOLEAN DEFAULT false,
      file_size_limit BIGINT, allowed_mime_types TEXT[]
    );
    CREATE TABLE IF NOT EXISTS storage.objects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id TEXT REFERENCES storage.buckets(id),
      name TEXT, owner UUID, metadata JSONB
    );
    CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
      SELECT string_to_array(trim(BOTH '/' FROM name), '/');
    $$;
    CREATE SCHEMA IF NOT EXISTS supabase_migrations;
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version TEXT PRIMARY KEY, name TEXT
    );
    DO $$ BEGIN
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  `);
}

export async function applySqlFiles(client, files, log) {
  for (const file of files) {
    const path = file.includes("/") ? join(root, file) : join(root, "supabase/migrations", file);
    let sql = normalizeSql(readFileSync(path, "utf8"));
    if (file.includes("baseline") || file.includes("parity")) {
      /* monolithic files used as-is */
    } else if (file.endsWith(".sql")) {
      sql = stripClubData(sql);
    }

    const enumStatements = [...sql.matchAll(/ALTER TYPE public\.\w+ ADD VALUE IF NOT EXISTS '[^']+';/g)].map((m) => m[0]);
    try {
      for (const st of enumStatements) await client.query(st);
      await client.query(sql);
      log.push({ file, status: "PASS" });
      console.log(`PASS ${file}`);
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* */
      }
      log.push({ file, status: "FAIL", error: e.message });
      console.error(`FAIL ${file}: ${e.message.slice(0, 200)}`);
      return false;
    }
  }
  return true;
}

export async function snapshotSchema(client) {
  const { rows: tables } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`,
  );
  const { rows: enums } = await client.query(`
    SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typtype='e' ORDER BY t.typname`);
  const { rows: fns } = await client.query(`
    SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' ORDER BY proname`);
  const { rows: pol } = await client.query(`SELECT count(*)::int c FROM pg_policies WHERE schemaname='public'`);
  const { rows: trg } = await client.query(`
    SELECT count(*)::int c FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal`);
  const { rows: buckets } = await client.query(`SELECT id FROM storage.buckets ORDER BY id`).catch(() => ({ rows: [] }));
  const fnames = fns.map((r) => r.proname);
  return {
    tableCount: tables.length,
    tables: tables.map((r) => r.tablename),
    enumCount: enums.length,
    enums: enums.map((r) => r.typname),
    functionCount: fnames.length,
    functions: fnames,
    rpcCount: fnames.filter((n) => n.startsWith("get_") || n.startsWith("list_")).length,
    rpc: fnames.filter((n) => n.startsWith("get_") || n.startsWith("list_")),
    policyCount: pol[0].c,
    triggerCount: trg[0].c,
    bucketCount: buckets.length,
    buckets: buckets.map((r) => r.id),
  };
}

async function main() {
  loadEnv();
  if (!process.env.STAGING_PROJECT_REF) {
    console.error("Refusing to run: STAGING_PROJECT_REF not set in .env.staging.local");
    console.error("Use scripts/staging-run-validation-175.mjs for local embedded validation.");
    process.exit(1);
  }
  const classification = JSON.parse(
    readFileSync(join(root, "docs/archive/17x-infrastructure/sprint-173-migration-classification.json"), "utf8"),
  );
  const patchSources = [
    "20260601100000_finance_module.sql",
    "20260601102000_finance_audit_hardening.sql",
    "20260602100000_inventory_module.sql",
    "20260602102000_inventory_audit_hardening.sql",
    "20260602103000_inventory_audit_hardening.sql",
    "20260604100000_integrations_module.sql",
    "20260604102000_integrations_audit_hardening.sql",
    "20260605100000_academy_module.sql",
    "20260605102000_academy_audit_hardening.sql",
    "20260605103000_academy_audit_fixes.sql",
    "20260531183000_matches_audit_hardening.sql",
    "20260617123000_stage15a_audit_hardening.sql",
  ];

  const log = [];
  const client = await createStagingClient();
  await ensureSupabaseStubs(client);

  console.log("Applying baseline source migrations...");
  const baselineOk = await applySqlFiles(
    client,
    classification.baselineSources.map((f) => `supabase/migrations/${f}`),
    log,
  );
  const afterBaseline = await snapshotSchema(client);

  console.log("Applying prod-parity-patch sources...");
  const patchOk = await applySqlFiles(
    client,
    patchSources.map((f) => `supabase/migrations/${f}`),
    log,
  );
  const afterPatch = await snapshotSchema(client);

  mkdirSync(join(root, "supabase/migrations-forward"), { recursive: true });
  const testMigration = `-- Sprint 17.5 test migration
CREATE TABLE IF NOT EXISTS public._sprint175_validation_marker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260705000000', 'test_validation') ON CONFLICT DO NOTHING;`;
  writeFileSync(join(root, "supabase/migrations-forward/20260705000000_test_validation.sql"), testMigration);
  await client.query(testMigration);
  const { rows: tracked } = await client.query(
    `SELECT * FROM supabase_migrations.schema_migrations WHERE version='20260705000000'`,
  );

  const finalSnap = await snapshotSchema(client);
  await client.end();

  const report = {
    generatedAt: new Date().toISOString(),
    mode: process.env.STAGING_PROJECT_REF ? "supabase-cloud" : "production-db-WARNING",
    baselineApply: { ok: baselineOk, ...afterBaseline },
    patchApply: { ok: patchOk, ...afterPatch },
    final: finalSnap,
    migrationTest: tracked.length ? "PASS" : "FAIL",
    failedFiles: log.filter((l) => l.status === "FAIL"),
    log,
  };

  mkdirSync(join(root, "docs/architecture"), { recursive: true });
  writeFileSync(join(root, "docs/archive/17x-infrastructure/sprint-175-apply-log.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ baselineOk, patchOk, tables: finalSnap.tableCount, migrationTest: report.migrationTest }, null, 2));
}

if (process.argv[1]?.endsWith("staging-apply-migrations-175.mjs")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
