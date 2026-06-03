#!/usr/bin/env node
/** Smoke: bundle hydrate + optional HTML markers */
import dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

async function testBundleHydrate() {
  const { loadHydratedPublicHomePage } = await import("../src/lib/website/home-bundle.ts");
  const t0 = performance.now();
  const home = await loadHydratedPublicHomePage();
  const ms = Math.round(performance.now() - t0);
  if (!home) return { ok: false, error: "loadHydratedPublicHomePage returned null", ms };
  return {
    ok: true,
    ms,
    clubName: home.clubName,
    newsCount: home.news.length,
    playersCount: home.players.length,
    topScorersCount: home.topScorers.length,
    recentResultsCount: home.recentResults.length,
    leagueEntries: home.league.entries.length,
    hasCover: Boolean(home.coverImageUrl),
    hasNextMatch: Boolean(home.nextMatch),
  };
}

async function httpSmoke(base) {
  const routes = ["/", "/aktualnosci", "/mecze", "/tabela", "/galeria", "/kontakt", "/druzyna"];
  const results = [];
  for (const route of routes) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${base}${route}`, { redirect: "follow" });
      const html = await res.text();
      const ms = Math.round(performance.now() - t0);
      results.push({
        route,
        status: res.status,
        ms,
        hasPiorun: /Piorun|piorun/i.test(html),
        hasMain: html.includes('id="main-content"'),
      });
    } catch (err) {
      results.push({ route, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}

async function main() {
  const base = process.argv[2] ?? "https://pilka-mu.vercel.app";
  console.log("=== Bundle hydrate (local TS) ===");
  try {
    console.log(JSON.stringify(await testBundleHydrate(), null, 2));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }, null, 2));
  }
  console.log("\n=== HTTP smoke:", base, "===");
  console.log(JSON.stringify(await httpSmoke(base), null, 2));
}

main();
