#!/usr/bin/env node
const url = "https://regionalnyfutbol.pl/mecz,749264,glks-mietkow,ks-piotrowice.html";
const t = await fetch(url, { headers: { "User-Agent": "PilkaSync/1.0" } }).then((r) => r.text());
console.log("len", t.length);
for (const kw of ["skład", "Skład", "sklad", "zawodnik", "Strzelcy", "Bramki", "Gol", "rezerwow", "wyjściow", "Wyjściow", "lineup", "player"]) {
  const re = new RegExp(kw, "gi");
  let m, c = 0;
  while ((m = re.exec(t)) !== null && c < 2) {
    console.log("\n", kw, "@", m.index);
    console.log(t.slice(Math.max(0, m.index - 80), m.index + 500).replace(/\s+/g, " "));
    c++;
  }
}
