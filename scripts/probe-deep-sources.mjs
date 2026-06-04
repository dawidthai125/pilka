#!/usr/bin/env node
const urls = [
  "http://www.90minut.pl/skarb.php?id_klub=3824&id_sezon=107",
  "https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/mecze/",
  "http://www.90minut.pl/strzelcy.php?id_liga=14526",
];
for (const url of urls) {
  const t = await fetch(url, { headers: { "User-Agent": "PilkaSync/1.0" } }).then((r) => r.text());
  console.log("\n===", url, "len", t.length);
  for (const kw of ["zawodnik", "Strzelcy", "Bramki", "bilans", "skład", "sklad", "Mietk", "3824"]) {
    const i = t.search(new RegExp(kw, "i"));
    if (i >= 0) console.log(kw, "@", i, ":", t.slice(i, i + 500).replace(/\s+/g, " ").slice(0, 400));
  }
}
