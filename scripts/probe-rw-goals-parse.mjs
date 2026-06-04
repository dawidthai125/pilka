#!/usr/bin/env node
const html = await fetch("https://regiowyniki.pl/mecz/252833/Pilka_Nozna/Dolnoslaskie/Klasa_B/", {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());

const rows = [...html.matchAll(/<tr>[\s\S]*?imagemap goal[\s\S]*?<\/tr>/gi)];
console.log("goal rows", rows.length);
for (const row of rows) {
  const r = row[0];
  const leftIdx = r.indexOf('class="left"');
  const goalIdx = r.indexOf("imagemap goal");
  const side = leftIdx >= 0 && leftIdx < goalIdx ? "HOME" : "AWAY";
  const name = r.match(/details[^>]*>([^<]+)</)?.[1]?.trim();
  console.log(side, name);
}
