#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sqlFile = process.argv[2];

if (!sqlFile) {
  console.error("Usage: node scripts/run-sql.mjs <path-to-sql-file>");
  process.exit(1);
}

dotenv.config({ path: join(root, ".env.local") });

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef =
  process.env.SUPABASE_PROJECT_REF ??
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];

if (!password || !projectRef) {
  console.error("Missing SUPABASE_DB_PASSWORD or project ref in .env.local");
  process.exit(1);
}

const client = new pg.Client({
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  user: "postgres",
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

const sql = readFileSync(join(root, sqlFile), "utf8");

await client.connect();
try {
  await client.query(sql);
  console.log(`Applied: ${sqlFile}`);
} finally {
  await client.end();
}
