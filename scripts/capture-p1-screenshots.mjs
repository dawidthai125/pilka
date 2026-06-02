#!/usr/bin/env node
/**
 * Lokalne screenshoty po P1 Real Content Sprint.
 * Wymaga: npm run dev na localhost:3000
 */
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "docs", "audit", "screenshots", "p1-real-content");
const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";

const shots = [
  { name: "homepage", path: "/", fullPage: true },
  { name: "aktualnosci", path: "/aktualnosci", fullPage: true },
  { name: "akademia", path: "/aktualnosci/akademia-pioruna-zapisy", fullPage: true },
  { name: "galeria", path: "/galeria/mecze-2026", fullPage: true },
];

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

for (const shot of shots) {
  const url = `${baseUrl}${shot.path}`;
  console.log(`Capturing ${shot.name} → ${url}`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: join(outDir, `${shot.name}.png`),
    fullPage: shot.fullPage,
  });
  console.log(`  OK ${shot.name}.png`);
}

await browser.close();
console.log(`\nScreenshots saved to ${outDir}`);
