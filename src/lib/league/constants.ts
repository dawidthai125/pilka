import type { LeagueImportType, LeagueSourceAdapter } from "@/types/league";

export const LEAGUE_SOURCE_ADAPTER_LABELS: Record<LeagueSourceAdapter, string> = {
  csv: "CSV",
  json: "JSON",
  xlsx: "Excel (XLSX)",
  api: "API (przyszłe)",
  extranet: "Extranet (placeholder)",
  manual: "Ręczne",
};

export const LEAGUE_IMPORT_TYPE_LABELS: Record<LeagueImportType, string> = {
  league_table: "Tabela ligowa",
  fixtures: "Terminarz",
  results: "Wyniki",
  full: "Pełna synchronizacja",
};

export const LEAGUE_SYNC_STATUS_LABELS: Record<string, string> = {
  pending: "Oczekuje",
  running: "W trakcie",
  completed: "Zsynchronizowano",
  failed: "Błąd",
  cancelled: "Anulowano",
};

export const LEAGUE_MATCH_SYNC_STATUS_LABELS: Record<string, string> = {
  pending: "Oczekuje",
  synced: "Zsynchronizowano",
  conflict: "Konflikt",
  error: "Błąd",
  skipped: "Pominięto",
};

export const LEAGUE_NAV = [
  { href: "/league", label: "Dashboard" },
  { href: "/league/table", label: "Tabela" },
  { href: "/league/fixtures", label: "Terminarz" },
  { href: "/league/import", label: "Import" },
  { href: "/league/sync", label: "Sync Center" },
  { href: "/league/teams", label: "Drużyny" },
  { href: "/league/players", label: "Rejestr zawodników" },
  { href: "/league/sources", label: "Źródła danych" },
] as const;

export const PZPN_LEAGUE_NOTE =
  "PZPN nie udostępnia stabilnego publicznego API terminarzy dla klubów amatorskich. Adapter FutureApiAdapter jest placeholderem — dane przez import ręczny.";

export const DZPN_LEAGUE_NOTE =
  "DZPN — import CSV/JSON/XLSX lub przyszłe oficjalne API. System nie pobiera danych nieautoryzowanymi metodami.";

export const EXTRANET_LEAGUE_NOTE =
  "ExtranetAdapter — placeholder pod przyszłą integrację raportów meczowych bez omijania zabezpieczeń.";

export const MAX_LEAGUE_IMPORT_BYTES = 5 * 1024 * 1024;
