#!/usr/bin/env node
import { parseNinetyMinutStrzelcy, parseNinetyMinutBilans } from "./lib/league-squad-sources.mjs";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; PiorunLeagueSync/1.0)" };

const urls = [
  ["strzelcy id", "http://www.90minut.pl/strzelcy.php?id=14526"],
  ["strzelcy id_liga", "http://www.90minut.pl/strzelcy.php?id_liga=14526"],
  ["stats", "http://www.90minut.pl/stats.php?id=14526"],
  ["skarb", "http://www.90minut.pl/skarb.php?id_klub=3824&id_sezon=107"],
  ["bilans", "http://www.90minut.pl/bilans.php?id_klub=3824&id_sezon=107"],
];

for (const [label, url] of urls) {
  const html = await fetch(url, { headers: UA }).then((r) => r.text());
  const scorers = parseNinetyMinutStrzelcy(html);
  const bilans = parseNinetyMinutBilans(html);
  const mietkScorers = scorers.filter((s) => /mietk/i.test(s.teamName));
  const mietkBilans = bilans.filter((b) => true);
  console.log(`\n${label} ${url}`);
  console.log(`  len=${html.length} scorers=${scorers.length} mietkScorers=${mietkScorers.length} bilans=${bilans.length}`);
  for (const s of mietkScorers.slice(0, 8)) console.log(`    ${s.goals}G ${s.name}`);
  for (const b of bilans.filter((x) => /grzegorek|konieczny|błachowicz|jakubczak/i.test(x.name)).slice(0, 5)) {
    console.log(`    bilans ${b.goals}G ${b.name} M=${b.matches}`);
  }
  if (scorers.length === 0 && bilans.length === 0) {
    const mietk = html.search(/mietk/i);
    if (mietk >= 0) console.log("  has Mietk text @", mietk);
    console.log("  main2", (html.match(/main2/gi) || []).length);
  }
}
