#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const clubId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const [{ data: active }, { data: inactive }, { data: registry }] = await Promise.all([
  supabase
    .from("players")
    .select("first_name, last_name, email")
    .eq("club_id", clubId)
    .eq("status", "active")
    .order("last_name"),
  supabase
    .from("players")
    .select("first_name, last_name, email")
    .eq("club_id", clubId)
    .eq("status", "inactive")
    .order("last_name"),
  supabase
    .from("league_player_registry")
    .select("league_player_name, player_id")
    .eq("club_id", clubId)
    .order("league_player_name"),
]);

console.log("Aktywni zawodnicy:", active?.length ?? 0);
for (const p of active ?? []) console.log(`  ${p.last_name} ${p.first_name}${p.email ? ` (${p.email})` : ""}`);

console.log("\nNieaktywni (demo):", inactive?.length ?? 0);

const linked = (registry ?? []).filter((r) => r.player_id).length;
console.log("\nRejestr ligowy:", registry?.length ?? 0, "| powiązanych:", linked);
const unlinked = (registry ?? []).filter((r) => !r.player_id);
if (unlinked.length) {
  console.log("Bez powiązania:");
  for (const r of unlinked) console.log(" ", r.league_player_name);
}
