#!/usr/bin/env node
fetch("https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/kadra/", {
  headers: { "User-Agent": "PilkaSync/1.0" },
})
  .then((r) => r.text())
  .then((t) => {
    const idx = t.indexOf("Błachowicz");
    console.log(t.slice(idx - 800, idx + 2000));
    const headerIdx = t.lastIndexOf("<thead", idx);
    console.log("\n--- HEADER ---\n");
    console.log(t.slice(headerIdx, headerIdx + 1500));
  });
