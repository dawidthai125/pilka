#!/usr/bin/env node
const UA = { "User-Agent": "Mozilla/5.0 (compatible; PiorunSync/1.0)" };

const urls = [
  "http://www.90minut.pl/skarb.php?id_klub=3824&id_sezon=107",
  "http://www.90minut.pl/skarb.php?id_klub=3824&id_sezon=91",
  "http://www.90minut.pl/liga/1/liga14526,strzelcy.html",
];

for (const url of urls) {
  const r = await fetch(url, { headers: UA });
  const t = await r.text();
  console.log("\n===", r.status, url, t.length);
  const rows = [...t.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi)].filter((m) =>
    /<td[^>]*>\s*\d+\s*<\/td>/.test(m[0]) && /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(m[0]),
  );
  console.log("data rows", rows.length);
  for (const row of rows.slice(0, 5)) {
    console.log(row[0].replace(/\s+/g, " ").slice(0, 300));
  }
}

// Parse skarb if found
const skarb = await fetch("http://www.90minut.pl/skarb.php?id_klub=3824&id_sezon=107", { headers: UA }).then((r) => r.text());
const playerRe =
  /<tr[^>]*>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>/gi;
let m;
const players = [];
while ((m = playerRe.exec(skarb)) !== null) {
  players.push({
    num: m[1],
    name: m[2].replace(/<[^>]+>/g, "").trim(),
    c3: m[3],
    c4: m[4],
    c5: m[5],
    c6: m[6],
    c7: m[7],
  });
}
console.log("\nparsed players", players.length);
for (const p of players.slice(0, 10)) console.log(p);
