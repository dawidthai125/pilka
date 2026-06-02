#!/usr/bin/env node
import { chromium } from "playwright";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "club-media");
const FB_PROFILE = "https://www.facebook.com/profile.php?id=61560486822886";
const FB_PHOTOS = `${FB_PROFILE}&sk=photos`;

/** Grafiki / foty klubu — sloty kart (news, galeria, drużyny). NIE cover. */
const MEDIA_TO_FILE = {
  "711680094": "hero-team.jpg",
  "711426046": "hero-match.jpg",
  "707928973": "hero-stadium.jpg",
  "709636527": "team-seniors.jpg",
  "711406268": "team-u18.jpg",
  "707946466": "team-u12.jpg",
  "709448253": "team-youth.jpg",
  "709680263": "academy-kids.jpg",
};

const DERIVED = {
  "academy-training.jpg": "team-seniors.jpg",
  "academy-path.jpg": "team-u18.jpg",
  "news-matches.jpg": "hero-team.jpg",
  "news-club.jpg": "hero-stadium.jpg",
  "news-academy.jpg": "academy-kids.jpg",
  "news-transfers.jpg": "team-seniors.jpg",
  "news-sponsors.jpg": "hero-match.jpg",
  "gallery-01.jpg": "hero-team.jpg",
  "gallery-02.jpg": "hero-match.jpg",
  "gallery-03.jpg": "team-u18.jpg",
  "gallery-04.jpg": "team-seniors.jpg",
  "gallery-05.jpg": "team-seniors.jpg",
  "gallery-06.jpg": "academy-kids.jpg",
  "gallery-07.jpg": "team-u12.jpg",
  "gallery-08.jpg": "team-youth.jpg",
};

function trackCapture(captured, mediaId, body) {
  const prev = captured.get(mediaId);
  if (!prev || body.length > prev.length) {
    captured.set(mediaId, body);
  }
}

async function scrollPage(page, passes = 6) {
  for (let i = 0; i < passes; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.2));
    await page.waitForTimeout(1200);
  }
}

mkdirSync(outDir, { recursive: true });

const captured = new Map();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

page.on("response", async (response) => {
  const url = response.url();
  if (!url.includes("scontent") || !url.includes(".jpg")) return;
  if (response.status() !== 200) return;
  const match = url.match(/\/(\d+)_(\d+)_/);
  if (!match) return;
  try {
    const body = await response.body();
    if (body.length < 3000) return;
    trackCapture(captured, match[1], body);
  } catch {
    /* unavailable */
  }
});

for (const url of [FB_PROFILE, FB_PHOTOS]) {
  console.log("Loading", url);
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
  await scrollPage(page);
}

console.log(`Captured ${captured.size} media IDs (largest per ID)`);

let ok = 0;
for (const [mediaId, file] of Object.entries(MEDIA_TO_FILE)) {
  const body = captured.get(mediaId);
  if (!body) {
    console.error(`MISSING ${file} (media ${mediaId})`);
    continue;
  }
  writeFileSync(join(outDir, file), body);
  console.log(`OK ${file} (${Math.round(body.length / 1024)} KB)`);
  ok++;
}

const profileCandidates = [...captured.entries()]
  .filter(([id]) => !Object.keys(MEDIA_TO_FILE).includes(id))
  .sort((a, b) => b[1].length - a[1].length);

if (profileCandidates.length > 0 && profileCandidates[0][1].length >= 15000) {
  writeFileSync(join(outDir, "club-logo.jpg"), profileCandidates[0][1]);
  console.log(`OK club-logo.jpg (${Math.round(profileCandidates[0][1].length / 1024)} KB)`);
} else {
  console.log("SKIP club-logo.jpg — brak wystarczająco dużego herbu z FB");
}

await browser.close();

for (const [target, source] of Object.entries(DERIVED)) {
  try {
    copyFileSync(join(outDir, source), join(outDir, target));
  } catch {
    console.error(`SKIP ${target}`);
  }
}

console.log(`\nDone — ${ok}/${Object.keys(MEDIA_TO_FILE).length} FB card assets`);
console.log("Uruchom: node scripts/overlay-banner-media.mjs  (ostre banery cover/hero)");
