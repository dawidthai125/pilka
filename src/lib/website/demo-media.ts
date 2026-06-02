export const DEMO_MEDIA_ASSETS = {
  "hero-team": { file: "hero-team.svg", label: "Drużyna" },
  "hero-match": { file: "hero-match.svg", label: "Mecz" },
  "hero-stadium": { file: "hero-stadium.svg", label: "Stadion" },
  "team-seniors": { file: "team-seniors.svg", label: "Seniorzy" },
  "team-u18": { file: "team-u18.svg", label: "U18" },
  "team-u12": { file: "team-u12.svg", label: "U12" },
  "team-youth": { file: "team-youth.svg", label: "Młodzi" },
  "academy-training": { file: "academy-training.svg", label: "Trening" },
  "academy-kids": { file: "academy-kids.svg", label: "Akademia" },
  "academy-path": { file: "academy-path.svg", label: "Rozwój" },
  "news-matches": { file: "news-matches.svg", label: "Aktualność — mecz" },
  "news-club": { file: "news-club.svg", label: "Aktualność — klub" },
  "news-academy": { file: "news-academy.svg", label: "Aktualność — akademia" },
  "news-transfers": { file: "news-transfers.svg", label: "Aktualność — transfer" },
  "news-sponsors": { file: "news-sponsors.svg", label: "Aktualność — sponsor" },
  placeholder: { file: "placeholder.svg", label: "Placeholder" },
  "gallery-01": { file: "gallery-01.svg", label: "Galeria 1" },
  "gallery-02": { file: "gallery-02.svg", label: "Galeria 2" },
  "gallery-03": { file: "gallery-03.svg", label: "Galeria 3" },
  "gallery-04": { file: "gallery-04.svg", label: "Galeria 4" },
  "gallery-05": { file: "gallery-05.svg", label: "Galeria 5" },
  "gallery-06": { file: "gallery-06.svg", label: "Galeria 6" },
  "gallery-07": { file: "gallery-07.svg", label: "Galeria 7" },
  "gallery-08": { file: "gallery-08.svg", label: "Galeria 8" },
} as const;

export type DemoMediaAssetKey = keyof typeof DEMO_MEDIA_ASSETS;

export function getDemoMediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const asset = DEMO_MEDIA_ASSETS[key as DemoMediaAssetKey];
  if (!asset) return `/demo-media/placeholder.svg`;
  return `/demo-media/${asset.file}`;
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
