#!/usr/bin/env node
/**
 * ETAP 11 setup: Academy, player development, scouting module.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

dotenv.config({ path: join(root, ".env.local") });

const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ??
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] ??
  "pwkqnwqvrdiaycveacxa";

const STAGE11_MIGRATIONS = [
  "20260605100000_academy_module.sql",
  "20260605101000_seed_academy.sql",
  "20260605102000_academy_audit_hardening.sql",
  "20260605103000_academy_audit_fixes.sql",
  "20260605110000_stage115_security_performance.sql",
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}

async function main() {
  const dbPassword = requireEnv("SUPABASE_DB_PASSWORD");
  const client = new pg.Client({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    user: "postgres",
    password: dbPassword,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to PostgreSQL.");

  try {
    for (const file of STAGE11_MIGRATIONS) {
      const sql = readFileSync(join(root, "supabase", "migrations", file), "utf8");
      console.log(`Applying ${file}...`);
      await client.query(sql);
      console.log(`OK: ${file}`);
    }
    console.log("ETAP 11 setup complete.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
