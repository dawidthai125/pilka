#!/usr/bin/env node
const UA = { "User-Agent": "Mozilla/5.0" };
const html = await fetch(
  "https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,tabela-terminarz.html",
  { headers: UA },
).then((r) => r.text());
const idx = html.search(/mecz,/i);
console.log("mecz, idx", idx);
if (idx >= 0) console.log(html.slice(idx - 80, idx + 120));
const wynik = html.match(/class="wynik"[\s\S]{0,400}/i);
if (wynik) console.log("\nwynik sample", wynik[0].replace(/\s+/g, " ").slice(0, 400));
