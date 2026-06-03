import { cache } from "react";

import { getWebsiteAssetUrl } from "@/lib/website/assets";
import { getDemoMediaUrl, type DemoMediaAssetKey } from "@/lib/website/demo-media";
import type { WebsiteSettings } from "@/types/website";

/** Piłkarskie demo — kolejność fallbacku okładki (bez losowego Picsum cover.jpg). */
export const CLUB_COVER_DEMO_FALLBACK_KEYS: readonly DemoMediaAssetKey[] = [
  "hero-stadium",
  "hero-team",
  "hero-match",
];

export const resolvePublicCoverImageUrl = cache(async function resolvePublicCoverImageUrl(
  settings: WebsiteSettings,
): Promise<string | null> {
  if (settings.heroImagePath) {
    const cmsUrl = await getWebsiteAssetUrl(settings.heroImagePath);
    if (cmsUrl) return cmsUrl;
  }

  for (const key of CLUB_COVER_DEMO_FALLBACK_KEYS) {
    const url = getDemoMediaUrl(key);
    if (url) return url;
  }

  return null;
});
