import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/config/env";
import { getPublicWebsiteSitemap } from "@/lib/website/public-data";

const staticRoutes = [
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
  const dynamic = await getPublicWebsiteSitemap();

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));

  const newsEntries: MetadataRoute.Sitemap = dynamic.news.map((item) => ({
    url: `${baseUrl}/aktualnosci/${item.slug}`,
    lastModified: new Date(item.updatedAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const galleryEntries: MetadataRoute.Sitemap = dynamic.gallery.map((item) => ({
    url: `${baseUrl}/galeria/${item.slug}`,
    lastModified: new Date(item.updatedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...newsEntries, ...galleryEntries];
}
