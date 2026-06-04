#!/usr/bin/env node
const t = await fetch("http://www.90minut.pl/skarb.php?id_klub=3824&id_sezon=107", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());
for (const kw of ["Kadra", "kadra", "Zawodnik", "zawodnik", "Skład", "sklad", "B Klasa", "2025"]) {
  let i = 0, c = 0;
  while ((i = t.indexOf(kw, i)) !== -1 && c < 2) {
    console.log("\n", kw, "@", i);
    console.log(t.slice(i, i + 800));
    i += kw.length; c++;
  }
}
