/**
 * Pobieranie danych ligowych z mirrorów publicznych (do czasu API PZPN/DZPN).
 * Oficjalna nazwa ligowa: GLKS Mietków → wyświetlanie w FC OS: Piorun Wawrzeńczyce.
 *
 * Źródła (wg wiarygodności):
 * 1. 90minut.pl — tabela + wyniki (deklaracja: mPZPN + laczynaspilka.pl)
 * 2. regionalnyfutbol.pl — tabela + terminarz (mirror ŁNP)
 */

export const LEAGUE_CONFIG = {
  clubId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  competitionId: "f9022001-0001-4000-8000-000000000001",
  seasonId: "f9021001-0001-4000-8000-000000000001",
  ownLeagueName: "GLKS Mietków",
  ownDisplayName: "Piorun Wawrzeńczyce",
  sources: {
    ninetyMinut: {
      key: "90minut",
      label: "90minut.pl",
      reliability: 9,
      tableUrl: "http://www.90minut.pl/liga/1/liga14526.html",
    },
    regionalnyFutbol: {
      key: "regionalnyfutbol",
      label: "regionalnyfutbol.pl",
      reliability: 8,
      pageUrl:
        "https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,tabela-terminarz.html",
    },
  },
};

const UA = "Mozilla/5.0 (compatible; PiorunLeagueSync/1.0; +https://pilka-mu.vercel.app)";

const MONTHS = {
  stycznia: "01",
  lutego: "02",
  marca: "03",
  kwietnia: "04",
  maja: "05",
  czerwca: "06",
  lipca: "07",
  sierpnia: "08",
  września: "09",
  wrzesnia: "09",
  października: "10",
  pazdziernika: "10",
  listopada: "11",
  grudnia: "12",
};

