#!/usr/bin/env node
const t = await fetch("https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/mecze/", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());
const allLinks = [...t.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
const unique = [...new Set(allLinks)].filter((h) => /mecz|relac|wynik|spotkan/i.test(h));
console.log("filtered links", unique.length);
console.log(unique.slice(0, 20));
// also look for onclick or data-href
const onclick = [...t.matchAll(/onclick="[^"]*(\/[^'"]+)"/gi)].map((m) => m[1]);
console.log("onclick", onclick.slice(0, 10));
