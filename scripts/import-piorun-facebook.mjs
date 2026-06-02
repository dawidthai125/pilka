#!/usr/bin/env node
/**
 * Pobiera zdjęcia ze strony Facebook Piorun Wawrzeńczyce
 * https://www.facebook.com/profile.php?id=61560486822886
 * i zapisuje je w public/club-media/ (sloty website_media demo).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "club-media");

/** Źródło: publiczna strona FB klubu (maj 2026) */
const ASSETS = [
  {
    file: "cover.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/709844503_122207538746349560_3845596613405765556_n.jpg",
  },
  {
    file: "hero-team.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/711680094_122207668580349560_8145177813983376159_n.jpg",
  },
  {
    file: "hero-match.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/711426046_122207668622349560_3701997273605585172_n.jpg",
  },
  {
    file: "hero-stadium.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/707928973_122207265656349560_7446933156239972229_n.jpg",
  },
  {
    file: "team-seniors.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/709636527_122207538698349560_5459238903935465608_n.jpg",
  },
  {
    file: "team-u18.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/711406268_122207538794349560_8188936091959747855_n.jpg",
  },
  {
    file: "team-u12.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/707946466_122207317184349560_7397280964782881496_n.jpg",
  },
  {
    file: "team-youth.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/709448253_122207315438349560_1995495768905173840_n.jpg",
  },
  {
    file: "academy-kids.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/709680263_122207341466349560_110718948703214221_n.jpg",
  },
  {
    file: "academy-training.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/709636527_122207538698349560_5459238903935465608_n.jpg",
  },
  {
    file: "academy-path.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/711406268_122207538794349560_8188936091959747855_n.jpg",
  },
  {
    file: "news-matches.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/711680094_122207668580349560_8145177813983376159_n.jpg",
  },
  {
    file: "news-club.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/707928973_122207265656349560_7446933156239972229_n.jpg",
  },
  {
    file: "news-academy.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/709680263_122207341466349560_110718948703214221_n.jpg",
  },
  {
    file: "news-transfers.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/709844503_122207538746349560_3845596613405765556_n.jpg",
  },
  {
    file: "news-sponsors.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/711426046_122207668622349560_3701997273605585172_n.jpg",
  },
  {
    file: "gallery-01.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/711680094_122207668580349560_8145177813983376159_n.jpg",
  },
  {
    file: "gallery-02.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/711426046_122207668622349560_3701997273605585172_n.jpg",
  },
  {
    file: "gallery-03.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/711406268_122207538794349560_8188936091959747855_n.jpg",
  },
  {
    file: "gallery-04.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/709844503_122207538746349560_3845596613405765556_n.jpg",
  },
  {
    file: "gallery-05.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/709636527_122207538698349560_5459238903935465608_n.jpg",
  },
  {
    file: "gallery-06.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/709680263_122207341466349560_110718948703214221_n.jpg",
  },
  {
    file: "gallery-07.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/707946466_122207317184349560_7397280964782881496_n.jpg",
  },
  {
    file: "gallery-08.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/709448253_122207315438349560_1995495768905173840_n.jpg",
  },
  {
    file: "placeholder.jpg",
    url: "https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/707928973_122207265656349560_7446933156239972229_n.jpg",
  },
];

mkdirSync(outDir, { recursive: true });

for (const asset of ASSETS) {
  const response = await fetch(asset.url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://www.facebook.com/",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
  });
  if (!response.ok) {
    console.error(`FAIL ${asset.file}: HTTP ${response.status}`);
    continue;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(join(outDir, asset.file), buffer);
  console.log(`OK ${asset.file} (${buffer.length} bytes)`);
}

console.log(`\nDone — ${ASSETS.length} files in public/club-media/`);
