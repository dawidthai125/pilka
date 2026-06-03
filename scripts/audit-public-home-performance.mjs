#!/usr/bin/env node
/**
 * Sprint 16.2 — audyt / pomiar warstwy danych homepage (PRZED vs PO).
 * Uruchom: node scripts/audit-public-home-performance.mjs [--live]
 */
import dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const SLUG = process.env.PUBLIC_CLUB_SLUG ?? "piorun-wawrzenczyce";

/** Audyt statyczny — liczone z kodu przed refaktorem (commit baseline P0). */
export const AUDIT_BEFORE = {
  label: "PRZED (page.tsx + loadClubHomepageData + layout)",
  rpc: {
    layout: ["get_public_website_home"],
    page: [
      "get_public_website_home (dedup React cache z layout)",
      "get_public_sponsors (pobierane, nieużywane na /)",
      "get_public_teams",
      "get_public_club_stats (pobierane, nieużywane na /)",
      "get_public_team_stats",
      "get_public_players",
    ],
    totalUniqueRpc: 6,
  },
  select: [
    "clubs (getPublicClubId)",
    "website_news LIMIT 6",
    "league_seasons (league table)",
    "league_competitions (league table)",
    "clubs public_name (league table)",
    "league_table_entries",
    "website_media",
    "matches results LIMIT 8",
    "website_social_integrations (layout)",
  ],
  totalSelect: 9,
  createSignedUrl: {
    notes: "logo ×2 (layout + loadClubHomepageData), cover ×2 (layout + page), batch media N ścieżek, fallback news paths",
    estimateMin: 4,
    estimateTypical: "8–15",
  },
  serverActions: 0,
  estimatedSupabaseRoundTrips: "12–16 HTTP (+ storage signed URLs)",
  duplicateFetches: [
    "get_public_website_home (layout + loadClubHomepageData)",
    "resolvePublicCoverImageUrl (layout ClubSitePageWrapper + page)",
    "getWebsiteAssetUrl(logo) (layout + loadClubHomepageData)",
    "lastResult w RPC home vs recentResults SELECT (częściowo)",
  ],
  wastedOnHomepage: ["get_public_sponsors", "get_public_club_stats", "heroImages/galleryItems z media bundle"],
};

export const AUDIT_AFTER = {
  label: "PO (get_public_home_bundle + hydrate)",
  rpc: {
    layout: ["get_public_website_home"],
    page: ["get_public_home_bundle"],
    totalUniqueRpc: 2,
  },
  select: ["website_social_integrations (layout)"],
  totalSelect: 1,
  createSignedUrl: {
    notes: "1× batch getWebsiteAssetUrls(media) + 1× cover (React cache dedup z layout jeśli ten sam heroImagePath)",
    estimateMin: 1,
    estimateTypical: "2–6",
  },
  serverActions: 0,
  estimatedSupabaseRoundTrips: "3–4 HTTP (+ storage batch)",
  duplicateFetches: ["get_public_website_home nadal w layout (shell nav) — poza zakresem Etapu B"],
};

async function liveProbe() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log("Brak NEXT_PUBLIC_SUPABASE_* — pomijam live probe.");
    return null;
  }

  const supabase = createClient(url, key);
  const t0 = performance.now();
  const { data, error } = await supabase.rpc("get_public_home_bundle", { p_club_slug: SLUG });
  const ms = Math.round(performance.now() - t0);

  if (error) {
    return { ok: false, error: error.message, ms };
  }

  const payload = data ?? {};
  return {
    ok: true,
    ms,
    keys: Object.keys(payload),
    news: Array.isArray(payload.news) ? payload.news.length : 0,
    players: Array.isArray(payload.players) ? payload.players.length : 0,
    topScorers: Array.isArray(payload.topScorers) ? payload.topScorers.length : 0,
    recentResults: Array.isArray(payload.recentResults) ? payload.recentResults.length : 0,
  };
}

async function probeProductionTtfb() {
  const prodUrl = process.env.PROD_URL ?? "https://pilka-mu.vercel.app";
  try {
    const t0 = performance.now();
    const res = await fetch(`${prodUrl}/`, { method: "GET", cache: "no-store" });
    const ttfb = Math.round(performance.now() - t0);
    return { url: prodUrl, status: res.status, ttfbMs: ttfb };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

const live = process.argv.includes("--live");

console.log("=== PUBLIC HOME PERFORMANCE AUDIT 16.2 ===\n");
console.log(JSON.stringify({ before: AUDIT_BEFORE, after: AUDIT_AFTER }, null, 2));

if (live) {
  console.log("\n--- Live RPC probe ---");
  console.log(JSON.stringify(await liveProbe(), null, 2));
  console.log("\n--- Production TTFB (baseline prod, nie lokalny bundle) ---");
  console.log(JSON.stringify(await probeProductionTtfb(), null, 2));
}
