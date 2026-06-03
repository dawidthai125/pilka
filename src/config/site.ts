function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

export const siteConfig = {
  name: readEnv("NEXT_PUBLIC_SITE_NAME", "PUBLIC_CLUB_NAME") || "Klub piłkarski",
  shortName: readEnv("NEXT_PUBLIC_SITE_SHORT_NAME", "PUBLIC_CLUB_SHORT_NAME") || "Klub",
  description:
    readEnv("NEXT_PUBLIC_SITE_DESCRIPTION", "PUBLIC_SITE_DESCRIPTION") ||
    "Oficjalna strona klubu piłkarskiego — aktualności, mecze, tabela i kadra.",
  locale: "pl-PL",
  /** Dashboard hint only — public site uses URL-based club resolution (Sprint 18.1). */
  defaultClubSlug: readEnv("NEXT_PUBLIC_DEFAULT_CLUB_SLUG", "PUBLIC_CLUB_SLUG", "ACTIVE_CLUB_SLUG"),
} as const;
