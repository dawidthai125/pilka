#!/usr/bin/env node
const t = await fetch("https://www.laczynaspilka.pl/rozgrywki/230.436e9406b7642c84.js", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());

for (const re of [/client[_-]?id[^"'`\s]{0,40}/gi, /api[_-]?key[^"'`\s]{0,40}/gi, /Bearer[^"'`\s]{0,40}/gi, /Authorization[^"'`\s]{0,60}/gi]) {
  const m = [...new Set([...t.matchAll(re)].map((x) => x[0]))].slice(0, 8);
  if (m.length) console.log(re.source, m);
}

// How does frontend attach auth?
for (const kw of ["interceptor", "getAccessToken", "keycloak", "oauth", "clientSecret"]) {
  const i = t.indexOf(kw);
  if (i >= 0) console.log(kw, "found at", i);
}
