#!/usr/bin/env node
fetch("https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/kadra/", {
  headers: { "User-Agent": "PilkaSync/1.0" },
})
  .then((r) => r.text())
  .then((t) => {
    for (const kw of ["ajax", "playerstable", "DataTable", "2902", "getPlayers", "kadra", "api/"]) {
      let idx = 0;
      let count = 0;
      while ((idx = t.indexOf(kw, idx)) !== -1 && count < 3) {
        console.log(kw, ":", t.slice(Math.max(0, idx - 80), idx + 200));
        idx += kw.length;
        count++;
      }
    }
  });
