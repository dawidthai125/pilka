#!/usr/bin/env node
import dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const client = await connectDb();
for (const slug of ["piorun-wawrzenczyce", "pilot-club-test"]) {
  const { rows } = await client.query(
    `SELECT j.id, j.status, j.provider, j.trigger_source, j.duration_ms,
            j.started_at, j.completed_at, j.error_message, j.created_at
     FROM public.league_sync_jobs j
     JOIN public.clubs c ON c.id = j.club_id
     WHERE c.slug = $1
     ORDER BY j.created_at DESC
     LIMIT 5`,
    [slug],
  );
  console.log(`--- ${slug}`);
  console.log(JSON.stringify(rows, null, 2));
}
await client.end();
