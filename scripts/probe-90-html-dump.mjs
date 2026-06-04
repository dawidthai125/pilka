#!/usr/bin/env node
const UA = { "User-Agent": "Mozilla/5.0 (compatible; PiorunLeagueSync/1.0)" };
const html = await fetch("http://www.90minut.pl/liga/1/liga14526.html", { headers: UA }).then((r) => r.text());

const idx = html.indexOf("Strzelcy");
const slice = html.slice(idx, idx + 15000);
writeFileSync = (await import("fs")).writeFileSync;
writeFileSync("tmp-90-strzelcy.html", slice);
console.log("wrote", slice.length, "bytes");

// Count patterns
console.log("main2 tables", (slice.match(/class="main2"/gi) || []).length);
console.log("main tables", (slice.match(/class="main"/gi) || []).length);

// Find GLKS or Mietk in slice
const mietkIdx = slice.search(/mietk|Mietk|MIETK/i);
console.log("mietk in slice", mietkIdx);
if (mietkIdx >= 0) console.log(slice.slice(mietkIdx - 200, mietkIdx + 500).replace(/\s+/g, " "));

// All text that looks like "Name Surname" followed by numbers
const blocks = slice.split(/<tr/i);
let count = 0;
for (const b of blocks) {
  if (!/mietk|mietków|mietkow/i.test(b)) continue;
  count++;
  console.log("--- mietk row", count, "---");
  console.log(b.slice(0, 600).replace(/<[^>]+>/g, "|").replace(/\|+/g, "|"));
}
