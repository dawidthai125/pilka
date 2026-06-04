#!/usr/bin/env node
const BASE = "https://competition-api-pro.laczynaspilka.pl/api/bus/competition/v1/";
const paths = [
  "seasons/dictionaries",
  "leagues/dictionaries",
  "matches",
  "teams",
];

async function tryPath(path, token) {
  const headers = {
    Accept: "application/json",
    Origin: "https://www.laczynaspilka.pl",
    Referer: "https://www.laczynaspilka.pl/rozgrywki",
    "User-Agent": "PiorunLeagueSync/1.0",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { headers });
  const text = await res.text();
  console.log(path, token ? "token" : "no-token", res.status, text.slice(0, 120));
}

for (const p of paths) {
  await tryPath(p, false);
}
