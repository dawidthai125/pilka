#!/usr/bin/env node
const t = await fetch("https://www.laczynaspilka.pl/rozgrywki/230.436e9406b7642c84.js", {
  headers: { "User-Agent": "PilkaSync/1.0" },
}).then((r) => r.text());

for (const kw of [
  "matchesPlayed",
  "appearances",
  "goalsScored",
  "yellowCards",
  "redCards",
  "minutesPlayed",
  "playedMinutes",
  "benchEntries",
  "GET_TEAM_PLAYERS",
  "TeamPlayer",
  "PlayerSeasonStats",
]) {
  const re = new RegExp(kw + "[^\\n]{0,120}", "g");
  const m = [...t.matchAll(re)].slice(0, 5).map((x) => x[0]);
  if (m.length) console.log("\n", kw, ":\n", m.join("\n"));
}
