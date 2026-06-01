/** Domyślne kolory PWA — nadpisywane z website_settings klubu. */
export const PWA_DEFAULT_THEME = {
  name: "Football Club OS",
  shortName: "FCOS",
  primaryColor: "#0B3D2E",
  secondaryColor: "#F4C430",
  backgroundColor: "#0B3D2E",
  themeColor: "#0B3D2E",
} as const;

export type PwaThemeColors = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  themeColor: string;
};

export function resolvePwaTheme(settings?: {
  primaryColor?: string | null;
  secondaryColor?: string | null;
}): PwaThemeColors {
  const primary = settings?.primaryColor ?? PWA_DEFAULT_THEME.primaryColor;
  const secondary = settings?.secondaryColor ?? PWA_DEFAULT_THEME.secondaryColor;
  return {
    primaryColor: primary,
    secondaryColor: secondary,
    backgroundColor: primary,
    themeColor: primary,
  };
}
