#!/usr/bin/env node
const t = await fetch("https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());
const tabs = [...t.matchAll(/href="(\/druzyna[^"]+)"/g)].map((m) => m[1]);
console.log([...new Set(tabs)]);
