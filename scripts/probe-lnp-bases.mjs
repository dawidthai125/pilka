#!/usr/bin/env node
const t = await fetch("https://www.laczynaspilka.pl/rozgrywki/230.436e9406b7642c84.js", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());

const comp = t.match(/apiCompetition:"([^"]+)"/);
const api = [...t.matchAll(/api:"([^"]+)"/g)].map((m) => m[1]);
console.log("apiCompetition", comp?.[1]);
console.log("api unique", [...new Set(api)]);
