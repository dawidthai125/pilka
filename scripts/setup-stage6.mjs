#!/usr/bin/env node
/**
 * ETAP 6 setup: Sponsors module migrations + seed.
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

const STAGE6_MIGRATIONS = [
  "20260531200000_sponsors_module.sql",
  "20260531201000_seed_sponsors.sql",
  "20260531202000_sponsors_audit_hardening.sql",
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
    for (const file of STAGE6_MIGRATIONS) {
      const sql = readFileSync(join(root, "supabase", "migrations", file), "utf8");
      console.log(`Applying: ${file}`);
      await client.query(sql);
    }
    console.log("\nETAP 6 setup complete — sponsors module seeded.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
