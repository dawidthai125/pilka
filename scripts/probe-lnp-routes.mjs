#!/usr/bin/env node
const t = await fetch("https://www.laczynaspilka.pl/rozgrywki/230.436e9406b7642c84.js", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());

const routes = [...t.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
const uniq = [...new Set(routes)].filter((r) => /team|club|player|druzyn|klub|stat|mecz/i.test(r));
console.log("routes", uniq.slice(0, 40));

const nav = [...t.matchAll(/routerLink[^}]{0,120}/g)].map((m) => m[0]).slice(0, 5);
console.log("router samples", nav);
