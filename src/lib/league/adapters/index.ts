import { parseCsvFixtures, parseCsvLeagueTable, parseJsonImport } from "@/lib/integrations/import-parsers";
import { isXlsxBinaryContent } from "@/lib/league/validation";
import type { LeagueImportType } from "@/types/league";

import { emptyPayload, type LeagueSourceAdapterInterface } from "./types";

function textContent(content: string | ArrayBuffer): string {
  if (typeof content === "string") return content;
  return new TextDecoder("utf-8").decode(content);
}

export const csvLeagueAdapter: LeagueSourceAdapterInterface = {
  key: "csv",
  label: "CsvLeagueAdapter",
  supportedTypes: ["league_table", "fixtures", "results", "full"],
  async parse(content, importType) {
    const text = textContent(content);
    const payload = emptyPayload();
    if (importType === "league_table" || importType === "full") {
      payload.leagueTable = parseCsvLeagueTable(text);
    }
    if (importType === "fixtures" || importType === "results" || importType === "full") {
      payload.fixtures = parseCsvFixtures(text);
    }
    return payload;
  },
};

export const jsonLeagueAdapter: LeagueSourceAdapterInterface = {
  key: "json",
  label: "JsonLeagueAdapter",
  supportedTypes: ["league_table", "fixtures", "results", "full"],
  async parse(content, importType) {
    const text = textContent(content);
    const payload = emptyPayload();
    const types: LeagueImportType[] =
      importType === "full" ? ["league_table", "fixtures", "results"] : [importType];
    for (const t of types) {
      if (t === "full") continue;
      try {
        const part = parseJsonImport(text, t === "results" ? "results" : t);
        if (t === "league_table") {
          payload.leagueTable.push(...(part as ReturnType<typeof parseCsvLeagueTable>));
        } else {
          payload.fixtures.push(...(part as ReturnType<typeof parseCsvFixtures>));
        }
      } catch {
        /* partial parse */
      }
    }
    return payload;
  },
};

export const xlsxLeagueAdapter: LeagueSourceAdapterInterface = {
  key: "xlsx",
  label: "XlsxLeagueAdapter (via CSV sheet)",
  supportedTypes: ["league_table", "fixtures", "results", "full"],
  async parse(content, importType, fileName) {
    if (fileName?.toLowerCase().endsWith(".xlsx") && !isXlsxBinaryContent(content as ArrayBuffer)) {
      throw new Error("Plik .xlsx musi być prawidłowym arkuszem Excel (ZIP). Eksportuj jako CSV.");
    }
    const text = textContent(content);
    if (fileName?.endsWith(".csv") || text.includes(",") || text.includes(";")) {
      return csvLeagueAdapter.parse(content, importType, fileName);
    }
    throw new Error(
      "Import XLSX wymaga pliku .xlsx. Eksportuj arkusz jako CSV lub użyj formatu JSON. Adapter gotowy pod bibliotekę SheetJS.",
    );
  },
};

export const futureApiAdapter: LeagueSourceAdapterInterface = {
  key: "api",
  label: "FutureApiAdapter",
  supportedTypes: ["full"],
  async parse() {
    throw new Error("Oficjalne API PZPN/DZPN nie jest jeszcze skonfigurowane. Użyj importu CSV/JSON.");
  },
};

export const extranetAdapter: LeagueSourceAdapterInterface = {
  key: "extranet",
  label: "ExtranetAdapter",
  supportedTypes: ["results"],
  async parse() {
    throw new Error("ExtranetAdapter — placeholder. Raporty meczowe przez moduł Integracje / ręczny import.");
  },
};

export const manualLeagueAdapter: LeagueSourceAdapterInterface = {
  key: "manual",
  label: "ManualAdapter",
  supportedTypes: ["league_table", "fixtures", "results"],
  async parse(content, importType) {
    return csvLeagueAdapter.parse(content, importType);
  },
};

export const LEAGUE_ADAPTERS: Record<string, LeagueSourceAdapterInterface> = {
  csv: csvLeagueAdapter,
  json: jsonLeagueAdapter,
  xlsx: xlsxLeagueAdapter,
  api: futureApiAdapter,
  extranet: extranetAdapter,
  manual: manualLeagueAdapter,
};

export function getLeagueAdapter(key: string): LeagueSourceAdapterInterface {
  const adapter = LEAGUE_ADAPTERS[key];
  if (!adapter) throw new Error(`Nieznany adapter: ${key}`);
  return adapter;
}
