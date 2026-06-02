#!/usr/bin/env node
/**
 * Downloads football-themed demo assets for public club websites.
 * Curated Unsplash photos (pitch, team, stadium) — replace via CMS uploads.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "club-media");
fs.mkdirSync(outDir, { recursive: true });

const PITCH =
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&h=900&fit=crop&q=80";
const STADIUM =
  "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=1600&h=900&fit=crop&q=80";
const TEAM =
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1600&h=900&fit=crop&q=80";
const TRAINING =
  "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=1600&h=900&fit=crop&q=80";

/** Stable football-themed Unsplash crops (1600×900). */
const FOOTBALL_SOURCES = {
  cover: PITCH,
  "hero-stadium": STADIUM,
  "hero-team": TEAM,
  "hero-match": PITCH,
  "team-seniors": TEAM,
  "team-u18": TEAM,
  "team-u12": TRAINING,
  "team-youth": TRAINING,
  "academy-training": TRAINING,
  "academy-kids": TRAINING,
  "academy-path": PITCH,
  "news-matches": STADIUM,
  "news-club": TEAM,
  "news-academy": TRAINING,
  "news-transfers": PITCH,
  "news-sponsors": STADIUM,
  placeholder: PITCH,
  "gallery-01": STADIUM,
  "gallery-02": TEAM,
  "gallery-03": PITCH,
  "gallery-04": TRAINING,
  "gallery-05": TEAM,
  "gallery-06": STADIUM,
  "gallery-07": PITCH,
  "gallery-08": TRAINING,
};

async function download(key, url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Failed ${key}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(outDir, `${key}.jpg`), buf);
  console.log(`OK ${key}.jpg`);
}

for (const [key, url] of Object.entries(FOOTBALL_SOURCES)) {
  await download(key, url);
}

console.log(`Done — ${Object.keys(FOOTBALL_SOURCES).length} football photos in public/club-media/`);
