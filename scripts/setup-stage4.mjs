#!/usr/bin/env node
/**
 * ETAP 4 setup: matches module migrations + seed (B Klasa).
 *
 * Requires SUPABASE_DB_PASSWORD in .env.local
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

const STAGE4_MIGRATIONS = [
  "20260531180000_matches_module.sql",
  "20260531181000_seed_matches.sql",
  "20260531182000_matches_audit_hardening.sql",
  "20260531183000_matches_audit_hardening.sql",
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
    for (const file of STAGE4_MIGRATIONS) {
      const sql = readFileSync(join(root, "supabase", "migrations", file), "utf8");
      console.log(`Applying: ${file}`);
      await client.query(sql);
    }
    console.log("\nETAP 4 setup complete — matches, stats and league table seeded.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
