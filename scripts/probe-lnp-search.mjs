#!/usr/bin/env node
/** Szukaj UUID drużyny / play w HTML ŁNP i regionalnyfutbol */
const UA = { "User-Agent": "Mozilla/5.0 (compatible; PiorunSync/1.0)" };

const urls = [
  "https://www.laczynaspilka.pl/rozgrywki",
  "https://www.laczynaspilka.pl/rozgrywki/szukaj?q=Mietk%C3%B3w",
  "https://www.laczynaspilka.pl/rozgrywki/szukaj?q=GLKS%20Mietk%C3%B3w",
  "https://regionalnyfutbol.pl/klub/glks-mietkow/",
  "https://regionalnyfutbol.pl/klub/glks-mietkow/wyniki/",
];

for (const url of urls) {
  const r = await fetch(url, { headers: UA, redirect: "follow" });
  const html = await r.text();
  const uuids = [...new Set(html.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [])];
  const hasMietk = /mietk|wawrz/i.test(html);
  console.log("\n", url, "status", r.status, "len", html.length, "mietk", hasMietk, "uuids", uuids.length);
  if (uuids.length) console.log("  sample", uuids.slice(0, 8));
  const playIds = [...html.matchAll(/play[s]?\/([0-9a-f-]{36})/gi)].map((m) => m[1]);
  if (playIds.length) console.log("  playIds", [...new Set(playIds)].slice(0, 5));
}
