#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "Mozilla/5.0 (compatible; PilkaProbe/2.0)";

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  return { ok: res.ok, status: res.status, url: res.url, text: await res.text() };
}

function fileLinks(html) {
  return [...new Set([...html.matchAll(/https:\/\/dzpn\.pl\/wp-content\/uploads\/[^"'\\s<>]+\\.(xlsx|xls|csv|pdf|json)/gi)].map((m) => m[0]))];
}

async function wpSearch(term) {
  const url = `https://dzpn.pl/wp-json/wp/v2/posts?search=${encodeURIComponent(term)}&per_page=20`;
  const res = await get(url);
  if (!res.ok) return [];
  const data = JSON.parse(res.text);
  return (Array.isArray(data) ? data : []).map((p) => ({
    title: p.title?.rendered?.replace(/<[^>]+>/g, "") ?? "",
    link: p.link,
    date: p.date,
  }));
}

async function wpMedia(mime, search = "") {
  const q = new URLSearchParams({ per_page: "100", ...(mime ? { mime_type: mime } : {}), ...(search ? { search } : {}) });
  const res = await get(`https://dzpn.pl/wp-json/wp/v2/media?${q}`);
  if (!res.ok) return [];
  const data = JSON.parse(res.text);
  return (Array.isArray(data) ? data : []).map((m) => ({
    title: m.title?.rendered ?? m.slug,
    url: m.source_url,
    date: m.date,
  }));
}

async function main() {
  const report = { at: new Date().toISOString(), searches: {}, paths: [], media: {}, lnp: {} };

  for (const term of ["B klasa", "terminarz", "tabela", "Mietków", "Wrocław B", "rozgrywki senior"]) {
    report.searches[term] = await wpSearch(term);
  }

  report.media.pdf = await wpMedia("application/pdf", "terminarz");
  report.media.pdfAll = (await wpMedia("application/pdf")).slice(0, 30);
  report.media.xlsx = await wpMedia("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  report.media.xlsxSearch = await wpMedia("", "terminarz");

  const paths = [
    "/",
    "/rozgrywki/",
    "/dokumenty-do-pobrania/",
    "/category/aktualnosci/",
    "/aktualnosci/",
    "/komunikaty/",
    "/strefa-wroclaw/",
    "/wroclaw/",
  ];
  for (const p of paths) {
    const res = await get(`https://dzpn.pl${p}`);
    const files = fileLinks(res.text);
    const hints = ["B Klasa", "Terminarz", "Tabela", "Mietk", "GLKS", "laczynaspilka", "rozgrywki"];
    const found = hints.filter((h) => res.text.includes(h));
    report.paths.push({ path: p, status: res.status, files: files.slice(0, 20), hints: found });
  }

  const lnpPages = [
    "https://www.laczynaspilka.pl/rozgrywki",
    "https://www.laczynaspilka.pl/rozgrywki/wyniki",
    "https://www.laczynaspilka.pl/rozgrywki/tabela",
  ];
  for (const url of lnpPages) {
    const res = await get(url);
    report.lnp[url] = {
      status: res.status,
      hasCompetitionApi: res.text.includes("competition-api"),
      hasMietkow: /mietk/i.test(res.text),
      hasBklasa: /b\\s*klasa/i.test(res.text),
      preview: res.text.slice(0, 500),
    };
  }

  const apiRes = await get(
    "https://competition-api-pro.laczynaspilka.pl/api/bus/competition/v1/seasons/dictionaries",
  );
  report.lnp.competitionApi = { status: apiRes.status, preview: apiRes.text.slice(0, 200) };

  writeFileSync(join(root, "tmp-dzpn-league-deep.json"), JSON.stringify(report, null, 2));

  console.log("=== WP search hits (terminarz/tabela/B klasa) ===");
  for (const term of ["terminarz", "tabela", "B klasa", "Mietków"]) {
    const hits = report.searches[term] ?? [];
    console.log(`\n${term}: ${hits.length}`);
    hits.slice(0, 5).forEach((h) => console.log(`  - ${h.title} | ${h.link}`));
  }

  console.log("\n=== Media PDF (terminarz search) ===");
  report.media.pdf.forEach((m) => console.log(`  - ${m.title} | ${m.url}`));

  console.log("\n=== All XLSX on DZPN ===");
  report.media.xlsx.forEach((m) => console.log(`  - ${m.title} | ${m.url}`));

  console.log("\n=== Path file links ===");
  for (const p of report.paths) {
    if (p.files.length) console.log(p.path, p.files);
  }

  console.log("\n=== LNP API ===", report.lnp.competitionApi);
  console.log("\nSaved tmp-dzpn-league-deep.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
