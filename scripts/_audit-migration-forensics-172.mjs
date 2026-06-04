#!/usr/bin/env node
/** Sprint 17.2 — migration forensics (read-only) */
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const migrationsDir = join(root, "supabase/migrations");
const repoFiles = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
const repoVersions = repoFiles.map((f) => f.replace(/_.*$/, ""));

function categorize(file, sql) {
  const lower = sql.toLowerCase();
  const tags = [];
  if (/seed_|_seed|seed_/.test(file)) tags.push("D-Seed");
  if (/piorun|glks|mietkow|facebook_content/.test(file)) tags.push("E-Club");
  if (/audit|hardening|security|_fix|cleanup|trigger_fix|sync_fix|ensure_|treasurer/.test(file))
    tags.push("F-Fix");
  if (/create table|alter table|create type|create index|create extension/.test(lower)) tags.push("A-Schema");
  if (/enable row level security|create policy|alter policy/.test(lower)) tags.push("B-RLS");
  if (/create or replace function|create function/.test(lower)) tags.push("C-RPC");
  if (tags.length === 0) tags.push("A-Schema");
  return [...new Set(tags)].join("+");
}

async function main() {
  const repoMeta = repoFiles.map((f) => {
    const sql = readFileSync(join(migrationsDir, f), "utf8");
    return { file: f, version: f.replace(/_.*$/, ""), category: categorize(f, sql), bytes: sql.length };
  });

  let prodVersions = [];
  let prodTables = [];
  let prodRpc = [];
  let prodPolicies = 0;
  let dbConnected = false;

  try {
    const client = await connectDb();
    dbConnected = true;
    const { rows: mig } = await client.query(
      `SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version`,
    );
    prodVersions = mig.map((r) => String(r.version));

    const { rows: tables } = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `);
    prodTables = tables.map((r) => r.tablename);

    const { rows: rpc } = await client.query(`
      SELECT proname FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND proname LIKE 'get_%'
      ORDER BY proname
    `);
    prodRpc = rpc.map((r) => r.proname);

    const { rows: pol } = await client.query(
      `SELECT count(*)::int AS c FROM pg_policies WHERE schemaname = 'public'`,
    );
    prodPolicies = pol[0]?.c ?? 0;

    await client.end();
  } catch (e) {
    console.error("DB:", e.message);
  }

  const prodSet = new Set(prodVersions);
  const repoSet = new Set(repoVersions);

  const forensics = repoMeta.map((m) => {
    const tracked = prodSet.has(m.version);
    const schemaLikely =
      prodTables.includes("clubs") &&
      prodTables.includes("league_player_registry") &&
      prodRpc.includes("get_public_home_bundle");

    let status = "PASS";
    if (!dbConnected) status = "WARNING";
    else if (!tracked && schemaLikely) status = "WARNING"; // applied manually
    else if (!tracked) status = "FAIL";

    return {
      migration: m.file,
      version: m.version,
      category: m.category,
      repo: true,
      prod: dbConnected ? (tracked ? "tracked" : schemaLikely ? "schema-present" : "missing") : "?",
      tracked: dbConnected ? tracked : null,
      status,
    };
  });

  const prodOnly = prodVersions.filter((v) => !repoSet.has(v));
  const untrackedOnProd = repoVersions.filter((v) => dbConnected && !prodSet.has(v));

  console.log(
    JSON.stringify(
      {
        dbConnected,
        repoCount: repoFiles.length,
        prodTrackedCount: prodVersions.length,
        prodOnlyVersions: prodOnly,
        untrackedButInRepo: untrackedOnProd.length,
        untrackedSample: untrackedOnProd.slice(0, 10),
        prodTableCount: prodTables.length,
        prodPolicyCount: prodPolicies,
        keyRpcPresent: {
          get_public_home_bundle: prodRpc.includes("get_public_home_bundle"),
          get_public_website_home: prodRpc.includes("get_public_website_home"),
          get_pwa_offline_context: prodRpc.includes("get_pwa_offline_context"),
        },
        categoryCounts: repoMeta.reduce((acc, m) => {
          m.category.split("+").forEach((c) => (acc[c] = (acc[c] ?? 0) + 1));
          return acc;
        }, {}),
        forensicsSummary: {
          pass: forensics.filter((f) => f.status === "PASS").length,
          warning: forensics.filter((f) => f.status === "WARNING").length,
          fail: forensics.filter((f) => f.status === "FAIL").length,
        },
        prodTrackedVersions: prodVersions,
        forensics,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
