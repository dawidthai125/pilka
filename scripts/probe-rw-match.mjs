#!/usr/bin/env node
const t = await fetch("https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/mecze/", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());
const links = [...t.matchAll(/href="(\/mecz\/[^"]+)"/gi)].map((m) => m[1]);
console.log("match links", links.length, links.slice(0, 5));
if (links[0]) {
  const url = "https://regiowyniki.pl" + links[0];
  const m = await fetch(url, { headers: { "User-Agent": "PilkaSync/1.0" } }).then((r) => r.text());
  console.log("\nmatch page len", m.length);
  for (const kw of ["skład", "Skład", "zawodnik", "Strzelcy", "Bramki", "Gol", "playerstable", "rezerwow"]) {
    const i = m.search(new RegExp(kw, "i"));
    if (i >= 0) {
      console.log("\n", kw, "@", i);
      console.log(m.slice(Math.max(0, i - 100), i + 600));
    }
  }
}
