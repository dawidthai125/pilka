#!/usr/bin/env node
const UA = { "User-Agent": "PilkaSync/1.0" };
const url = "https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,glks-mietkow.html";
const res = await fetch(url, { headers: UA });
const page = { status: res.status, text: await res.text() };
console.log("status", page.status, "len", page.text.length);
for (const kw of ["Błachowicz", "Grzegorek", "Mecze", "Gole", "Bramki", "kadra", "zawodnik", "statyst"]) {
  const c = (page.text.match(new RegExp(kw, "gi")) || []).length;
  if (c) console.log(kw, c);
}
const idx = page.text.search(/Grzegorek|Błachowicz|Bramk/i);
if (idx >= 0) console.log(page.text.slice(idx - 100, idx + 600).replace(/\s+/g, " "));
