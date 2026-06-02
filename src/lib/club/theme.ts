import { PWA_DEFAULT_THEME } from "@/lib/pwa/branding";

export type ClubTheme = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  themeColor: string;
};

export function resolveClubTheme(settings?: {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
}): ClubTheme {
  const primaryColor = settings?.primaryColor ?? PWA_DEFAULT_THEME.primaryColor;
  const secondaryColor = settings?.secondaryColor ?? PWA_DEFAULT_THEME.secondaryColor;
  const accentColor = settings?.accentColor ?? "#FFFFFF";

  return {
    primaryColor,
    secondaryColor,
    accentColor,
    backgroundColor: primaryColor,
    themeColor: primaryColor,
  };
}

/** Mapuje kolory klubu na tokeny shadcn + zmienne pomocnicze. */
export function getClubThemeCssVariables(theme: ClubTheme): Record<string, string> {
  const sidebarAccent = `color-mix(in srgb, ${theme.accentColor} 12%, transparent)`;
  const sidebarBorder = `color-mix(in srgb, ${theme.accentColor} 18%, transparent)`;

  return {
    "--pwa-primary": theme.primaryColor,
    "--pwa-secondary": theme.secondaryColor,
    "--club-primary": theme.primaryColor,
    "--club-secondary": theme.secondaryColor,
    "--club-accent": theme.accentColor,
    "--primary": theme.primaryColor,
    "--primary-foreground": theme.accentColor,
    "--sidebar": theme.primaryColor,
    "--sidebar-foreground": theme.accentColor,
    "--sidebar-primary": theme.secondaryColor,
    "--sidebar-primary-foreground": theme.primaryColor,
    "--sidebar-accent": sidebarAccent,
    "--sidebar-accent-foreground": theme.accentColor,
    "--sidebar-border": sidebarBorder,
    "--ring": theme.secondaryColor,
  };
}

export function clubThemeToCssText(theme: ClubTheme): string {
  const vars = getClubThemeCssVariables(theme);
  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}
