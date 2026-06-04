#!/usr/bin/env node
const TEAM = "312e40bc-a65a-4558-ad00-d1edccc66e60";
const html = await fetch(`https://www.laczynaspilka.pl/rozgrywki/druzyna/${TEAM}`, {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());

const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
console.log("scripts", scripts.length);
const main = scripts.find((s) => /main|polyfills|230/.test(s)) ?? scripts[0];
const url = main?.startsWith("http") ? main : `https://www.laczynaspilka.pl${main.startsWith("/") ? "" : "/rozgrywki/"}${main.replace(/^\//, "")}`;
console.log("fetch", url);
const js = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());

const needles = ["points", "statistics", "goals", "seasons", "leagues", "stats", "druzyna", "players"];
for (const n of needles) {
  const re = new RegExp(`teams/\\{[^}]+\\}/[a-zA-Z-]+|teams/[^\"'\`]+`, "g");
}
const paths = [...js.matchAll(/teams\/\{[^}]+\}\/[a-zA-Z][a-zA-Z-]*/g)].map((m) => m[0]);
const uniq = [...new Set(paths)];
console.log("team path templates:", uniq);
const playerPaths = [...js.matchAll(/players\/\{[^}]+\}[^\"'\`]{0,80}/g)].map((m) => m[0]);
console.log("player paths sample:", [...new Set(playerPaths)].slice(0, 15));
