#!/usr/bin/env node
const UA = { "User-Agent": "Mozilla/5.0" };
const html = await fetch(
  "https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,tabela-terminarz.html",
  { headers: UA },
).then((r) => r.text());
const links = [...html.matchAll(/href="([^"]*mecz,[^"]+)"/gi)].map((m) => m[1]);
console.log("mecz links", links.length, links[0]);
const full = links[0].startsWith("http") ? links[0] : `https://regionalnyfutbol.pl${links[0]}`;
const p = await fetch(full, { headers: UA }).then((r) => r.text());
console.log("page", full, "len", p.length);
for (const kw of ["strzel", "bramk", "Gol", "skład", "zdarzen", "wydarzen", "protocol", "minuta"]) {
  const i = p.search(new RegExp(kw, "i"));
  if (i >= 0) console.log("\n", kw, p.slice(i, i + 350).replace(/\s+/g, " "));
}
