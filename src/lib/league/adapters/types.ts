import type { ParsedFixtureRow, ParsedLeagueRow } from "@/lib/integrations/quality";
import type { LeagueImportType } from "@/types/league";

export type LeagueImportPayload = {
  leagueTable: ParsedLeagueRow[];
  fixtures: ParsedFixtureRow[];
};

export type LeagueSourceAdapterInterface = {
  key: string;
  label: string;
  supportedTypes: LeagueImportType[];
  parse(content: string | ArrayBuffer, importType: LeagueImportType, fileName?: string): Promise<LeagueImportPayload>;
};

export function emptyPayload(): LeagueImportPayload {
  return { leagueTable: [], fixtures: [] };
}

export function mergePayloads(a: LeagueImportPayload, b: LeagueImportPayload): LeagueImportPayload {
  return {
    leagueTable: [...a.leagueTable, ...b.leagueTable],
    fixtures: [...a.fixtures, ...b.fixtures],
  };
}
