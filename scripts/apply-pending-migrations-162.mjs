#!/usr/bin/env node
/** Apply pending migrations 161 + 162 on remote via pg (SUPABASE_DB_PASSWORD). */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const FILES = [
  "20260703120000_league_player_matching_161.sql",
  "20260703140000_public_home_bundle_162.sql",
];

async function main() {
  const client = await connectDb();
  try {
    const { rows: existing } = await client.query(
      `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version`,
    );
    const applied = new Set(existing.map((r) => r.version));

    for (const file of FILES) {
      const version = file.replace(/_.*$/, "");
      if (applied.has(version)) {
        console.log(`SKIP (already applied): ${file}`);
        continue;
      }
      const sql = readFileSync(join(root, "supabase/migrations", file), "utf8");
      console.log(`Applying: ${file}`);
      await client.query(sql);
      try {
        await client.query(
          `INSERT INTO supabase_migrations.schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING`,
          [version],
        );
      } catch {
        console.log(`Note: could not record ${version} in schema_migrations (may use different tracking)`);
      }
      console.log(`OK: ${file}`);
    }

    const { rows: rpc } = await client.query(
      `SELECT proname FROM pg_proc WHERE proname = 'get_public_home_bundle'`,
    );
    const { rows: idx } = await client.query(
      `SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_matches_public_home%'`,
    );
    console.log("\nVerification:");
    console.log("RPC get_public_home_bundle:", rpc.length > 0 ? "EXISTS" : "MISSING");
    console.log("Indexes:", idx.map((r) => r.indexname).join(", ") || "none");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
