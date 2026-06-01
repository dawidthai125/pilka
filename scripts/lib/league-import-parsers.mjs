/** Parsers aligned with src/lib/integrations/import-parsers.ts (CLI import only). */

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if ((ch === "," || ch === ";") && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function num(value, fallback = 0) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

export function stableFixtureExternalId(homeTeamName, awayTeamName, matchDate, roundNumber) {
  const base = `${matchDate}|${roundNumber ?? 0}|${homeTeamName.trim()}|${awayTeamName.trim()}`;
  return `FIX-${base.replace(/[^a-zA-Z0-9|]+/g, "-").slice(0, 120)}`;
}

export function parseCsvLeagueTable(content) {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const teamIdx = header.findIndex((h) => h.includes("druzyna") || h.includes("team") || h.includes("nazwa"));
  const playedIdx = header.findIndex((h) => h === "m" || h.includes("rozegr"));
  const wonIdx = header.findIndex((h) => h === "w" || h.includes("wygr"));
  const drawnIdx = header.findIndex((h) => h === "r" || h.includes("remis"));
  const lostIdx = header.findIndex((h) => h === "p" || h.includes("przegr"));
  const gfIdx = header.findIndex((h) => h.includes("bz") || (h.includes("bramki") && h.includes("z")));
  const gaIdx = header.findIndex((h) => h.includes("bs") || (h.includes("bramki") && h.includes("s")));
  const ptsIdx = header.findIndex((h) => h.includes("pkt") || h.includes("points"));

  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const played = playedIdx >= 0 ? num(cols[playedIdx]) : 0;
    const won = wonIdx >= 0 ? num(cols[wonIdx]) : 0;
    const drawn = drawnIdx >= 0 ? num(cols[drawnIdx]) : 0;
    const lost = lostIdx >= 0 ? num(cols[lostIdx]) : Math.max(0, played - won - drawn);
    return {
      teamName: cols[teamIdx >= 0 ? teamIdx : 0] ?? "",
      played,
      won,
      drawn,
      lost,
      goalsFor: gfIdx >= 0 ? num(cols[gfIdx]) : 0,
      goalsAgainst: gaIdx >= 0 ? num(cols[gaIdx]) : 0,
      points: ptsIdx >= 0 ? num(cols[ptsIdx]) : won * 3 + drawn,
    };
  }).filter((r) => r.teamName);
}

export function parseCsvFixtures(content) {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const dateIdx = header.findIndex((h) => h.includes("data") || h.includes("date"));
  const timeIdx = header.findIndex((h) => h.includes("godz") || h.includes("time"));
  const homeIdx = header.findIndex((h) => h.includes("gosp") || h.includes("home"));
  const awayIdx = header.findIndex((h) => h.includes("gosc") || h.includes("away") || h.includes("gość"));
  const roundIdx = header.findIndex((h) => h.includes("kolej") || h.includes("round"));
  const scoreIdx = header.findIndex((h) => h.includes("wynik") || h.includes("score"));

  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    let homeScore = null;
    let awayScore = null;
    let status = "scheduled";

    if (scoreIdx >= 0 && cols[scoreIdx]?.includes(":")) {
      const [h, a] = cols[scoreIdx].split(":");
      homeScore = num(h, NaN);
      awayScore = num(a, NaN);
      if (Number.isFinite(homeScore) && Number.isFinite(awayScore)) status = "completed";
    }

    const matchDate = cols[dateIdx >= 0 ? dateIdx : 0] ?? new Date().toISOString().slice(0, 10);
    const homeTeamName = cols[homeIdx >= 0 ? homeIdx : 1] ?? "";
    const awayTeamName = cols[awayIdx >= 0 ? awayIdx : 2] ?? "";
    const roundNumber = roundIdx >= 0 ? num(cols[roundIdx], NaN) || undefined : undefined;

    return {
      externalId: stableFixtureExternalId(homeTeamName, awayTeamName, matchDate, roundNumber),
      roundNumber,
      matchDate,
      matchTime: timeIdx >= 0 ? cols[timeIdx]?.slice(0, 5) : "15:00",
      homeTeamName,
      awayTeamName,
      homeScore,
      awayScore,
      status,
    };
  }).filter((r) => r.homeTeamName && r.awayTeamName);
}

export function parseJsonImport(content, importType) {
  const data = JSON.parse(content);
  if (importType === "league_table") {
    const rows = Array.isArray(data) ? data : data.rows ?? [];
    return rows.map((row) => ({
      teamName: String(row.teamName ?? row.team_name ?? row.nazwa ?? ""),
      played: Number(row.played ?? row.m ?? 0),
      won: Number(row.won ?? row.w ?? 0),
      drawn: Number(row.drawn ?? row.r ?? 0),
      lost: Number(row.lost ?? row.p ?? 0),
      goalsFor: Number(row.goalsFor ?? row.goals_for ?? row.bz ?? 0),
      goalsAgainst: Number(row.goalsAgainst ?? row.goals_against ?? row.bs ?? 0),
      points: Number(row.points ?? row.pkt ?? 0),
    })).filter((r) => r.teamName);
  }

  const rows = Array.isArray(data) ? data : data.matches ?? [];
  return rows.map((row) => {
    const matchDate = String(row.matchDate ?? row.date ?? new Date().toISOString().slice(0, 10));
    const homeTeamName = String(row.homeTeamName ?? row.home ?? row.home_team ?? "");
    const awayTeamName = String(row.awayTeamName ?? row.away ?? row.away_team ?? "");
    const roundNumber =
      row.roundNumber != null ? Number(row.roundNumber) : row.round != null ? Number(row.round) : undefined;
    return {
      externalId: row.externalId
        ? String(row.externalId)
        : row.id
          ? String(row.id)
          : stableFixtureExternalId(homeTeamName, awayTeamName, matchDate, roundNumber),
      roundNumber,
      matchDate,
      matchTime: String(row.matchTime ?? row.time ?? "15:00").slice(0, 5),
      homeTeamName,
      awayTeamName,
      homeScore: row.homeScore != null ? Number(row.homeScore) : row.home_score != null ? Number(row.home_score) : null,
      awayScore: row.awayScore != null ? Number(row.awayScore) : row.away_score != null ? Number(row.away_score) : null,
      status: String(row.status ?? (row.homeScore != null ? "completed" : "scheduled")),
    };
  }).filter((r) => r.homeTeamName && r.awayTeamName);
}

export function detectImportFormat(fileName, content) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) return "csv";
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  return "csv";
}

export function parseLeagueFile(content, fileName, importType) {
  const format = detectImportFormat(fileName, content);
  const payload = { leagueTable: [], fixtures: [] };

  if (format === "json") {
    const types =
      importType === "full" ? ["league_table", "fixtures", "results"] : [importType];
    for (const t of types) {
      if (t === "full") continue;
      try {
        const part = parseJsonImport(content, t === "results" ? "results" : t);
        if (t === "league_table") payload.leagueTable.push(...part);
        else payload.fixtures.push(...part);
      } catch {
        /* partial parse */
      }
    }
    return payload;
  }

  if (importType === "league_table" || importType === "full") {
    payload.leagueTable = parseCsvLeagueTable(content);
  }
  if (importType === "fixtures" || importType === "results" || importType === "full") {
    payload.fixtures = parseCsvFixtures(content);
  }
  return payload;
}
