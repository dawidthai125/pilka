import type { Metadata } from "next";

import { getSiteUrl } from "@/config/env";
import { siteConfig } from "@/config/site";
import { getWebsiteAssetUrl } from "@/lib/website/assets";
import { getPublicWebsiteHome } from "@/lib/website/public-data";

export function getPublicSiteUrl(path = ""): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function buildPublicPageMetadata(
  pageTitle: string,
  path: string,
  description?: string,
): Promise<Metadata> {
  const home = await getPublicWebsiteHome();
  const clubName = home?.club.publicName ?? siteConfig.name;
  const metaDescription = description ?? home?.settings.seoDescription ?? siteConfig.description;
  const canonical = getPublicSiteUrl(path);
  const ogImagePath = home?.settings.ogImagePath ?? home?.settings.heroImagePath ?? home?.settings.logoPath;
  const ogImageUrl = ogImagePath ? await getWebsiteAssetUrl(ogImagePath) : null;

  return {
    title: `${pageTitle} | ${clubName}`,
    description: metaDescription,
    alternates: { canonical },
    openGraph: {
      title: `${pageTitle} | ${clubName}`,
      description: metaDescription,
      url: canonical,
      siteName: clubName,
      locale: siteConfig.locale,
      type: "website",
      ...(ogImageUrl ? { images: [{ url: ogImageUrl, alt: clubName }] } : {}),
    },
    twitter: {
      card: ogImageUrl ? "summary_large_image" : "summary",
      title: `${pageTitle} | ${clubName}`,
      description: metaDescription,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}
