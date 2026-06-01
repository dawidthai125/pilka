#!/usr/bin/env node
/**
 * Próba pobrania danych ligowych DZPN + fallback na publiczny mirror (regionalnyfutbol.pl).
 * Źródło mirror: dane zgodne z mPZPN / laczynaspilka.pl (deklaracja 90minut.pl).
 *
 * dzpn.pl — brak publicznych CSV/XLSX/PDF z tabelą B Klasy Wrocław VII.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "fixtures/league/live");
mkdirSync(outDir, { recursive: true });

const UA = "Mozilla/5.0 (compatible; PilkaImport/1.0)";
const LEAGUE_URL =
  "https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,tabela-terminarz.html";

const MONTHS = {
  stycznia: "01", lutego: "02", marca: "03", kwietnia: "04", maja: "05", czerwca: "06",
  lipca: "07", sierpnia: "08", września: "09", wrzesnia: "09", października: "10",
  pazdziernika: "10", listopada: "11", grudnia: "12",
};

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function parsePolishDate(text) {
  const m = text.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i);
  if (!m) return null;
  const mo = MONTHS[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${mo}-${String(m[1]).padStart(2, "0")}`;
}

function parseTime(text) {
  const m = text.match(/(\d{1,2}\.\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (m) return m[2];
  const m2 = text.match(/\b(\d{1,2}:\d{2})\b/);
  return m2 ? m2[1] : "11:00";
}

function parseTable(html) {
  const rows = [];
  const tableEnd = html.indexOf('class="terminarz"');
  const section = tableEnd > 0 ? html.slice(0, tableEnd) : html;
  const re =
    /<td[^>]*><b>(\d+)\.<\/b><\/td>\s*<td[^>]*>\s*<a\s+class="liga"[^>]*>([\s\S]*?)<\/a>[\s\S]*?align="center">(\d+)<\/td>\s*<td[^>]*><b>(\d+)<\/b>[\s\S]*?text-align:center">(\d+)<\/td>\s*<td[^>]*text-align:center">(\d+)<\/td>\s*<td[^>]*text-align:center">(\d+)<\/td>\s*<td[^>]*text-align:center">(\d+)\s*-\s*(\d+)<\/td>/gi;
  let m;
  while ((m = re.exec(section)) !== null) {
    const teamName = stripHtml(m[2]).replace(/\(\*\)/g, "").trim();
    rows.push({
      position: Number(m[1]),
      teamName,
      played: Number(m[3]),
      points: Number(m[4]),
      won: Number(m[5]),
      drawn: Number(m[6]),
      lost: Number(m[7]),
      goalsFor: Number(m[8]),
      goalsAgainst: Number(m[9]),
    });
  }
  return rows;
}

function stripTeamName(html) {
  return stripHtml(html.replace(/<\/?s>/gi, " ")).trim();
}

function isValidTeamName(name) {
  if (!name || name.length < 2) return false;
  if (/kolejka/i.test(name)) return false;
  if (/-->/.test(name)) return false;
  if (/\d+\s*-\s*\d+/.test(name)) return false;
  return true;
}

function parseFixtureRow(rowHtml, roundNumber, roundDates) {
  const homeMatch = rowHtml.match(/<td class="druzyna-1">([\s\S]*?)<\/td>/i);
  const awayMatch = rowHtml.match(/<td class="druzyna-2">([\s\S]*?)<\/td>/i);
  const scoreMatch = rowHtml.match(
    /<td class="wynik"><a\s+class="(?:mecz|walkower)"[^>]*>([\s\S]*?)<\/a><\/td>/i,
  );
  const dateMatch = rowHtml.match(/<span class="normal-date">([\s\S]*?)<\/span>/i);
  const timeMatch = rowHtml.match(/<td class="data-meczu">[\s\S]*?-\s*(\d{1,2}:\d{2})/i);

  if (!homeMatch || !awayMatch || !scoreMatch) return null;

  const homeTeamName = stripTeamName(homeMatch[1]);
  const awayTeamName = stripTeamName(awayMatch[1]);
  if (!isValidTeamName(homeTeamName) || !isValidTeamName(awayTeamName)) return null;

  const scoreRaw = stripHtml(scoreMatch[1]).trim();
  const dateText = dateMatch ? stripHtml(dateMatch[1]) : "";
  let matchDate = parsePolishDate(dateText);
  if (matchDate) {
    roundDates.set(roundNumber, matchDate);
  } else {
    matchDate = roundDates.get(roundNumber) ?? null;
  }
  if (!matchDate) return null;

  const matchTime = timeMatch ? timeMatch[1] : "11:00";

  let homeScore = null;
  let awayScore = null;
  let status = "scheduled";
  if (/^\d+\s*-\s*\d+$/.test(scoreRaw)) {
    const [h, a] = scoreRaw.split("-").map((s) => Number(s.trim()));
    homeScore = h;
    awayScore = a;
    status = "completed";
  } else if (scoreRaw === "-") {
    status = "scheduled";
  }

  return {
    roundNumber,
    matchDate,
    matchTime,
    homeTeamName,
    awayTeamName,
    homeScore,
    awayScore,
    status,
  };
}

function parseFixtures(html) {
  const fixtures = [];
  const section = html.includes('class="terminarz"')
    ? html.slice(html.indexOf('class="terminarz"'))
    : html;
  const roundDates = new Map();
  const trRe = /<tr class="kolejka-(\d+)\s[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(section)) !== null) {
    const roundNumber = Number(m[1]);
    const fixture = parseFixtureRow(m[2], roundNumber, roundDates);
    if (fixture) fixtures.push(fixture);
  }
  return fixtures;
}

async function probeDzpn() {
  const xlsx = await get(
    "https://dzpn.pl/wp-json/wp/v2/media?per_page=100&mime_type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  const files = xlsx.ok ? JSON.parse(xlsx.text).map((m) => m.source_url) : [];
  return { ok: files.some((u) => /terminarz|tabela|klasa/i.test(u)), files };
}

async function main() {
  console.log("1) DZPN dzpn.pl — publiczne pliki ligowe");
  const dzpn = await probeDzpn();
  console.log("   XLSX na dzpn.pl:", dzpn.files.length ? dzpn.files : "brak (tylko kalkulator ekwiwalentu)");
  if (!dzpn.ok) {
    console.log("   → Brak aktualnej tabeli/terminarza B Klasy na dzpn.pl\n");
  }

  console.log("2) Mirror publiczny — regionalnyfutbol.pl (B Klasa Wrocław VII 2025/26)");
  const page = await get(LEAGUE_URL);
  if (!page.ok) throw new Error(`HTTP ${page.status} ${LEAGUE_URL}`);

  const table = parseTable(page.text);
  const fixtures = parseFixtures(page.text);
  const mietkow = table.find((r) => /mietk/i.test(r.teamName));

  console.log(`   Tabela: ${table.length} drużyn`);
  console.log(`   Terminarz: ${fixtures.length} meczów`);
  if (mietkow) {
    console.log(
      `   GLKS Mietków: ${mietkow.position}. miejsce, ${mietkow.points} pkt (${mietkow.won}W ${mietkow.drawn}R ${mietkow.lost}P, ${mietkow.goalsFor}:${mietkow.goalsAgainst})`,
    );
  }

  if (table.length < 10) throw new Error("Parser tabeli — za mało wierszy, sprawdź HTML źródła.");

  const csvHeader = "druzyna,m,w,r,p,bz,bs,pkt";
  const csvRows = table.map(
    (r) =>
      `${r.teamName},${r.played},${r.won},${r.drawn},${r.lost},${r.goalsFor},${r.goalsAgainst},${r.points}`,
  );
  const tablePath = join(outDir, "b-wroclaw-vii-table.csv");
  const fixturesPath = join(outDir, "b-wroclaw-vii-fixtures.json");
  writeFileSync(tablePath, [csvHeader, ...csvRows].join("\n") + "\n");
  writeFileSync(fixturesPath, JSON.stringify({ matches: fixtures }, null, 2) + "\n");

  const meta = {
    fetchedAt: new Date().toISOString(),
    source: "regionalnyfutbol.pl",
    sourceUrl: LEAGUE_URL,
    note: "Dane lustrzane mPZPN/ŁNP — NIE z pliku DZPN. Oficjalny kanał: wniosek API PZPN.",
    dzpnPublicFiles: dzpn.files,
    tableTeams: table.length,
    fixtures: fixtures.length,
    glksMietkow: mietkow ?? null,
  };
  writeFileSync(join(outDir, "source-meta.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log("\n   Zapisano:", tablePath);
  console.log("   Zapisano:", fixturesPath);

  console.log("\n3) Import do League Hub…");
  spawnSync("node", [join(root, "scripts/import-league-fixture.mjs"), "--type", "league_table", "--file", "fixtures/league/live/b-wroclaw-vii-table.csv"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  const imp2 = spawnSync("node", [join(root, "scripts/import-league-fixture.mjs"), "--type", "fixtures", "--file", "fixtures/league/live/b-wroclaw-vii-fixtures.json"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  if (imp2.status !== 0) process.exit(imp2.status ?? 1);
  console.log("\nGotowe.");
}

main().catch((e) => {
  console.error("Błąd:", e.message);
  process.exit(1);
});
