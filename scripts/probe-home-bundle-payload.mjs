#!/usr/bin/env node
/** Payload review for get_public_home_bundle — sprint 16.2 pre-deploy */
import dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const SLUG = process.env.PUBLIC_CLUB_SLUG ?? "piorun-wawrzenczyce";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_*");

  const supabase = createClient(url, key);
  const t0 = performance.now();
  const { data, error } = await supabase.rpc("get_public_home_bundle", { p_club_slug: SLUG });
  const ms = Math.round(performance.now() - t0);

  if (error) {
    console.log(JSON.stringify({ ok: false, error: error.message, ms }, null, 2));
    process.exit(1);
  }

  const json = JSON.stringify(data);
  const bytes = Buffer.byteLength(json, "utf8");

  const count = (key) => (Array.isArray(data[key]) ? data[key].length : 0);

  const report = {
    ok: true,
    ms,
    payloadBytes: bytes,
    payloadKb: Math.round((bytes / 1024) * 10) / 10,
    records: {
      news: count("news"),
      teams: count("teams"),
      sponsors: count("sponsors"),
      recentResults: count("recentResults"),
      players: count("players"),
      topScorers: count("topScorers"),
      media: count("media"),
      academy: count("academy"),
      leagueEntries: Array.isArray(data.league?.entries) ? data.league.entries.length : 0,
    },
    flags: {
      hasNextMatch: Boolean(data.nextMatch),
      hasLastMatch: Boolean(data.lastMatch),
      newsCount: data.newsCount,
      sponsorCount: data.sponsorCount,
    },
    topLevelKeys: Object.keys(data ?? {}),
    wastedCandidates: [],
  };

  if (report.records.sponsors > 0 && !process.argv.includes("--with-sponsors-ui")) {
    report.wastedCandidates.push("sponsors: w bundle, nie renderowane na / (akceptowalne na przyszłość)");
  }
  if (report.records.media > 0) {
    report.notes = "media: wymagane do batch signed URL w hydrate (nie zbędne)";
  }
  if (report.records.players > 15) {
    report.wastedCandidates.push(
      `players: ${report.records.players} rekordów — sekcja kadry na / wymaga pełnej listy (jak PRZED)`,
    );
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
