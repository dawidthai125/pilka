#!/usr/bin/env node
const t = await fetch("http://www.90minut.pl/skarb.php?id_klub=3824&id_sezon=107", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());

for (const name of ["Błachowicz", "Blachowicz", "Dominik", "Grzegorek", "Kamiński"]) {
  console.log(name, t.indexOf(name));
}

// Find content between main table markers
const contentStart = t.indexOf("GLKS Mietk");
console.log("\ncontent around GLKS:", t.slice(contentStart, contentStart + 5000).replace(/\s+/g, " ").slice(0, 3000));
