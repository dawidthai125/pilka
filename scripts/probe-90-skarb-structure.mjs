#!/usr/bin/env node
const UA = { "User-Agent": "Mozilla/5.0 (compatible; PiorunLeagueSync/1.0)" };
const html = await fetch("http://www.90minut.pl/skarb.php?id_klub=3824&id_sezon=107", { headers: UA }).then((r) => r.text());

for (const kw of ["Grzegorek", "Konieczny", "Błachowicz", "Bramki", "Zawodnik", "kadra", "skład", "bilans zawod"]) {
  const i = html.indexOf(kw);
  if (i >= 0) console.log(kw, "@", i);
}

// Find all tables
const tables = html.split(/<table/i);
console.log("tables", tables.length);

for (let ti = 0; ti < tables.length; ti++) {
  const t = tables[ti];
  if (!/<a[^>]*>[^<]{4,}/.test(t)) continue;
  const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const withLink = rows.filter((r) => /<a[^>]*>[A-ZĄĆĘŁŃÓŚŹŻ]/.test(r[1]));
  if (withLink.length < 3) continue;
  console.log(`\nTable ${ti}: ${withLink.length} name rows`);
  for (const r of withLink.slice(0, 3)) {
    console.log(r[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200));
  }
}

// strzelcy id=14526 - find ANY row with digit goals
const sc = await fetch("http://www.90minut.pl/strzelcy.php?id=14526", { headers: UA }).then((r) => r.text());
const rows = [...sc.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
console.log("\nstrzelcy.php rows", rows.length);
for (const r of rows) {
  const text = r[1].replace(/<[^>]+>/g, "|").replace(/\|+/g, "|");
  if (/\|\d+\|/.test(text) && text.length > 20 && text.length < 300) {
    if (/mietk|grzegorek|konieczny/i.test(text) || rows.indexOf(r) < 30) {
      // only show if has name-like content
      if (/[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]{2,}/.test(text)) console.log(text.slice(0, 180));
    }
  }
}
