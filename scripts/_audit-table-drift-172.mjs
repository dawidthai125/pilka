#!/usr/bin/env node
/** Compare expected tables from repo vs prod */
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const migrationsDir = join(root, "supabase/migrations");
const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
const tableNames = new Set();
for (const f of files) {
  const sql = readFileSync(join(migrationsDir, f), "utf8");
  for (const m of sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? public\.(\w+)/gi)) {
    tableNames.add(m[1]);
  }
}

const c = await connectDb();
const { rows } = await c.query(
  `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`,
);
const prodTables = new Set(rows.map((r) => r.tablename));
await c.end();

const missing = [...tableNames].filter((t) => !prodTables.has(t)).sort();
const extra = [...prodTables].filter((t) => !tableNames.has(t)).sort();

console.log(JSON.stringify({
  expectedFromMigrations: tableNames.size,
  prodTables: prodTables.size,
  missingOnProd: missing,
  extraOnProd: extra.slice(0, 20),
}, null, 2));
