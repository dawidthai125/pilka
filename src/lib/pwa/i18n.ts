/** Architektura i18n — ETAP 12. Pełne tłumaczenia w kolejnych iteracjach. */
export type AppLocale = "pl" | "en";

export const DEFAULT_LOCALE: AppLocale = "pl";

const messages: Record<AppLocale, Record<string, string>> = {
  pl: {
    "app.name": "Football Club OS",
    "nav.start": "Start",
    "nav.matches": "Mecze",
    "nav.training": "Treningi",
    "nav.team": "Drużyna",
    "nav.more": "Więcej",
    "nav.sponsorPortal": "Portal",
    "nav.content": "Content",
    "nav.communication": "Komunikacja",
    "nav.fees": "Składki",
    "nav.attendance": "Frekwencja",
    "nav.injury": "Urazy",
    "settings.title": "Ustawienia aplikacji",
    "settings.theme": "Motyw",
    "settings.notifications": "Powiadomienia",
    "settings.language": "Język",
    "offline.banner": "Tryb offline — zmiany zostaną zsynchronizowane po połączeniu.",
    "install.prompt": "Zainstaluj Football Club OS na urządzeniu",
  },
  en: {
    "app.name": "Football Club OS",
    "nav.start": "Home",
    "nav.matches": "Matches",
    "nav.training": "Training",
    "nav.team": "Team",
    "nav.more": "More",
    "nav.sponsorPortal": "Portal",
    "nav.content": "Content",
    "nav.communication": "Messages",
    "nav.fees": "Fees",
    "nav.attendance": "Attendance",
    "nav.injury": "Injuries",
    "settings.title": "App settings",
    "settings.theme": "Theme",
    "settings.notifications": "Notifications",
    "settings.language": "Language",
    "offline.banner": "Offline mode — changes will sync when you're back online.",
    "install.prompt": "Install Football Club OS on your device",
  },
};

export function t(key: string, locale: AppLocale = DEFAULT_LOCALE): string {
  return messages[locale][key] ?? messages.pl[key] ?? key;
}

export function getStoredLocale(): AppLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const stored = localStorage.getItem("fcos-locale");
  return stored === "en" ? "en" : "pl";
}

export function setStoredLocale(locale: AppLocale): void {
  localStorage.setItem("fcos-locale", locale);
}
