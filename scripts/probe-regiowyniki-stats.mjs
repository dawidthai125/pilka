#!/usr/bin/env node
const base = "https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/";
const paths = ["", "kadra/", "statystyki/", "strzelcy/", "wyniki/", "zawodnicy/"];
const UA = { "User-Agent": "Mozilla/5.0" };

for (const p of paths) {
  const url = base + p;
  const r = await fetch(url, { headers: UA, redirect: "follow" });
  const t = await r.text();
  const goals = (t.match(/>\s*\d+\s*</g) ?? []).length;
  console.log(p || "(root)", r.status, t.length, "Grzegorek", /grzegorek/i.test(t), "Bramki col", /Bramki|bramk/i.test(t));
  if (/grzegorek|strzelc|zawodnik.*bramk/i.test(t)) {
    const idx = t.search(/grzegorek|strzelc|Bramki/i);
    console.log(" ", t.slice(idx, idx + 400).replace(/\s+/g, " "));
  }
}
