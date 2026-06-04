import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const mode = process.argv[2] ?? "migrate";

const client = await connectDb();

if (mode === "migrate") {
  const sql = readFileSync(
    join(root, "supabase/migrations/20260604140000_hotfix_184adb_platform_club_writes.sql"),
    "utf8",
  );
  const start = Date.now();
  await client.query(sql);
  console.log("MIGRATE: OK", Date.now() - start, "ms");

  const { rows } = await client.query(`
    SELECT proname FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('platform_append_club_audit', 'platform_set_club_status')
    ORDER BY proname
  `);
  console.log("RPC:", rows.map((r) => r.proname).join(", "));
}

if (mode === "verify-trigger") {
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE public.clubs SET status = status WHERE slug = 'piorun-wawrzenczyce'`);
    await client.query("ROLLBACK");
    console.log("RAW_UPDATE settings unchanged: OK");
  } catch (e) {
    await client.query("ROLLBACK");
    console.log("RAW_UPDATE:", e.message);
  }
}

await client.end();
