import { resolveClubTheme, type ClubTheme } from "@/lib/club/theme";
import { siteConfig } from "@/config/site";

/** Domyślne kolory PWA — nadpisywane z website_settings klubu. */
export const PWA_DEFAULT_THEME = {
  name: siteConfig.name,
  shortName: siteConfig.shortName,
  primaryColor: "#0B3D2E",
  secondaryColor: "#F4C430",
  backgroundColor: "#0B3D2E",
  themeColor: "#0B3D2E",
} as const;

export type PwaThemeColors = Pick<
  ClubTheme,
  "primaryColor" | "secondaryColor" | "backgroundColor" | "themeColor"
>;

export function resolvePwaTheme(settings?: {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
}): PwaThemeColors {
  const theme = resolveClubTheme(settings);
  return {
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    backgroundColor: theme.backgroundColor,
    themeColor: theme.themeColor,
  };
}
