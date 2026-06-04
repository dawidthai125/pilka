#!/usr/bin/env node
const html = await fetch("https://www.laczynaspilka.pl/rozgrywki", {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());

const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
console.log("scripts", scripts.length);
for (const s of scripts.slice(0, 15)) console.log(s);

// main chunk
const main = scripts.find((s) => s.includes("main") || s.includes("230"));
if (main) {
  const url = main.startsWith("http") ? main : `https://www.laczynaspilka.pl${main.startsWith("/") ? "" : "/rozgrywki/"}${main.replace(/^\//, "")}`;
  const js = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());
  for (const pat of ["apiKey", "clientId", "Bearer", "competition-api", "bus20", "anonymous", "token"]) {
    const idx = js.search(new RegExp(pat, "i"));
    if (idx >= 0) console.log(pat, "@", idx, js.slice(idx, idx + 120).replace(/\s+/g, " "));
  }
}
