#!/usr/bin/env node
import { writeFileSync } from "fs";
const url = "https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/statystyki/";
const html = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());
writeFileSync("tmp-rw-stat.html", html);
const idx = html.search(/Bramki|bramk|Strzelcy|Wyst/i);
console.log("marker idx", idx);
if (idx >= 0) console.log(html.slice(idx - 200, idx + 800).replace(/\s+/g, " "));
console.log("Grzegorek count", (html.match(/Grzegorek/gi) ?? []).length);
// div-based?
const cards = html.match(/class="[^"]*stat[^"]*"/gi);
console.log("stat classes", cards?.slice(0, 10));
