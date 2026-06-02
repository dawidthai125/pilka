#!/usr/bin/env node
/**
 * Wysokiej jakości banery (1600×900) — cover i hero sloty.
 * Używane gdy miniatury FB są za małe na pełną szerokość nagłówka.
 * Grafiki meczowe FB zostają w news/galerii (mniejsze karty).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "club-media");
fs.mkdirSync(outDir, { recursive: true });

const PITCH =
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&h=900&fit=crop&q=85";
const STADIUM =
  "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=1600&h=900&fit=crop&q=85";
const TEAM =
  "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1600&h=900&fit=crop&q=85";

/** Tylko sloty pomocnicze — cover.jpg to własna grafika mockupowa (nie nadpisywać). */
const BANNER_KEYS = {
  "hero-stadium": STADIUM,
  "hero-team": TEAM,
  "hero-match": PITCH,
  placeholder: PITCH,
};

async function download(key, url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Failed ${key}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(outDir, `${key}.jpg`), buf);
  console.log(`OK ${key}.jpg (${Math.round(buf.length / 1024)} KB)`);
}

for (const [key, url] of Object.entries(BANNER_KEYS)) {
  await download(key, url);
}

console.log(`Done — ${Object.keys(BANNER_KEYS).length} banner assets`);
