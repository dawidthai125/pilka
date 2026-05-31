#!/usr/bin/env node
/**
 * ETAP 8 setup: Inventory module migrations + seed.
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

const STAGE8_MIGRATIONS = [
  "20260602100000_inventory_module.sql",
  "20260602101000_seed_inventory.sql",
  "20260602102000_inventory_audit_hardening.sql",
  "20260602103000_inventory_audit_hardening.sql",
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
    for (const file of STAGE8_MIGRATIONS) {
      const sql = readFileSync(join(root, "supabase", "migrations", file), "utf8");
      console.log(`Applying: ${file}`);
      await client.query(sql);
    }
    console.log("\nETAP 8 setup complete — inventory module seeded.");
    console.log("100+ items, 25 player kits, issues, damages, suppliers, orders.");
    console.log("Staff: /inventory | Player: /inventory/portal");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
