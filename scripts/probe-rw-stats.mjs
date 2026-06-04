#!/usr/bin/env node
fetch("https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/statystyki/", {
  headers: { "User-Agent": "PilkaSync/1.0" },
})
  .then((r) => r.text())
  .then((t) => {
    for (const kw of ["Strzelcy", "strzelcy", "Bramki", "player", "zawodnik", "tbody"]) {
      let i = 0,
        c = 0;
      while ((i = t.indexOf(kw, i)) !== -1 && c < 2) {
        console.log(kw, t.slice(i, i + 400));
        i += kw.length;
        c++;
      }
    }
    // look for numeric stat tables with names
    const rows = [...t.matchAll(/<tr[^>]*>\s*<td[^>]*>([A-ZĄĆĘŁŃÓŚŹŻ][^<]{3,40})<\/td>/gi)];
    console.log("name rows", rows.length);
    for (const r of rows.slice(0, 15)) console.log(" ", r[1]);
  });
