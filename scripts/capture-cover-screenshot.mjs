#!/usr/bin/env node
/**
 * Header cover screenshot for before/after comparison.
 * Usage: node scripts/capture-cover-screenshot.mjs <url> <outputPath>
 */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const url = process.argv[2] ?? "http://localhost:3000";
const outputPath = process.argv[3] ?? "docs/audit/screenshots/cover-fix/after-header.png";

mkdirSync(dirname(outputPath), { recursive: true });

const { chromium } = await import("playwright");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1200);

const header = page.locator("header").first();
await header.screenshot({ path: outputPath });
console.log(`Saved: ${outputPath}`);

await browser.close();
