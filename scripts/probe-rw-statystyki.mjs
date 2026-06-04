#!/usr/bin/env node
const url = "https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/statystyki/";
const html = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());
console.log("len", html.length);

const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
let n = 0;
for (const r of rows) {
  const row = r[1];
  if (!/<td/i.test(row)) continue;
  const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
    c[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, "").trim(),
  );
  if (cells.length < 3) continue;
  const name = cells[0];
  if (!name || name.length < 4 || /nazwisko|zawodnik/i.test(name)) continue;
  const nums = cells.slice(1).filter((c) => /^\d+$/.test(c));
  if (nums.length === 0 && !cells.some((c) => c)) continue;
  n++;
  if (n <= 15) console.log(name, "|", cells.join(" | "));
}
console.log("data rows", n);
