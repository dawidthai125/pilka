/** Ręczne wprowadzanie danych — bez zewnętrznego API. */

export type ManualEntryType = "league_table" | "fixture" | "result";

export type ManualAdapter = {
  label: string;
  supportedFormats: readonly ["manual"];
  validateEntry: (type: ManualEntryType, payload: Record<string, unknown>) => string | null;
};

export const manualAdapter: ManualAdapter = {
  label: "Ręczne wprowadzanie",
  supportedFormats: ["manual"],
  validateEntry(type, payload) {
    if (type === "fixture" || type === "result") {
      if (!payload.homeTeamName || !payload.awayTeamName) return "Podaj obie drużyny.";
      if (!payload.matchDate) return "Podaj datę meczu.";
    }
    if (type === "league_table" && !payload.teamName) return "Podaj nazwę drużyny.";
    return null;
  },
};
