#!/usr/bin/env node
const t = await fetch("https://www.laczynaspilka.pl/rozgrywki/230.436e9406b7642c84.js", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());
const templates = [...t.matchAll(/`\$\{n\.c\.appConfig\.urls\.apiCompetition\}([^`]+)`/g)].map((m) => m[1]);
const uniq = [...new Set(templates)];
for (const p of uniq.filter((x) => /point|scor|stat|goal|appear|card|minute/i.test(x))) console.log(p);