export async function fetchPage(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

export function stripHtml(s) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTeamName(name) {
  return stripHtml(String(name ?? ""))
    .replace(/\(\*\)/g, "")
    .replace(/\uFFFD/g, "ó")
    .replace(/Mietk.w/i, "Mietków")
    .replace(/Krzy.owice/i, "Krzyżowice")
    .replace(/Jakson.w/i, "Jaksonów")
    .replace(/Domas.aw/i, "Domasław")
    .replace(/Sadk.w/i, "Sadków")
    .replace(/Sob.tka/i, "Sobótka")
    .replace(/Pustk.w/i, "Pustków")
    .replace(/Pustków\s+[óo]?urawski/i, "Pustków Żurawski")
    .trim();
}

function parsePolishDate(text) {
  const m = text.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i);
  if (!m) {
    const short = text.match(/(\d{1,2})-(\d{1,2})\s+([a-ząćęłńóśźż]+)/i);
    if (short) {
      const year = new Date().getFullYear();
      const mo = MONTHS[short[3].toLowerCase()];
      if (mo) return `${year}-${mo}-${String(short[1]).padStart(2, "0")}`;
    }
    return null;
  }
  const mo = MONTHS[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${mo}-${String(m[1]).padStart(2, "0")}`;
}

function parseTime(text) {
  const m = text.match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : "11:00";
}

/** regionalnyfutbol.pl — tabela */
export function parseRegionalnyFutbolTable(html) {
  const rows = [];
  const tableEnd = html.indexOf('class="terminarz"');
  const section = tableEnd > 0 ? html.slice(0, tableEnd) : html;
  const re =
    /<td[^>]*><b>(\d+)\.<\/b><\/td>\s*<td[^>]*>\s*<a\s+class="liga"[^>]*>([\s\S]*?)<\/a>[\s\S]*?align="center">(\d+)<\/td>\s*<td[^>]*><b>(\d+)<\/b>[\s\S]*?text-align:center">(\d+)<\/td>\s*<td[^>]*text-align:center">(\d+)<\/td>\s*<td[^>]*text-align:center">(\d+)<\/td>\s*<td[^>]*text-align:center">(\d+)\s*-\s*(\d+)<\/td>/gi;
  let m;
  while ((m = re.exec(section)) !== null) {
    rows.push({
      position: Number(m[1]),
      teamName: normalizeTeamName(m[2]),
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
  return normalizeTeamName(html.replace(/<\/?s>/gi, " "));
}

function isValidTeamName(name) {
  if (!name || name.length < 2) return false;
  if (/kolejka/i.test(name)) return false;
  if (/-->/.test(name)) return false;
  if (/\d+\s*-\s*\d+/.test(name)) return false;
  return true;
}

function parseRegionalnyFutbolFixtureRow(rowHtml, roundNumber, roundDates) {
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
  if (matchDate) roundDates.set(roundNumber, matchDate);
  else matchDate = roundDates.get(roundNumber) ?? null;
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
    source: "regionalnyfutbol",
  };
}

/** regionalnyfutbol.pl — terminarz */
export function parseRegionalnyFutbolFixtures(html) {
  const fixtures = [];
  const section = html.includes('class="terminarz"')
    ? html.slice(html.indexOf('class="terminarz"'))
    : html;
  const roundDates = new Map();
  const trRe = /<tr class="kolejka-(\d+)\s[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(section)) !== null) {
    const fixture = parseRegionalnyFutbolFixtureRow(m[2], Number(m[1]), roundDates);
    if (fixture) fixtures.push(fixture);
  }
  return fixtures;
}

/** 90minut.pl — tabela ligowa */
export function parseNinetyMinutTable(html) {
  const rows = [];
  const re =
    /<tr[^>]*>\s*<td[^>]*><b>(\d+)\.<\/b><\/td>\s*<td[^>]*>[\s\S]*?class="main">([\s\S]*?)<\/a><\/td>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*><b>(\d+)<\/b><\/td>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>(\d+)\s*-\s*(\d+)<\/td>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    rows.push({
      position: Number(m[1]),
      teamName: normalizeTeamName(m[2]),
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

/** 90minut.pl — wyniki kolejek */
export function parseNinetyMinutFixtures(html) {
  const fixtures = [];
  const roundRe = /Kolejka\s+(\d+)\s*-\s*([^<]+)</gi;
  const rounds = [];
  let rm;
  while ((rm = roundRe.exec(html)) !== null) {
    rounds.push({ round: Number(rm[1]), header: rm[2], index: rm.index });
  }

  for (let i = 0; i < rounds.length; i++) {
    const start = rounds[i].index;
    const end = i + 1 < rounds.length ? rounds[i + 1].index : html.length;
    const chunk = html.slice(start, end);
    const roundNumber = rounds[i].round;
    const defaultDate = parsePolishDate(rounds[i].header) ?? parsePolishDate(chunk);

    const rowRe =
      /<td[^>]*><b>\s*([^<]+?)\s*<\/b><\/td>\s*<td[^>]*>[\s\S]*?<b>(\d+\s*-\s*\d+|\?-\?)<\/b>[\s\S]*?<td[^>]*><b>\s*([^<]+?)\s*<\/b><\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
    let row;
    while ((row = rowRe.exec(chunk)) !== null) {
      const homeTeamName = normalizeTeamName(row[1]);
      const awayTeamName = normalizeTeamName(row[3]);
      if (!isValidTeamName(homeTeamName) || !isValidTeamName(awayTeamName)) continue;

      const scoreRaw = stripHtml(row[2]).replace(/\s+/g, "");
      const dateText = stripHtml(row[4]);
      const matchDate = parsePolishDate(dateText) ?? defaultDate;
      if (!matchDate) continue;

      let homeScore = null;
      let awayScore = null;
      let status = "scheduled";
      if (/^\d+-\d+$/.test(scoreRaw)) {
        const [h, a] = scoreRaw.split("-").map(Number);
        homeScore = h;
        awayScore = a;
        status = "completed";
      }

      fixtures.push({
        roundNumber,
        matchDate,
        matchTime: parseTime(dateText),
        homeTeamName,
        awayTeamName,
        homeScore,
        awayScore,
        status,
        source: "90minut",
      });
    }
  }
  return fixtures;
}

function fixtureKey(f) {
  return `${f.matchDate}|${f.roundNumber ?? 0}|${f.homeTeamName.toLowerCase()}|${f.awayTeamName.toLowerCase()}`;
}

function pickScore(primary, secondary) {
  if (primary?.homeScore != null) return primary;
  if (secondary?.homeScore != null) return secondary;
  return primary ?? secondary;
}

/** Scalanie tabel — preferuj 90minut, weryfikuj regionalnyfutbol */
export function mergeLeagueTables(sources) {
  const primary = sources.ninetyMinut?.table?.length >= 10 ? sources.ninetyMinut.table : null;
  const secondary = sources.regionalnyFutbol?.table?.length >= 10 ? sources.regionalnyFutbol.table : null;
  const table = primary ?? secondary ?? [];
  const chosen = primary ? "90minut" : secondary ? "regionalnyfutbol" : "none";

  const conflicts = [];
  if (primary && secondary) {
    for (const row of primary) {
      const other = secondary.find((r) => r.teamName.toLowerCase() === row.teamName.toLowerCase());
      if (other && (other.points !== row.points || other.goalsFor !== row.goalsFor)) {
        conflicts.push({
          team: row.teamName,
          primary: `${row.points}pkt ${row.goalsFor}:${row.goalsAgainst}`,
          secondary: `${other.points}pkt ${other.goalsFor}:${other.goalsAgainst}`,
        });
      }
    }
  }

  return { table, chosen, conflicts };
}

/** Scalanie terminarza — regionalnyfutbol + uzupełnienie wynikami z 90minut */
export function mergeFixtures(sources) {
  const rf = sources.regionalnyFutbol?.fixtures ?? [];
  const nm = sources.ninetyMinut?.fixtures ?? [];
  const map = new Map();

  for (const f of rf) map.set(fixtureKey(f), { ...f, sources: ["regionalnyfutbol"] });
  for (const f of nm) {
    const key = fixtureKey(f);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...f, sources: ["90minut"] });
      continue;
    }
    const merged = pickScore(f, existing);
    map.set(key, {
      ...existing,
      ...merged,
      matchTime: existing.matchTime || f.matchTime,
      sources: [...new Set([...(existing.sources ?? []), "90minut"])],
    });
  }

  return [...map.values()].sort((a, b) => a.matchDate.localeCompare(b.matchDate));
}

export async function fetchAllLeagueSources() {
  const cfg = LEAGUE_CONFIG.sources;
  const [rfHtml, nmHtml] = await Promise.all([
    fetchPage(cfg.regionalnyFutbol.pageUrl),
    fetchPage(cfg.ninetyMinut.tableUrl),
  ]);

  const regionalnyFutbol = {
    table: parseRegionalnyFutbolTable(rfHtml),
    fixtures: parseRegionalnyFutbolFixtures(rfHtml),
  };
  const ninetyMinut = {
    table: parseNinetyMinutTable(nmHtml),
    fixtures: parseNinetyMinutFixtures(nmHtml),
  };

  const tableMerge = mergeLeagueTables({ regionalnyFutbol, ninetyMinut });
  const fixtures = mergeFixtures({ regionalnyFutbol, ninetyMinut });

  const ownRow = tableMerge.table.find((r) => /mietk/i.test(r.teamName));

  return {
    fetchedAt: new Date().toISOString(),
    regionalnyFutbol: {
      ...cfg.regionalnyFutbol,
      tableRows: regionalnyFutbol.table.length,
      fixtureRows: regionalnyFutbol.fixtures.length,
    },
    ninetyMinut: {
      ...cfg.ninetyMinut,
      tableRows: ninetyMinut.table.length,
      fixtureRows: ninetyMinut.fixtures.length,
    },
    merged: {
      table: tableMerge.table,
      tableSource: tableMerge.chosen,
      tableConflicts: tableMerge.conflicts,
      fixtures,
      glksMietkow: ownRow ?? null,
    },
  };
}
