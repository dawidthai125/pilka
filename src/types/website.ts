export const WEBSITE_NEWS_CATEGORIES = [
  "matches",
  "club",
  "transfers",
  "academy",
  "sponsors",
  "other",
] as const;

export type WebsiteNewsCategory = (typeof WEBSITE_NEWS_CATEGORIES)[number];

export const WEBSITE_NEWS_STATUSES = [
  "draft",
  "pending_review",
  "published",
  "archived",
] as const;

export type WebsiteNewsStatus = (typeof WEBSITE_NEWS_STATUSES)[number];

export const WEBSITE_GALLERY_CATEGORIES = [
  "matches",
  "trainings",
  "club",
  "events",
] as const;

export type WebsiteGalleryCategory = (typeof WEBSITE_GALLERY_CATEGORIES)[number];

export const WEBSITE_SPONSOR_TIERS = ["main", "supporting", "partner"] as const;

export type WebsiteSponsorTier = (typeof WEBSITE_SPONSOR_TIERS)[number];

export const WEBSITE_SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
] as const;

export type WebsiteSocialPlatform = (typeof WEBSITE_SOCIAL_PLATFORMS)[number];

export type WebsiteSettings = {
  clubId: string;
  publicSiteEnabled: boolean;
  logoPath: string | null;
  logoDarkPath: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  heroImagePath: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  contactAddress: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  googleMapsEmbedUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImagePath: string | null;
};

export type WebsiteNews = {
  id: string;
  clubId: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featuredImagePath: string | null;
  content: string;
  category: WebsiteNewsCategory;
  status: WebsiteNewsStatus;
  authorId: string | null;
  authorName: string | null;
  publishedAt: string | null;
  aiGenerated: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WebsiteGalleryAlbum = {
  id: string;
  clubId: string;
  slug: string;
  title: string;
  description: string | null;
  category: WebsiteGalleryCategory;
  coverImagePath: string | null;
  sortOrder: number;
  isPublished: boolean;
  photoCount?: number;
};

export type WebsiteGalleryPhoto = {
  id: string;
  clubId: string;
  albumId: string;
  imagePath: string;
  caption: string | null;
  sortOrder: number;
};

export type WebsiteSocialIntegration = {
  id: string;
  clubId: string;
  platform: WebsiteSocialPlatform;
  profileUrl: string | null;
  isEnabled: boolean;
  apiConnected: boolean;
  lastSyncAt: string | null;
};

export type PublicSponsor = {
  id: string;
  companyName: string;
  logoUrl: string | null;
  website: string | null;
  publicTier: WebsiteSponsorTier | null;
  publicDescription: string | null;
};

export type PublicMatchSummary = {
  id: string;
  matchDate: string;
  matchTime: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  stadium: string | null;
  competition: string;
  roundNumber: number | null;
  status: string;
  coachNotes: string | null;
};

export type PublicPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  position: string | null;
  goals: number;
  assists: number;
  matchesPlayed: number;
};

export type PublicWebsiteHome = {
  club: {
    id: string;
    slug: string;
    publicName: string;
    officialName: string;
    competitionLevel: string | null;
    voivodeship: string | null;
  };
  settings: WebsiteSettings;
  nextMatch: PublicMatchSummary | null;
  lastResult: PublicMatchSummary | null;
  newsCount: number;
  sponsorCount: number;
};

export type PublicTeamStats = {
  playersCount: number;
  goals: number;
  assists: number;
  matchesPlayed: number;
};

export type PublicTeamCard = {
  id: string;
  name: string;
  category: string;
  season: string | null;
  playersCount: number;
  coachName: string | null;
  description: string | null;
  ageGroup: string | null;
};

export type PublicClubStats = {
  playersCount: number;
  teamsCount: number;
  matchesPlayed: number;
  yearsActive: number;
};

export type PublicGalleryPreviewItem = {
  slug: string;
  title: string;
  category: WebsiteGalleryCategory;
  coverImageUrl: string | null;
};

export type PublicNewsPreviewItem = WebsiteNews & {
  featuredImageUrl: string | null;
};

export const WEBSITE_MEDIA_SECTIONS = ["hero", "team", "academy", "gallery", "news"] as const;

export type WebsiteMediaSection = (typeof WEBSITE_MEDIA_SECTIONS)[number];

export type WebsiteMediaItem = {
  id: string;
  clubId: string;
  section: WebsiteMediaSection;
  slotKey: string;
  teamId: string | null;
  newsId: string | null;
  storagePath: string | null;
  demoAssetKey: string | null;
  caption: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  teamName?: string | null;
  newsTitle?: string | null;
  imageUrl?: string | null;
};

export type PublicHeroMediaImage = {
  slotKey: string;
  url: string | null;
  caption: string | null;
};

export type PublicAcademyMediaImage = {
  id?: string;
  slotKey: string;
  url: string | null;
  caption: string | null;
};

export type PublicGalleryMediaItem = {
  id: string;
  url: string | null;
  caption: string | null;
};

export type PublicTeamCardWithMedia = PublicTeamCard & {
  imageUrl: string | null;
};
