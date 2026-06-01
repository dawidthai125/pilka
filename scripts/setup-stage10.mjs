#!/usr/bin/env node
/**
 * ETAP 10 setup: Integrations module migrations + seed.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

dotenv.config({ path: join(root, ".env.local") });

const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ??
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] ??
  "pwkqnwqvrdiaycveacxa";

const STAGE10_MIGRATIONS = [
  "20260604100000_integrations_module.sql",
  "20260604101000_seed_integrations.sql",
  "20260604102000_integrations_audit_hardening.sql",
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}

async function main() {
  const client = await connectDb();
  console.log("Connected to PostgreSQL (pooler).");

  try {
    for (const file of STAGE10_MIGRATIONS) {
      const sql = readFileSync(join(root, "supabase", "migrations", file), "utf8");
      console.log(`Applying ${file}...`);
      await client.query(sql);
      console.log(`OK: ${file}`);
    }
    console.log("ETAP 10 setup complete.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
