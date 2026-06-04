#!/usr/bin/env node
const UA = { "User-Agent": "Mozilla/5.0 (compatible; PiorunLeagueSync/1.0)" };

const liga = await fetch("http://www.90minut.pl/liga/1/liga14526.html", { headers: UA }).then((r) => r.text());
const rozg = [...liga.matchAll(/id_rozgrywki=(\d+)/gi)].map((m) => m[1]);
console.log("id_rozgrywki on liga page:", [...new Set(rozg)]);

for (const id of [...new Set(rozg)].slice(0, 5)) {
  const url = `http://www.90minut.pl/skarb.php?id_rozgrywki=${id}`;
  const html = await fetch(url, { headers: UA }).then((r) => r.text());
  const mietk = html.search(/mietk/i);
  const grzeg = html.search(/Grzegorek|grzegorek/i);
  console.log(`\nskarb id_rozgrywki=${id} len=${html.length} mietk@${mietk} grzeg@${grzeg}`);
  if (mietk >= 0) {
    console.log(html.slice(mietk - 100, mietk + 400).replace(/\s+/g, " "));
  }
}

// skarb klub
const skarb = await fetch("http://www.90minut.pl/skarb.php?id_klub=3824&id_sezon=107", { headers: UA }).then((r) => r.text());
console.log("\nclub skarb len", skarb.length);
const rows = [...skarb.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
let n = 0;
for (const r of rows) {
  if (!/<a[^>]*>/.test(r[1])) continue;
  const name = r[1].match(/<a[^>]*>([^<]{4,50})</)?.[1];
  if (!name || /skarb|liga|strona/i.test(name)) continue;
  const nums = [...r[1].matchAll(/>\s*(\d+)\s*</g)].map((x) => x[1]);
  if (nums.length >= 4) {
    n++;
    if (n <= 8) console.log(name, nums.join(","));
  }
}
