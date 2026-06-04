#!/usr/bin/env node
const t = await fetch("http://www.90minut.pl/skarb.php?id_klub=3824&id_sezon=107", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());

console.log("len", t.length);
for (const kw of ["Kami", "Mecze", "Bramki", "main2", "zawodnik", "Gole", "ŻK", "CzK"]) {
  console.log(kw, t.indexOf(kw));
}

const tables = [...t.matchAll(/<table[^>]*class="main2"[^>]*>([\s\S]*?)<\/table>/gi)];
console.log("main2 tables", tables.length);
for (let i = 0; i < Math.min(tables.length, 3); i++) {
  console.log("\n--- table", i, "---");
  console.log(tables[i][1].replace(/\s+/g, " ").slice(0, 2500));
}
