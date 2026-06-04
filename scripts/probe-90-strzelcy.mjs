#!/usr/bin/env node
import { parseNinetyMinutStrzelcy } from "./lib/league-squad-sources.mjs";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; PiorunLeagueSync/1.0)" };

const urls = [
  "http://www.90minut.pl/strzelcy.php?id_liga=14526",
  "http://www.90minut.pl/liga/1/liga14526.html",
];

for (const url of urls) {
  const html = await fetch(url, { headers: UA }).then((r) => r.text());
  const parsed = parseNinetyMinutStrzelcy(html);
  const mietk = parsed.filter((p) => /mietk/i.test(p.teamName));
  console.log("\n", url);
  console.log("  total scorers", parsed.length, "mietk", mietk.length);
  for (const s of mietk.slice(0, 15)) console.log("   ", s.goals, s.name, "|", s.teamName);

  if (mietk.length === 0 && parsed.length === 0) {
    const idx = html.search(/Strzelcy|strzelcy|STRZELCY/);
    console.log("  strzelcy section idx", idx);
    if (idx >= 0) {
      const slice = html.slice(idx, idx + 8000);
      const trCount = (slice.match(/<tr/gi) || []).length;
      console.log("  tr in section", trCount);
      const sample = slice.match(/<tr[^>]*>[\s\S]*?<\/tr>/i);
      if (sample) console.log("  sample tr:", sample[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 250));
    }
  }
}
