#!/usr/bin/env node
const t = await fetch("https://www.laczynaspilka.pl/rozgrywki/main.6ffcc8e3d2b153b7.js", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());
console.log("len", t.length);
const chunks = [...new Set([...t.matchAll(/230\.[a-f0-9]+\.js/g)].map((m) => m[0]))];
console.log("chunks", chunks);
const api = [...t.matchAll(/competition-api-pro[^"'`\s]{0,120}/g)].map((m) => m[0]);
console.log("api", [...new Set(api)].slice(0, 10));

if (chunks[0]) {
  const chunk = await fetch(`https://www.laczynaspilka.pl/rozgrywki/${chunks[0]}`, {
    headers: { "User-Agent": "PilkaSync/1.0" },
  }).then((r) => r.text());
  console.log("\nchunk len", chunk.length);
  const eps = [...chunk.matchAll(/\$\{[^}]+\}([^`$]{1,80})/g)].map((m) => m[1]);
  const interesting = [...new Set(eps)].filter(
    (p) => /player|stat|scor|club|team|match|squad|lineup|goal/i.test(p),
  );
  console.log("endpoint fragments", interesting.slice(0, 40));
}
