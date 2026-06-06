import { getWebsiteAssetUrl, getWebsiteAssetUrls } from "@/lib/website/assets";
import { getDemoMediaUrl } from "@/lib/website/demo-media";
import type { WebsiteMediaItem, WebsiteMediaSection } from "@/types/website";

export async function resolveWebsiteMediaUrl(item: {
  storagePath: string | null;
  demoAssetKey: string | null;
}): Promise<string | null> {
  if (item.storagePath) {
    const signed = await getWebsiteAssetUrl(item.storagePath);
    if (signed) return signed;
  }
  return getDemoMediaUrl(item.demoAssetKey);
}

export async function resolveWebsiteMediaUrls(items: WebsiteMediaItem[]): Promise<Map<string, string | null>> {
  const storagePaths = items.map((item) => item.storagePath);
  const signedMap = await getWebsiteAssetUrls(storagePaths);
  const urlMap = new Map<string, string | null>();

  for (const item of items) {
    const signed = item.storagePath ? signedMap.get(item.storagePath) ?? null : null;
    urlMap.set(item.id, signed ?? getDemoMediaUrl(item.demoAssetKey));
  }

  return urlMap;
}

export function groupWebsiteMediaBySection(items: WebsiteMediaItem[]) {
  const grouped: Record<WebsiteMediaSection, WebsiteMediaItem[]> = {
    hero: [],
    team: [],
    academy: [],
    gallery: [],
    news: [],
  };

  for (const item of items) {
    if (!item.isActive) continue;
    grouped[item.section].push(item);
  }

  for (const section of Object.keys(grouped) as WebsiteMediaSection[]) {
    grouped[section].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return grouped;
}

export async function buildPublicWebsiteMediaBundle(items: WebsiteMediaItem[]) {
  const activeItems = items.filter((item) => item.isActive);
  const urlMap = await resolveWebsiteMediaUrls(activeItems);
  const grouped = groupWebsiteMediaBySection(activeItems);

  const heroImages = grouped.hero.map((item) => ({
    slotKey: item.slotKey,
    url: urlMap.get(item.id) ?? null,
    caption: item.caption,
  }));

  const teamImages = Object.fromEntries(
    grouped.team.map((item) => [item.teamId ?? item.slotKey, urlMap.get(item.id) ?? null]),
  );

  const academyImages = grouped.academy.map((item) => ({
    id: item.id,
    slotKey: item.slotKey,
    url: urlMap.get(item.id) ?? null,
    caption: item.caption,
  }));

  const galleryImages = grouped.gallery.map((item) => ({
    id: item.id,
    url: urlMap.get(item.id) ?? null,
    caption: item.caption,
  }));

  const newsImages = Object.fromEntries(
    grouped.news.map((item) => [item.newsId ?? item.slotKey, urlMap.get(item.id) ?? null]),
  );

  return {
    heroImages,
    teamImages,
    academyImages,
    galleryImages,
    newsImages,
  };
}
