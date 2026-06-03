import { cache } from "react";

import { siteConfig } from "@/config/site";
import { resolveClubTheme, type ClubTheme } from "@/lib/club/theme";
import { getWebsiteAssetUrl } from "@/lib/website/assets";
import { getPublicWebsiteHome } from "@/lib/website/public-data";

export type ClubBrandingContext = {
  clubName: string;
  officialName: string | null;
  panelTitle: string;
  logoUrl: string | null;
  theme: ClubTheme;
};

export const getAuthClubBranding = cache(async (): Promise<ClubBrandingContext> => {
  const slug = siteConfig.defaultClubSlug;
  const home = slug ? await getPublicWebsiteHome(slug) : null;

  if (!home) {
    const theme = resolveClubTheme();
    return {
      clubName: siteConfig.name,
      officialName: null,
      panelTitle: `Panel ${siteConfig.name}`,
      logoUrl: null,
      theme,
    };
  }

  const logoUrl = home.settings.logoPath
    ? await getWebsiteAssetUrl(home.settings.logoPath)
    : null;

  return {
    clubName: home.club.publicName,
    officialName: home.club.officialName || null,
    panelTitle: `Panel ${home.club.publicName}`,
    logoUrl,
    theme: resolveClubTheme(home.settings),
  };
});
