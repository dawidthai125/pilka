#!/usr/bin/env node
const t = await fetch("http://www.90minut.pl/skarb.php?id_klub=3824&id_sezon=107", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());

for (const kw of ["Mietk", "Grzegorek", "GLKS", "3824", "skarb", "Skarb", "bilans", "statyst"]) {
  const i = t.indexOf(kw);
  if (i >= 0) console.log(kw, i, t.slice(i, i + 200).replace(/\s+/g, " "));
}

// title
const title = t.match(/<title>([^<]+)/i);
console.log("\ntitle:", title?.[1]);

// h1/h2
for (const m of t.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)) {
  console.log("heading:", m[1].replace(/<[^>]+>/g, "").trim());
}
