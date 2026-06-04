#!/usr/bin/env node
const t = await fetch("http://www.90minut.pl/bilans.php?id_klub=3824&id_sezon=91", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());
console.log("len", t.length);
const idx = t.indexOf("Bilans");
console.log("Bilans@", idx, t.slice(idx, idx + 3000));
const idx2 = t.search(/<table[^>]*>[\s\S]{0,500}Zawodnik/i);
console.log("\nZawodnik table@", idx2);
if (idx2 > 0) console.log(t.slice(idx2, idx2 + 4000));
