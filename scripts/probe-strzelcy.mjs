#!/usr/bin/env node
fetch("http://www.90minut.pl/strzelcy.php?id_liga=14526", { headers: { "User-Agent": "PilkaSync/1.0" } })
  .then((r) => r.text())
  .then((t) => {
    const idx = t.search(/Mietk/i);
    console.log("Mietk idx", idx);
    if (idx > 0) console.log(t.slice(idx - 300, idx + 800));
    const idx2 = t.indexOf("Strzelcy");
    console.log("\n--- top ---\n", t.slice(idx2, idx2 + 4000));
  });
