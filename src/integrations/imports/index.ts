/** Import plików CSV / JSON (Excel → zapisz jako CSV). */

import type { IntegrationDataFormat, IntegrationImportType } from "@/types/integrations";

export type ImportsAdapter = {
  label: string;
  supportedFormats: readonly IntegrationDataFormat[];
  supportedImportTypes: readonly IntegrationImportType[];
  excelNote: string;
};

export const importsAdapter: ImportsAdapter = {
  label: "Import plików",
  supportedFormats: ["csv", "json", "file"],
  supportedImportTypes: ["league_table", "fixtures", "results"],
  excelNote: "Pliki Excel (.xlsx) zapisz jako CSV przed importem — parser CSV/JSON w ETAP 10.",
};
