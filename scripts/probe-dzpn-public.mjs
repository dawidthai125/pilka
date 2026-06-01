#!/usr/bin/env node
/**
 * PoC: publiczne źródła DZPN / Łączy nas piłkę — bez pusha do repo produkcyjnego.
 * Uruchom: node scripts/probe-dzpn-public.mjs
 */

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const UA =
  "Mozilla/5.0 (compatible; PilkaProbe/1.0; +https://github.com/dawidthai125/pilka)";

async function fetchText(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { "User-Agent": UA, ...(opts.headers ?? {}) },
  });
  return { ok: res.ok, status: res.status, url: res.url, text: await res.text() };
}

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const buf = Buffer.from(await res.arrayBuffer());
  return { ok: res.ok, status: res.status, url: res.url, buf, size: buf.length };
}

function extractLinks(html, pattern) {
  return [...html.matchAll(pattern)].map((m) => m[1] ?? m[0]);
}

function summarize(name, result) {
  console.log(`\n=== ${name} ===`);
  console.log(`HTTP ${result.status} | ${result.url} | ${result.text?.length ?? result.size} bytes`);
}

const report = { at: new Date().toISOString(), checks: [] };

function record(name, ok, details) {
  report.checks.push({ name, ok, details });
  console.log(ok ? "PASS" : "FAIL", "-", name, details ? JSON.stringify(details) : "");
}

console.log("Probe DZPN public sources — start");

// 1) Stara strona rozgrywek seniorskich (404 po redesignie?)
const seniors = await fetchText("https://dzpn.pl/rozgrywki/seniorskie/");
summarize("DZPN /rozgrywki/seniorskie/", seniors);
record("dzpn.seniors.page", seniors.ok, { status: seniors.status });

const xlsxOnPage = extractLinks(
  seniors.text,
  /https:\/\/dzpn\.pl\/wp-content\/uploads\/[^"'\s]+\.xlsx/gi,
);
record("dzpn.seniors.xlsxLinks", xlsxOnPage.length > 0, { count: xlsxOnPage.length, sample: xlsxOnPage.slice(0, 5) });

// 2) WordPress REST — media xlsx
const mediaRes = await fetchText(
  "https://dzpn.pl/wp-json/wp/v2/media?per_page=100&mime_type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
);
const media = JSON.parse(mediaRes.text);
summarize("DZPN WP media xlsx", mediaRes);
record("dzpn.wp.xlsxCount", Array.isArray(media), { count: media.length, files: media.map((m) => m.source_url) });

// 3) Dokumenty do pobrania
const docs = await fetchText("https://dzpn.pl/dokumenty-do-pobrania/");
summarize("DZPN dokumenty", docs);
const docXlsx = extractLinks(docs.text, /https:\/\/dzpn\.pl\/wp-content\/uploads\/[^"'\s]+\.xlsx/gi);
record("dzpn.docs.xlsxLinks", docXlsx.length > 0, { count: docXlsx.length, files: docXlsx });

// 4) Pobierz pierwszy xlsx (jeśli jest) i sprawdź sygnaturę ZIP (xlsx)
let xlsxProbe = null;
const candidateUrl = docXlsx[0] ?? media[0]?.source_url;
if (candidateUrl) {
  const file = await fetchBuffer(candidateUrl);
  summarize("Download xlsx", { ...file, text: null });
  const isZip = file.buf[0] === 0x50 && file.buf[1] === 0x4b;
  xlsxProbe = { url: candidateUrl, size: file.size, isZip, ok: file.ok && isZip };
  record("dzpn.download.xlsx", xlsxProbe.ok, xlsxProbe);

  if (isZip) {
    // Minimalna weryfikacja: czy arkusz zawiera typowe słowa (bez biblioteki xlsx)
    const asText = file.buf.toString("latin1");
    const hints = ["B Klasa", "Terminarz", "Drużyna", "GLKS", "Mietk", "Kolejka", "Gospodarz"];
    const found = hints.filter((h) => asText.includes(h) || asText.toLowerCase().includes(h.toLowerCase()));
    record("dzpn.xlsx.contentHints", found.length > 0, { found, note: "Kalkulator ekwiwalentu ≠ terminarz" });
  }
}

// 5) Łączy nas piłka — chunk z API
const chunk = await fetchText("https://www.laczynaspilka.pl/rozgrywki/230.436e9406b7642c84.js");
summarize("LNP chunk 230", chunk);
const apiUrls = [...chunk.text.matchAll(/https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:\/[a-zA-Z0-9._~:/?#\[\]@!$&'()*+,;=-]*)?/g)]
  .map((m) => m[0])
  .filter((u) => /api|compet|rozgryw|extranet|gateway/i.test(u));
const uniqueApi = [...new Set(apiUrls)].slice(0, 30);
record("lnp.chunk.apiUrls", uniqueApi.length > 0, { uniqueApi });

// 6) Próba typowych endpointów LNP (jeśli znalezione w JS)
for (const url of uniqueApi.slice(0, 5)) {
  try {
    const r = await fetchText(url);
    record(`lnp.api.try:${url}`, r.ok, { status: r.status, preview: r.text.slice(0, 120) });
  } catch (e) {
    record(`lnp.api.try:${url}`, false, { error: String(e) });
  }
}

// 7) Extranet — tylko sprawdzenie publicznego dostępu
try {
  const extranet = await fetchText("https://extranet.pzpn.pl/");
  record("extranet.public", extranet.ok, { status: extranet.status, hasLogin: /login|zaloguj/i.test(extranet.text) });
} catch (e) {
  record("extranet.public", false, { error: String(e) });
}

writeFileSync(join(root, "tmp-dzpn-probe-report.json"), JSON.stringify(report, null, 2));
console.log("\nReport saved: tmp-dzpn-probe-report.json");

const pass = report.checks.filter((c) => c.ok).length;
const fail = report.checks.filter((c) => !c.ok).length;
console.log(`\nSummary: ${pass} pass, ${fail} fail / ${report.checks.length} checks`);
