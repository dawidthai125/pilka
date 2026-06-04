#!/usr/bin/env node
const t = await fetch("https://www.laczynaspilka.pl/rozgrywki/230.436e9406b7642c84.js", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());

const templates = [...t.matchAll(/`\$\{[^}]+\}([^`]+)`/g)].map((m) => m[1]);
const uniq = [...new Set(templates)];
console.log("all paths", uniq.length);
for (const p of uniq) console.log(p);
