#!/usr/bin/env node
const teamId = 2902;
const candidates = [
  `https://regiowyniki.pl/ajax/team/${teamId}/players`,
  `https://regiowyniki.pl/ajax/players.php?id=${teamId}`,
  `https://regiowyniki.pl/ajax/druzyna/${teamId}/kadra`,
  `https://regiowyniki.pl/ajax/kadra.php?id=${teamId}`,
  `https://regiowyniki.pl/ajax/getPlayers.php?team_id=${teamId}`,
];
for (const url of candidates) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "PilkaSync/1.0", Accept: "application/json" } });
    const t = await r.text();
    console.log(url, r.status, t.slice(0, 200));
  } catch (e) {
    console.log(url, "ERR", e.message);
  }
}
