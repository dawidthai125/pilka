import type {
  WebsiteGalleryCategory,
  WebsiteNewsCategory,
  WebsiteNewsStatus,
  WebsiteSocialPlatform,
  WebsiteSponsorTier,
} from "@/types/website";

export {
  WEBSITE_NEWS_CATEGORIES,
  WEBSITE_GALLERY_CATEGORIES,
  WEBSITE_SOCIAL_PLATFORMS,
  WEBSITE_SPONSOR_TIERS,
} from "@/types/website";

/** ISR — zgodne z Vercel (revalidate segmentów publicznych) */
export const PUBLIC_WEBSITE_REVALIDATE_SECONDS = 60;

export const WEBSITE_NEWS_CATEGORY_LABELS: Record<WebsiteNewsCategory, string> = {
  matches: "Mecze",
  club: "Klub",
  transfers: "Transfery",
  academy: "Akademia",
  sponsors: "Sponsorzy",
  other: "Inne",
};

export const WEBSITE_NEWS_STATUS_LABELS: Record<WebsiteNewsStatus, string> = {
  draft: "Szkic",
  pending_review: "Do zatwierdzenia",
  published: "Opublikowany",
  archived: "Archiwum",
};

export const WEBSITE_GALLERY_CATEGORY_LABELS: Record<WebsiteGalleryCategory, string> = {
  matches: "Mecze",
  trainings: "Treningi",
  club: "Klub",
  events: "Wydarzenia",
};

export const WEBSITE_SPONSOR_TIER_LABELS: Record<WebsiteSponsorTier, string> = {
  main: "Sponsorzy główni",
  supporting: "Sponsorzy wspierający",
  partner: "Partnerzy",
};

export const WEBSITE_SOCIAL_PLATFORM_LABELS: Record<WebsiteSocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export const DEFAULT_WEBSITE_COLORS = {
  primary: "#0B3D2E",
  secondary: "#F4C430",
  accent: "#FFFFFF",
} as const;

/** Nawigacja publiczna — zgodna z mockupem landing page */
export const PUBLIC_NAV_LINKS = [
  { href: "/aktualnosci", label: "Aktualności" },
  { href: "/druzyna", label: "Drużyny" },
  { href: "/#akademia", label: "Akademia" },
  { href: "/mecze", label: "Mecze" },
  { href: "/galeria", label: "Galeria" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

export const CLUB_SCENE_DARK = "bg-[#062820] text-white";
export const CLUB_SCENE_LIGHT = "bg-[#f7f5f0] text-[#0B3D2E]";
export const CLUB_DISPLAY_CLASS = "[font-family:var(--font-club-display)]";
/** @deprecated Użyj resolvePublicCoverImageUrl — nie wskazuj cover.jpg (losowy Picsum). */
export const CLUB_COVER_IMAGE = "/club-media/hero-stadium.jpg";
export const CLUB_DASHBOARD_COVER = "/club-media/hero-stadium.jpg";
