#!/usr/bin/env node
import { aggregateGoalsFromRegiowynikiMatches } from "./lib/regiowyniki-match-goals.mjs";

const names = [
  "Grzegorek Marsel",
  "Konieczny Szymon",
  "Chwastyk Piotr",
  "Janduła Maciej",
  "Jakubczak Franciszek",
  "Kałamarz Krzysztof",
  "Błachowicz Dominik",
  "Mikulski Cyprian",
];
const r = await aggregateGoalsFromRegiowynikiMatches(names, { delayMs: 80 });
console.log("matches", r.matchIds, "scorers", r.players.filter((p) => p.goals > 0).length);
for (const p of r.players.filter((x) => x.goals > 0).sort((a, b) => b.goals - a.goals)) {
  console.log(`  ${p.leaguePlayerName}: ${p.goals} g (${p.matchCount} meczów)`);
}
const total = r.players.reduce((s, p) => s + p.goals, 0);
console.log("sum goals", total, "(drużyna łącznie ~24 wg tabeli)");
