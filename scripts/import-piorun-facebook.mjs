#!/usr/bin/env node
import { chromium } from "playwright";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "club-media");
const FB_PROFILE = "https://www.facebook.com/profile.php?id=61560486822886";

const MEDIA_TO_FILE = {
  "709844503": "cover.jpg",
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
  "news-transfers.jpg": "cover.jpg",
  "news-sponsors.jpg": "hero-match.jpg",
  "gallery-01.jpg": "hero-team.jpg",
  "gallery-02.jpg": "hero-match.jpg",
  "gallery-03.jpg": "team-u18.jpg",
  "gallery-04.jpg": "cover.jpg",
  "gallery-05.jpg": "team-seniors.jpg",
  "gallery-06.jpg": "academy-kids.jpg",
  "gallery-07.jpg": "team-u12.jpg",
  "gallery-08.jpg": "team-youth.jpg",
  "placeholder.jpg": "hero-stadium.jpg",
};

mkdirSync(outDir, { recursive: true });

const captured = new Map();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("response", async (response) => {
  const url = response.url();
  if (!url.includes("scontent") || !url.includes(".jpg")) return;
  if (response.status() !== 200) return;
  const match = url.match(/\/(\d+)_(\d+)_/);
  if (!match) return;
  const mediaId = match[1];
  if (captured.has(mediaId)) return;
  try {
    const body = await response.body();
    if (body.length > 5000) captured.set(mediaId, body);
  } catch {
    /* response body unavailable */
  }
});

console.log("Loading Facebook profile…");
await page.goto(FB_PROFILE, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
await page.waitForTimeout(2000);

console.log(`Captured ${captured.size} unique images from network`);

let ok = 0;
for (const [mediaId, file] of Object.entries(MEDIA_TO_FILE)) {
  const body = captured.get(mediaId);
  if (!body) {
    console.error(`MISSING ${file} (media ${mediaId})`);
    continue;
  }
  writeFileSync(join(outDir, file), body);
  console.log(`OK ${file} (${body.length} bytes)`);
  ok++;
}

// Logo profilowe — największe z małych obrazów (typowo herb/avatar strony)
const profileCandidates = [...captured.entries()]
  .filter(([id]) => !Object.keys(MEDIA_TO_FILE).includes(id))
  .sort((a, b) => b[1].length - a[1].length);
if (profileCandidates.length > 0) {
  const [, logoBody] = profileCandidates[0];
  writeFileSync(join(outDir, "club-logo.jpg"), logoBody);
  console.log(`OK club-logo.jpg (${logoBody.length} bytes)`);
} else {
  copyFileSync(join(outDir, "hero-team.jpg"), join(outDir, "club-logo.jpg"));
  console.log("COPY club-logo.jpg ← hero-team.jpg");
}

await browser.close();

for (const [target, source] of Object.entries(DERIVED)) {
  try {
    copyFileSync(join(outDir, source), join(outDir, target));
    console.log(`COPY ${target} ← ${source}`);
  } catch {
    console.error(`SKIP ${target}`);
  }
}

console.log(`\nDone — downloaded ${ok}/${Object.keys(MEDIA_TO_FILE).length}`);
