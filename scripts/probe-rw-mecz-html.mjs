#!/usr/bin/env node
const urls = [
  "https://regiowyniki.pl/mecz/252833/Pilka_Nozna/Dolnoslaskie/Klasa_B/",
  "https://regiowyniki.pl/mecz/205939/Pilka_Nozna/Dolnoslaskie/Klasa_B/",
];
const UA = { "User-Agent": "Mozilla/5.0" };

for (const url of urls) {
  const html = await fetch(url, { headers: UA }).then((r) => r.text());
  console.log("\n===", url, "len", html.length);
  for (const kw of ["bramk", "goal", "soccer-ball", "fa-futbol", "strzel", "Gol", "event-goal", "timeline"]) {
    const c = (html.match(new RegExp(kw, "gi")) ?? []).length;
    if (c) console.log(" ", kw, c);
  }
  const meczLinks = [...html.matchAll(/\/mecz\/(\d+)\//g)].map((m) => m[1]);
  console.log(" mecz ids in page", [...new Set(meczLinks)].slice(0, 5));
  // sample around Grzegorek
  const idx = html.indexOf("Grzegorek");
  if (idx >= 0) console.log(html.slice(idx - 200, idx + 300).replace(/\s+/g, " "));
}

const teamHtml = await fetch(
  "https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/Wroclaw_VII/",
  { headers: UA },
).then((r) => r.text());
const matchIds = [...teamHtml.matchAll(/\/mecz\/(\d+)\//g)].map((m) => m[1]);
console.log("\nTeam page match ids:", [...new Set(matchIds)].length, [...new Set(matchIds)].slice(0, 15));
