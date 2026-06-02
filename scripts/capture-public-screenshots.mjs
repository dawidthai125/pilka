#!/usr/bin/env node
/**
 * Screenshots lokalnej strony publicznej do porównania z mockupem.
 * Usage: node scripts/capture-public-screenshots.mjs [baseUrl]
 */
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "docs", "audit", "screenshots", "fb-layout-local");
const baseUrl = process.argv[2] ?? "http://localhost:3000";

mkdirSync(outDir, { recursive: true });

const { chromium } = await import("playwright");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

async function shot(name, options = {}) {
  const path = join(outDir, `${name}.png`);
  await page.screenshot({ path, fullPage: options.fullPage ?? false });
  console.log(`Saved: ${path}`);
}

console.log(`Capturing from ${baseUrl}...`);
await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);

await shot("01-homepage-full", { fullPage: true });

await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1000);

await shot("02-homepage-desktop");

const feedCol = page.locator("main .grid > div").first();
if (await feedCol.count()) {
  await feedCol.screenshot({ path: join(outDir, "03-feed-column.png") });
  console.log(`Saved: ${join(outDir, "03-feed-column.png")}`);
}

const sidebar = page.locator("main aside").first();
if (await sidebar.count()) {
  await sidebar.screenshot({ path: join(outDir, "04-sidebar.png") });
  console.log(`Saved: ${join(outDir, "04-sidebar.png")}`);
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1000);
await shot("05-mobile-full", { fullPage: true });
await shot("06-mobile-viewport");

await browser.close();
console.log(`\nDone — ${outDir}`);
