#!/usr/bin/env node
const UA = { "User-Agent": "PilkaSync/1.0" };
const t = await fetch("http://www.90minut.pl/strzelcy.php?id=14526", { headers: UA }).then((r) => r.text());
console.log("len", t.length);
const tables = [...t.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
console.log("tables", tables.length);
for (let i = 0; i < Math.min(5, tables.length); i++) {
  console.log("\n--- table", i, "---");
  console.log(tables[i][0].slice(0, 2000).replace(/\s+/g, " "));
}
const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
console.log("\nall tr", rows.length);
for (const r of rows) {
  const plain = r[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length > 15 && plain.length < 200 && /\d/.test(plain)) console.log(plain);
}
