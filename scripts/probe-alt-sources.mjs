#!/usr/bin/env node
const UA = { "User-Agent": "Mozilla/5.0 (compatible; PiorunSync/1.0)" };

const urls = [
  "https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,druzyny.html",
  "https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,strzelcy.html",
  "https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,statystyki.html",
  "https://regionalnyfutbol.pl/klub,glks-mietkow,sezon-2025-2026,statystyki.html",
  "https://regionalnyfutbol.pl/klub,glks-mietkow,sezon-2025-2026,kadra.html",
  "http://www.90minut.pl/skarb.php?id_klub=3824&id_sezon=107",
  "http://www.90minut.pl/liga/1/liga14526,strzelcy.html",
  "https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/Wroclaw_VII/statystyki/",
  "https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/Wroclaw_VII/kadra/",
];

for (const url of urls) {
  try {
    const r = await fetch(url, { headers: UA, redirect: "follow" });
    const t = await r.text();
    const mietk = /mietk/i.test(t);
    const goals = /Grzegorek|Konieczny|strzelc|bramk.*zawod|goals|liczba bramek/gi.test(t);
    const tables = (t.match(/<table/gi) ?? []).length;
    console.log(r.status, t.length, "mietk", mietk, "goalsKw", goals, "tables", tables, url.split("/").pop());
    if (goals && mietk) {
      const idx = t.search(/Grzegorek|strzelc|Bramki zawod/i);
      if (idx >= 0) console.log(" ", t.slice(idx, idx + 400).replace(/\s+/g, " "));
    }
  } catch (e) {
    console.log("ERR", url, e.message);
  }
}
