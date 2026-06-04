#!/usr/bin/env node
fetch("http://www.90minut.pl/strzelcy.php?id_liga=14526", { headers: { "User-Agent": "PilkaSync/1.0" } })
  .then((r) => r.text())
  .then((t) => {
    console.log("len", t.length);
    const tables = [...t.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
    console.log("tables", tables.length);
    for (let i = 0; i < Math.min(3, tables.length); i++) {
      console.log("\n--- table", i, "---\n", tables[i][0].slice(0, 2500));
    }
    // search any row with digit goals
    const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].filter((m) => /\d+/.test(m[1]) && m[1].length > 50 && m[1].length < 800);
    console.log("\nrows with digits", rows.length);
    if (rows.length) console.log(rows[0][0].slice(0, 600));
  });
