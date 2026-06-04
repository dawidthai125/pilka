#!/usr/bin/env node
fetch("https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,glks-mietkow.html", {
  headers: { "User-Agent": "PilkaSync/1.0" },
})
  .then((r) => r.text())
  .then((t) => {
    console.log("status len", t.length);
    console.log(t.slice(0, 4000));
    const idx = t.search(/zawodnik|skład|kadra|strzel/i);
    console.log("\n--- match ---\n", t.slice(idx, idx + 3000));
  });
