#!/usr/bin/env node
import { writeFileSync } from "fs";
const UA = { "User-Agent": "Mozilla/5.0" };
const html = await fetch("http://www.90minut.pl/skarb.php?id_klub=3824&id_sezon=107", { headers: UA }).then((r) =>
  r.text(),
);
writeFileSync("tmp-skarb107.html", html);
// find tables
const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
console.log("tables", tables.length);
for (let i = 0; i < Math.min(tables.length, 8); i++) {
  const t = tables[i][0];
  console.log(`\ntable ${i} class=${t.match(/class="([^"]*)"/)?.[1] ?? "-"} len=${t.length}`);
  const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  console.log("  rows", rows.length);
  for (const r of rows.slice(0, 4)) {
    const text = r[1].replace(/<[^>]+>/g, "|").replace(/\s+/g, " ").slice(0, 120);
    console.log("   ", text);
  }
}
