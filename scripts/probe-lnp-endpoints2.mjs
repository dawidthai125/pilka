#!/usr/bin/env node
const t = await fetch("https://www.laczynaspilka.pl/rozgrywki/230.436e9406b7642c84.js", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());
console.log("len", t.length);

const templates = [...t.matchAll(/`\$\{n\.c\.appConfig\.urls\.apiCompetition\}([^`]+)`/g)].map((m) => m[1]);
const uniq = [...new Set(templates)];
console.log("total templates", uniq.length);

const playerRelated = uniq.filter((p) =>
  /player|stat|scor|club|team|participant|squad|lineup|goal|appear|card|minute/i.test(p),
);
console.log("\nPlayer-related endpoints:");
for (const p of playerRelated) console.log(" ", p);

const base = "https://competition-api-pro.laczynaspilka.pl/api/bus/competition/v1";
const staticPaths = uniq.filter((p) => !p.includes("{") && !p.includes("$"));
console.log("\nTrying static paths:", staticPaths.length);
for (const p of staticPaths.slice(0, 20)) {
  const r = await fetch(base + p, {
    headers: { Accept: "application/json", "User-Agent": "PilkaSync/1.0", Origin: "https://www.laczynaspilka.pl" },
  });
  console.log(r.status, p, (await r.text()).slice(0, 120));
}
