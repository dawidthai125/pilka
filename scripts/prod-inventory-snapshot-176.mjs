#!/usr/bin/env node
/**
 * Sprint 17.6 — read-only production inventory snapshot (no writes).
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

async function main() {
  const client = await connectDb();
  const q = (sql, params) => client.query(sql, params).then((r) => r.rows);

  const [
    tables,
    enums,
    functions,
    policies,
    triggers,
    buckets,
    storageCount,
    migrations,
    authUsers,
    clubs,
    extensions,
  ] = await Promise.all([
    q(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`),
    q(`SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e' ORDER BY t.typname`),
    q(`SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY p.proname`),
    q(`SELECT policyname, tablename FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname`),
    q(`SELECT tgname AS name, c.relname AS table_name FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname, tgname`),
    q(`SELECT id, name, public, file_size_limit FROM storage.buckets ORDER BY id`),
    q(`SELECT bucket_id, count(*)::int AS object_count FROM storage.objects GROUP BY bucket_id ORDER BY bucket_id`),
    q(`SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version`),
    q(`SELECT count(*)::int AS count FROM auth.users`),
    q(`SELECT id, slug, public_name, official_name FROM public.clubs ORDER BY slug`),
    q(`SELECT extname FROM pg_extension ORDER BY extname`),
  ]);

  const rpc = functions.map((r) => r.proname).filter((n) => n.startsWith("get_") || n.startsWith("list_"));

  const snapshot = {
    generatedAt: new Date().toISOString(),
    sprint: "17.6",
    environment: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/https:\/\/([^.]+).*/, "$1") ?? "unknown",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://pilka-mu.vercel.app",
      vercelRegion: "fra1",
      cron: [{ path: "/api/cron/league-sync", schedule: "0 6 * * * UTC" }],
    },
    counts: {
      tables: tables.length,
      enums: enums.length,
      functions: functions.length,
      rpc: rpc.length,
      policies: policies.length,
      triggers: triggers.length,
      buckets: buckets.length,
      storageObjects: storageCount.reduce((s, r) => s + r.object_count, 0),
      authUsers: authUsers[0].count,
      clubs: clubs.length,
      schemaMigrations: migrations.length,
    },
    schemaMigrations: migrations,
    clubs,
    buckets,
    storageByBucket: storageCount,
    extensions: extensions.map((r) => r.extname),
    rpc,
  };

  const outPath = join(root, "docs/architecture/sprint-176-production-inventory.json");
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(JSON.stringify({ counts: snapshot.counts, clubs: snapshot.clubs.map((c) => c.slug) }, null, 2));
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
