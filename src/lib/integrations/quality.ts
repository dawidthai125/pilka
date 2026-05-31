import type { QualityIssue } from "@/types/integrations";

export type ParsedLeagueRow = {
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

export type ParsedFixtureRow = {
  externalId?: string;
  roundNumber?: number;
  matchDate: string;
  matchTime?: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status?: string;
};

export function detectDuplicateExternalIds(ids: string[]): QualityIssue[] {
  const seen = new Set<string>();
  const issues: QualityIssue[] = [];
  for (const id of ids) {
    if (seen.has(id)) {
      issues.push({ code: "duplicate", message: `Duplikat identyfikatora: ${id}` });
    }
    seen.add(id);
  }
  return issues;
}

export function detectInvalidScores(
  rows: Array<{ homeScore?: number | null; awayScore?: number | null; homeTeamName: string; awayTeamName: string }>,
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const row of rows) {
    if (row.homeScore != null && row.homeScore < 0) {
      issues.push({
        code: "invalid_score",
        message: `Ujemny wynik gospodarzy: ${row.homeTeamName} vs ${row.awayTeamName}`,
      });
    }
    if (row.awayScore != null && row.awayScore < 0) {
      issues.push({
        code: "invalid_score",
        message: `Ujemny wynik gości: ${row.homeTeamName} vs ${row.awayTeamName}`,
      });
    }
    if (row.homeScore != null && row.awayScore != null && row.homeScore > 99) {
      issues.push({
        code: "invalid_score",
        message: `Podejrzany wynik: ${row.homeScore}:${row.awayScore}`,
      });
    }
  }
  return issues;
}

export function detectMissingTeams(
  rows: Array<{ homeTeamName: string; awayTeamName: string }>,
  knownTeamNames: string[],
): QualityIssue[] {
  if (!knownTeamNames.length) return detectEmptyTeamNames(rows);
  const known = new Set(knownTeamNames.map((n) => n.trim().toLowerCase()));
  const issues: QualityIssue[] = detectEmptyTeamNames(rows);
  for (const row of rows) {
    for (const name of [row.homeTeamName, row.awayTeamName]) {
      if (name.trim() && !known.has(name.trim().toLowerCase())) {
        issues.push({
          code: "unknown_team",
          message: `Nieznana drużyna w imporcie: ${name}`,
        });
      }
    }
  }
  return issues;
}

export function detectEmptyTeamNames(
  rows: Array<{ homeTeamName: string; awayTeamName: string }>,
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const row of rows) {
    if (!row.homeTeamName.trim() || !row.awayTeamName.trim()) {
      issues.push({ code: "missing_team", message: "Brak nazwy drużyny w wierszu meczu." });
    }
  }
  return issues;
}

export function detectMismatchedIdentifiers(
  rows: Array<{ externalId?: string }>,
): QualityIssue[] {
  return rows
    .filter((r) => r.externalId != null && !/^[A-Za-z0-9._-]+$/.test(String(r.externalId)))
    .map((r) => ({
      code: "invalid_identifier",
      message: `Nieprawidłowy identyfikator zewnętrzny: ${r.externalId}`,
    }));
}

export function mergeQualityIssues(...groups: QualityIssue[][]): QualityIssue[] {
  return groups.flat();
}
