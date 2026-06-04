#!/usr/bin/env node
import { parseRegionalnyFutbolFixtures } from "./lib/league-live-sources.mjs";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; PiorunSync/1.0)" };
const ligaUrl =
  "https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,tabela-terminarz.html";
const html = await fetch(ligaUrl, { headers: UA }).then((r) => r.text());
const fixtures = parseRegionalnyFutbolFixtures(html).filter(
  (f) => /mietk/i.test(f.homeTeamName) || /mietk/i.test(f.awayTeamName),
);
console.log("Mietkow fixtures", fixtures.length);
const played = fixtures.filter((f) => f.homeScore != null && f.awayScore != null);
console.log("played", played.length);

for (const f of played.slice(0, 5)) {
  const url = f.matchUrl || f.url;
  if (!url) {
    console.log("no url", f);
    continue;
  }
  const full = url.startsWith("http") ? url : `https://regionalnyfutbol.pl${url}`;
  const page = await fetch(full, { headers: UA }).then((r) => r.text());
  console.log("\n===", full, "===");
  for (const kw of ["bramk", "strzel", "Gol", "gol", "skład", "zdarzen", "wydarzen", "protocol"]) {
    if (new RegExp(kw, "i").test(page)) {
      const idx = page.search(new RegExp(kw, "i"));
      console.log(kw, page.slice(idx, idx + 300).replace(/\s+/g, " "));
    }
  }
}
