#!/usr/bin/env node
/** Extract API paths from laczynaspilka rozgrywki main bundle. */
const UA = "Mozilla/5.0 (compatible; PiorunSync/1.0)";
const home = await fetch("https://www.laczynaspilka.pl/rozgrywki", { headers: { "User-Agent": UA } }).then((r) => r.text());
const scripts = [...home.matchAll(/src="(\/rozgrywki\/[^"]+\.js)"/g)].map((m) => m[1]);
console.log("scripts", scripts.length, scripts.slice(0, 8));

for (const s of scripts.slice(0, 3)) {
  const js = await fetch("https://www.laczynaspilka.pl" + s, { headers: { "User-Agent": UA } }).then((r) => r.text());
  const routes = [...js.matchAll(/path:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const teamRoutes = routes.filter((r) => /druzyn|klub|zawodnik|mecz|team|player/i.test(r));
  console.log("\n", s, "len", js.length, "team routes:", teamRoutes.slice(0, 20));
}

const chunk230 = await fetch("https://www.laczynaspilka.pl/rozgrywki/230.436e9406b7642c84.js", {
  headers: { "User-Agent": UA },
}).then((r) => r.text());

for (const re of [/drużyn[^"'`\s]{0,40}/gi, /teamId[^"'`\s]{0,60}/gi, /zawodnik[^"'`\s]{0,40}/gi]) {
  const m = [...new Set([...chunk230.matchAll(re)].map((x) => x[0]))].slice(0, 12);
  if (m.length) console.log("\n", re.source, m);
}
