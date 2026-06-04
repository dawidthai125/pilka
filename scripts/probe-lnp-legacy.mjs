#!/usr/bin/env node
const UA = "Mozilla/5.0 (compatible; PiorunSync/1.0)";

// Legacy player URL pattern from LaczyNasPilka.API
const legacyUrls = [
  "https://www.laczynaspilka.pl/zawodnik/",
  "https://www.laczynaspilka.pl/rozgrywki/szukaj?query=GLKS%20Mietk%C3%B3w",
];

for (const url of legacyUrls) {
  const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  console.log("\n", r.status, url, "->", r.url);
  const t = await r.text();
  console.log("len", t.length);
  if (/Mietk|mietk/i.test(t)) {
    const idx = t.search(/Mietk/i);
    console.log(t.slice(idx - 80, idx + 400).replace(/\s+/g, " "));
  }
}

// Try old HTML player page format if we find a slug
const testPlayer = "https://www.laczynaspilka.pl/zawodnik/jan-kowalski,123857.html";
const pr = await fetch(testPlayer, { headers: { "User-Agent": UA } });
console.log("\nlegacy player", pr.status);
if (pr.ok) {
  const pt = await pr.text();
  console.log(pt.slice(0, 800).replace(/\s+/g, " "));
}

// New rozgrywki team URL patterns from bundle
for (const path of ["/rozgrywki/druzyna/", "/rozgrywki/klub/", "/rozgrywki/zawodnik/"]) {
  const r = await fetch("https://www.laczynaspilka.pl" + path, { headers: { "User-Agent": UA } });
  console.log("\n", r.status, path);
}
