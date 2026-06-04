#!/usr/bin/env node
const t = await fetch("https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/mecze/", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());
for (const kw of ["ajax", "getMatches", "matches", "2902", "DataTable", "mecz", "spotkan", "fixture"]) {
  let i = 0, c = 0;
  while ((i = t.indexOf(kw, i)) !== -1 && c < 2) {
    console.log(kw, ":", t.slice(Math.max(0, i - 60), i + 250).replace(/\s+/g, " "));
    i += kw.length; c++;
  }
}
