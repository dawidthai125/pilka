#!/usr/bin/env node
/**
 * Sprint 18.5A — regression read paths (monitoring/dashboard shaped queries).
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function main() {
  const [clubsRes, syncsRes, sourcesRes] = await Promise.all([
    admin.from("clubs").select("id, slug, public_name, status, settings, created_at").order("created_at", { ascending: false }),
    admin
      .from("league_sync_jobs")
      .select(
        "id, club_id, status, records_processed, records_failed, error_message, started_at, completed_at, created_at, import_type, provider, trigger_source, duration_ms",
      )
      .order("created_at", { ascending: false })
      .limit(50),
    admin.from("league_sources").select("id, club_id, name, is_active, config, last_sync_at, created_at"),
  ]);

  if (clubsRes.error) throw new Error(`clubs: ${clubsRes.error.message}`);
  if (syncsRes.error) throw new Error(`syncs: ${syncsRes.error.message}`);
  if (sourcesRes.error) throw new Error(`sources: ${sourcesRes.error.message}`);

  console.log("OK clubs:", clubsRes.data?.length ?? 0);
  console.log("OK sync jobs:", syncsRes.data?.length ?? 0);
  console.log("OK league sources:", sourcesRes.data?.length ?? 0);

  const sample = syncsRes.data?.[0];
  if (sample && !("provider" in sample)) {
    throw new Error("league_sync_jobs select missing provider column in API response");
  }
  console.log("OK sample job fields:", Object.keys(sample ?? {}).sort().join(", "));

  console.log("\nverify-185a-regression: PASS");
}

main().catch((err) => {
  console.error("\nverify-185a-regression: FAIL", err.message);
  process.exit(1);
});
