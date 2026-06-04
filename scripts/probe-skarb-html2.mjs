#!/usr/bin/env node
const t = await fetch("http://www.90minut.pl/skarb.php?id_klub=3824&id_sezon=107", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());

const idx = t.indexOf("Mecze");
console.log(t.slice(idx - 500, idx + 4000).replace(/\s+/g, " "));
