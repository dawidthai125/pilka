#!/usr/bin/env node
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });

const c = await connectDb();
const queries = {
  schema_migrations: `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version`,
  clubs: `SELECT id, slug, public_name FROM clubs`,
  academy_groups: `SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='academy_groups') AS exists`,
  migration_410: `SELECT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20260703141000') AS tracked`,
  buckets: `SELECT id, public FROM storage.buckets ORDER BY id`,
  enum_roles: `SELECT unnest(enum_range(NULL::club_role))::text AS role`,
};
for (const [name, sql] of Object.entries(queries)) {
  const r = await c.query(sql);
  console.log(`--- ${name} ---`);
  console.log(JSON.stringify(r.rows, null, 2));
}
await c.end();
