import type {
  IntegrationDataFormat,
  IntegrationImportType,
  IntegrationProvider,
  SyncJobType,
  SyncLogStatus,
  SyncTriggerType,
} from "@/types/integrations";

export const INTEGRATION_PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  pzpn: "PZPN",
  dzpn: "DZPN",
  extranet: "Extranet",
  manual: "Ręczne / import",
  other: "Inne związki",
};

export const INTEGRATION_PROVIDER_DESCRIPTIONS: Record<IntegrationProvider, string> = {
  pzpn: "Terminarze i rozgrywki centralne PZPN — brak publicznego API dla klubów amatorskich.",
  dzpn: "Dolnośląski ZPN — tabela, terminarz i wyniki (import CSV/JSON lub przyszłe API).",
  extranet: "Extranet rozgrywkowy — wysyłka raportów meczowych.",
  manual: "Import plików i ręczne wprowadzanie bez zewnętrznego API.",
  other: "Inne związki piłkarskie — rozszerzalna architektura adapterów.",
};

export const INTEGRATION_STATUS_LABELS = {
  not_configured: "Nie skonfigurowano",
  ready: "Gotowa",
  disabled: "Wyłączona",
  error: "Błąd",
} as const;

export const DATA_FORMAT_LABELS: Record<IntegrationDataFormat, string> = {
  api: "API",
  json: "JSON",
  xml: "XML",
  csv: "CSV",
  rss: "RSS",
  file: "Plik",
  manual: "Ręcznie",
};

export const SYNC_JOB_TYPE_LABELS: Record<SyncJobType, string> = {
  league_table: "Tabela ligi",
  fixtures: "Terminarz",
  results: "Wyniki",
  full: "Pełna synchronizacja",
};

export const SYNC_TRIGGER_LABELS: Record<SyncTriggerType, string> = {
  manual: "Ręczna",
  automatic: "Automatyczna",
  import: "Import pliku",
};

export const SYNC_LOG_STATUS_LABELS: Record<SyncLogStatus, string> = {
  success: "Sukces",
  partial: "Częściowy sukces",
  error: "Błąd",
};

export const IMPORT_TYPE_LABELS: Record<IntegrationImportType, string> = {
  league_table: "Tabela ligowa",
  fixtures: "Terminarz",
  results: "Wyniki",
};

export const INTEGRATION_NAV = [
  { href: "/integrations", label: "Przegląd" },
  { href: "/integrations/pzpn", label: "PZPN" },
  { href: "/integrations/dzpn", label: "DZPN" },
  { href: "/integrations/extranet", label: "Extranet" },
  { href: "/integrations/manual", label: "Ręczne" },
  { href: "/integrations/imports", label: "Importy" },
  { href: "/integrations/mappings", label: "Mapowania" },
  { href: "/integrations/sync", label: "Historia sync" },
] as const;

export const PZPN_API_NOTE =
  "PZPN nie udostępnia publicznego API terminarzy dla klubów amatorskich — dane publikowane są m.in. jako PDF. System gotowy pod adapter gdy API będzie dostępne.";

export const DZPN_API_NOTE =
  "DZPN — synchronizacja przez import CSV/JSON lub staging w bazie; adapter API przygotowany pod przyszłe podłączenie.";
