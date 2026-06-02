#!/usr/bin/env node
/**
 * Downloads photo-realistic demo assets for public club websites.
 * Uses Picsum (deterministic seed per asset key) — replace via CMS uploads.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "club-media");
fs.mkdirSync(outDir, { recursive: true });

const KEYS = [
  "hero-team",
  "hero-match",
  "hero-stadium",
  "team-seniors",
  "team-u18",
  "team-u12",
  "team-youth",
  "academy-training",
  "academy-kids",
  "academy-path",
  "news-matches",
  "news-club",
  "news-academy",
  "news-transfers",
  "news-sponsors",
  "placeholder",
  ...Array.from({ length: 8 }, (_, i) => `gallery-${String(i + 1).padStart(2, "0")}`),
];

async function download(key) {
  const url = `https://picsum.photos/seed/piorun-${key}/1600/900.jpg`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Failed ${key}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(outDir, `${key}.jpg`), buf);
  console.log(`OK ${key}.jpg`);
}

for (const key of KEYS) {
  await download(key);
}

console.log(`Done — ${KEYS.length} photos in public/club-media/`);
