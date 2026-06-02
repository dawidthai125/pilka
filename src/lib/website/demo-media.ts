export const DEMO_MEDIA_ASSETS = {
  "hero-team": { file: "hero-team.jpg", label: "Drużyna" },
  "hero-match": { file: "hero-match.jpg", label: "Mecz" },
  "hero-stadium": { file: "hero-stadium.jpg", label: "Stadion" },
  "team-seniors": { file: "team-seniors.jpg", label: "Seniorzy" },
  "team-u18": { file: "team-u18.jpg", label: "U18" },
  "team-u12": { file: "team-u12.jpg", label: "U12" },
  "team-youth": { file: "team-youth.jpg", label: "Młodzi" },
  "academy-training": { file: "academy-training.jpg", label: "Trening" },
  "academy-kids": { file: "academy-kids.jpg", label: "Akademia" },
  "academy-path": { file: "academy-path.jpg", label: "Rozwój" },
  "news-matches": { file: "news-matches.jpg", label: "Aktualność — mecz" },
  "news-club": { file: "news-club.jpg", label: "Aktualność — klub" },
  "news-academy": { file: "news-academy.jpg", label: "Aktualność — akademia" },
  "news-transfers": { file: "news-transfers.jpg", label: "Aktualność — transfer" },
  "news-sponsors": { file: "news-sponsors.jpg", label: "Aktualność — sponsor" },
  placeholder: { file: "placeholder.jpg", label: "Placeholder" },
  cover: { file: "cover.jpg", label: "Okładka" },
  "gallery-01": { file: "gallery-01.jpg", label: "Galeria 1" },
  "gallery-02": { file: "gallery-02.jpg", label: "Galeria 2" },
  "gallery-03": { file: "gallery-03.jpg", label: "Galeria 3" },
  "gallery-04": { file: "gallery-04.jpg", label: "Galeria 4" },
  "gallery-05": { file: "gallery-05.jpg", label: "Galeria 5" },
  "gallery-06": { file: "gallery-06.jpg", label: "Galeria 6" },
  "gallery-07": { file: "gallery-07.jpg", label: "Galeria 7" },
  "gallery-08": { file: "gallery-08.jpg", label: "Galeria 8" },
} as const;

export type DemoMediaAssetKey = keyof typeof DEMO_MEDIA_ASSETS;

const CLUB_MEDIA_BASE = "/club-media";

export function getDemoMediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const asset = DEMO_MEDIA_ASSETS[key as DemoMediaAssetKey];
  if (!asset) return `${CLUB_MEDIA_BASE}/hero-stadium.jpg`;
  return `${CLUB_MEDIA_BASE}/${asset.file}`;
}

export function isDemoSvgUrl(url: string | null | undefined): boolean {
  return Boolean(url?.includes("/demo-media/") && url.endsWith(".svg"));
}

export function getDemoMediaLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  const asset = DEMO_MEDIA_ASSETS[key as DemoMediaAssetKey];
  return asset?.label ?? null;
}

export const WEBSITE_MEDIA_SECTION_LABELS = {
  hero: "Hero",
  team: "Drużyny",
  academy: "Akademia",
  gallery: "Galeria",
  news: "Aktualności",
} as const;

export const HERO_MEDIA_SLOTS = [
  { slotKey: "team", label: "Drużyna" },
  { slotKey: "match", label: "Mecz" },
  { slotKey: "stadium", label: "Stadion" },
] as const;

export const ACADEMY_MEDIA_SLOTS = [
  { slotKey: "training", label: "Trening" },
  { slotKey: "kids", label: "Dzieci" },
  { slotKey: "path", label: "Ścieżka rozwoju" },
] as const;
