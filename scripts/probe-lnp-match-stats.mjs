#!/usr/bin/env node
const UA = "Mozilla/5.0 (compatible; PiorunSync/1.0)";
const base = "https://competition-api-pro.laczynaspilka.pl/api/bus/competition/v1";

const matchId = "7ee91030-2d47-4f14-8b04-36ab66102bd6";

const paths = [
  "seasons/dictionaries",
  `matches/${matchId}`,
  `matches/${matchId}/events`,
  `matches/${matchId}/lineups`,
  `matches/${matchId}/squads`,
  `matches/${matchId}/players`,
  `matches/${matchId}/statistics`,
  `matches/${matchId}/details`,
  `matches/${matchId}/protocol`,
];

for (const p of paths) {
  const url = `${base}/${p}`;
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json", Origin: "https://www.laczynaspilka.pl" },
    });
    const t = await r.text();
    console.log("\n", r.status, p);
    console.log(t.slice(0, 600));
  } catch (e) {
    console.log("ERR", p, e.message);
  }
}

// Public laczynaspilka page - look for embedded JSON / API calls in main bundle
const page = await fetch(`https://www.laczynaspilka.pl/rozgrywki/mecz/${matchId}`, {
  headers: { "User-Agent": UA },
}).then((r) => r.text());
console.log("\npage len", page.length);
for (const kw of ["competition-api", "statistics", "goals", "player", "lineup", "sklad", "zawodnik"]) {
  const i = page.indexOf(kw);
  if (i >= 0) console.log(kw, "@", i, page.slice(i, i + 200));
}
