import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/config/env";
import { clubPublicPath, listActivePublicClubs } from "@/lib/tenant/public-club";
import { getPublicWebsiteSitemap } from "@/lib/website/public-data";

const staticSubpaths = [
  { path: "", changeFrequency: "daily" as const, priority: 1 },
  { path: "/aktualnosci", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/mecze", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/druzyna", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/tabela", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/sponsorzy", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/galeria", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/kontakt", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/kibic", changeFrequency: "monthly" as const, priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const clubs = await listActivePublicClubs();
  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  for (const club of clubs) {
    const dynamic = await getPublicWebsiteSitemap(club.slug);

    for (const { path, changeFrequency, priority } of staticSubpaths) {
      entries.push({
        url: `${baseUrl}${clubPublicPath(club.slug, path)}`,
        lastModified: new Date(),
        changeFrequency,
        priority,
      });
    }

    for (const item of dynamic.news) {
      entries.push({
        url: `${baseUrl}${clubPublicPath(club.slug, `/aktualnosci/${item.slug}`)}`,
        lastModified: new Date(item.updatedAt),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const item of dynamic.gallery) {
      entries.push({
        url: `${baseUrl}${clubPublicPath(club.slug, `/galeria/${item.slug}`)}`,
        lastModified: new Date(item.updatedAt),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
