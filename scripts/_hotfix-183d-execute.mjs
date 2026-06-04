import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const mode = process.argv[2] ?? "preflight";

const client = await connectDb();

if (mode === "preflight") {
  const total = await client.query("SELECT COUNT(*)::int AS c FROM public.availability_reasons");
  const club = await client.query(
    "SELECT COUNT(*)::int AS c FROM public.availability_reasons WHERE club_id IS NOT NULL",
  );
  const system = await client.query(
    "SELECT COUNT(*)::int AS c FROM public.availability_reasons WHERE club_id IS NULL",
  );
  const dupes = await client.query(`
    SELECT club_id, code, COUNT(*)::int AS cnt
    FROM public.availability_reasons
    WHERE club_id IS NOT NULL
    GROUP BY club_id, code
    HAVING COUNT(*) > 1
  `);
  console.log("TOTAL:", total.rows[0].c);
  console.log("CLUB_SPECIFIC:", club.rows[0].c);
  console.log("SYSTEM:", system.rows[0].c);
  console.log("DUPLICATES:", dupes.rows.length);
  if (dupes.rows.length) console.log(JSON.stringify(dupes.rows));
  process.exit(dupes.rows.length > 0 ? 1 : 0);
}

if (mode === "migrate") {
  const sql = readFileSync(
    join(root, "supabase/migrations/20260604120000_hotfix_183d_availability_reasons_unique.sql"),
    "utf8",
  );
  const start = Date.now();
  await client.query(sql);
  const ms = Date.now() - start;
  const idx = await client.query(`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'availability_reasons'
      AND indexname = 'availability_reasons_club_id_code_key'
  `);
  console.log("STATUS: OK");
  console.log("EXECUTION_MS:", ms);
  if (idx.rows[0]) console.log("INDEX:", idx.rows[0].indexdef);
  else {
    console.log("INDEX: MISSING");
    process.exit(1);
  }
}

if (mode === "postflight") {
  const clubId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO public.availability_reasons (club_id, code, label_pl, absence_reason, sort_order)
       VALUES ($1, 'illness', 'Choroba', 'illness'::public.absence_reason, 1)
       ON CONFLICT (club_id, code) DO NOTHING`,
      [clubId],
    );
    await client.query("ROLLBACK");
    console.log("ON_CONFLICT: PASS");
  } catch (e) {
    await client.query("ROLLBACK");
    console.log("ON_CONFLICT: FAIL —", e.message);
    process.exit(1);
  }
}

await client.end();
