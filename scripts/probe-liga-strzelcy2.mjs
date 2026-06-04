#!/usr/bin/env node
const t = await fetch("http://www.90minut.pl/liga/1/liga14526.html", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());

const markers = ["Strzelcy", "strzelcy", "id=\"strzelcy\"", "name=\"strzelcy\""];
for (const m of markers) {
  let i = 0,
    c = 0;
  while ((i = t.indexOf(m, i)) !== -1 && c < 2) {
    console.log("\n---", m, "at", i, "---\n");
    console.log(t.slice(i, i + 5000));
    i += m.length;
    c++;
  }
}

// Also search for Mietków near goal scorer patterns
const mietkMatches = [...t.matchAll(/<tr[^>]*>[\s\S]{0,2000}?Mietk[\s\S]{0,2000}?<\/tr>/gi)];
console.log("\nMietk rows:", mietkMatches.length);
for (const m of mietkMatches.slice(0, 3)) console.log(m[0].slice(0, 800));
