import { slugifyTitle } from "@/lib/strings";
import type {
  PublicMatchSummary,
  PublicPlayer,
  PublicSponsor,
  PublicTeamCard,
  PublicClubStats,
  WebsiteGalleryAlbum,
  WebsiteGalleryPhoto,
  WebsiteNews,
  WebsiteSettings,
  WebsiteSocialIntegration,
  WebsiteMediaItem,
} from "@/types/website";

function readSettingsField(row: Record<string, unknown>, snake: string, camel: string): unknown {
  return row[snake] ?? row[camel];
}

export function mapWebsiteSettings(row: Record<string, unknown>): WebsiteSettings {
  return {
    clubId: String(row.club_id ?? row.clubId ?? ""),
    publicSiteEnabled: Boolean(row.public_site_enabled ?? row.publicSiteEnabled ?? true),
    logoPath: readSettingsField(row, "logo_path", "logoPath") ? String(readSettingsField(row, "logo_path", "logoPath")) : null,
    logoDarkPath: readSettingsField(row, "logo_dark_path", "logoDarkPath")
      ? String(readSettingsField(row, "logo_dark_path", "logoDarkPath"))
      : null,
    primaryColor: String(readSettingsField(row, "primary_color", "primaryColor") ?? "#0B3D2E"),
    secondaryColor: String(readSettingsField(row, "secondary_color", "secondaryColor") ?? "#F4C430"),
    accentColor: String(readSettingsField(row, "accent_color", "accentColor") ?? "#FFFFFF"),
    heroImagePath: readSettingsField(row, "hero_image_path", "heroImagePath")
      ? String(readSettingsField(row, "hero_image_path", "heroImagePath"))
      : null,
    heroTitle: readSettingsField(row, "hero_title", "heroTitle") ? String(readSettingsField(row, "hero_title", "heroTitle")) : null,
    heroSubtitle: readSettingsField(row, "hero_subtitle", "heroSubtitle")
      ? String(readSettingsField(row, "hero_subtitle", "heroSubtitle"))
      : null,
    contactAddress: readSettingsField(row, "contact_address", "contactAddress")
      ? String(readSettingsField(row, "contact_address", "contactAddress"))
      : null,
    contactEmail: readSettingsField(row, "contact_email", "contactEmail")
      ? String(readSettingsField(row, "contact_email", "contactEmail"))
      : null,
    contactPhone: readSettingsField(row, "contact_phone", "contactPhone")
      ? String(readSettingsField(row, "contact_phone", "contactPhone"))
      : null,
    googleMapsEmbedUrl: readSettingsField(row, "google_maps_embed_url", "googleMapsEmbedUrl")
      ? String(readSettingsField(row, "google_maps_embed_url", "googleMapsEmbedUrl"))
      : null,
    seoTitle: readSettingsField(row, "seo_title", "seoTitle") ? String(readSettingsField(row, "seo_title", "seoTitle")) : null,
    seoDescription: readSettingsField(row, "seo_description", "seoDescription")
      ? String(readSettingsField(row, "seo_description", "seoDescription"))
      : null,
    ogImagePath: readSettingsField(row, "og_image_path", "ogImagePath")
      ? String(readSettingsField(row, "og_image_path", "ogImagePath"))
      : null,
  };
}

export function mapWebsiteNews(row: Record<string, unknown>): WebsiteNews {
  const author = row.author as { full_name?: string } | null;
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: row.excerpt ? String(row.excerpt) : null,
    featuredImagePath: row.featured_image_path ? String(row.featured_image_path) : null,
    content: String(row.content ?? ""),
    category: row.category as WebsiteNews["category"],
    status: row.status as WebsiteNews["status"],
    authorId: row.author_id ? String(row.author_id) : null,
    authorName: author?.full_name ? String(author.full_name) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    aiGenerated: Boolean(row.ai_generated),
    seoTitle: row.seo_title ? String(row.seo_title) : null,
    seoDescription: row.seo_description ? String(row.seo_description) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapWebsiteGalleryAlbum(row: Record<string, unknown>): WebsiteGalleryAlbum {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    slug: String(row.slug),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    category: row.category as WebsiteGalleryAlbum["category"],
    coverImagePath: row.cover_image_path ? String(row.cover_image_path) : null,
    sortOrder: Number(row.sort_order ?? 0),
    isPublished: Boolean(row.is_published),
    photoCount: row.photo_count != null ? Number(row.photo_count) : undefined,
  };
}

export function mapWebsiteGalleryPhoto(row: Record<string, unknown>): WebsiteGalleryPhoto {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    albumId: String(row.album_id),
    imagePath: String(row.image_path),
    caption: row.caption ? String(row.caption) : null,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export function mapWebsiteSocialIntegration(row: Record<string, unknown>): WebsiteSocialIntegration {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    platform: row.platform as WebsiteSocialIntegration["platform"],
    profileUrl: row.profile_url ? String(row.profile_url) : null,
    isEnabled: Boolean(row.is_enabled),
    apiConnected: Boolean(row.api_connected),
    lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : null,
  };
}

export function mapWebsiteMedia(row: Record<string, unknown>): WebsiteMediaItem {
  const team = row.team as Record<string, unknown> | null | undefined;
  const news = row.news as Record<string, unknown> | null | undefined;

  return {
    id: String(row.id),
    clubId: String(row.club_id),
    section: row.section as WebsiteMediaItem["section"],
    slotKey: String(row.slot_key),
    teamId: row.team_id ? String(row.team_id) : null,
    newsId: row.news_id ? String(row.news_id) : null,
    storagePath: row.storage_path ? String(row.storage_path) : null,
    demoAssetKey: row.demo_asset_key ? String(row.demo_asset_key) : null,
    caption: row.caption ? String(row.caption) : null,
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active ?? true),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    teamName: team?.name ? String(team.name) : null,
    newsTitle: news?.title ? String(news.title) : null,
  };
}

function readMatchRowField(row: Record<string, unknown>, snake: string, camel: string): unknown {
  return row[snake] ?? row[camel];
}

export function mapPublicMatch(row: Record<string, unknown>): PublicMatchSummary {
  const matchDate = readMatchRowField(row, "match_date", "matchDate");
  const matchTime = readMatchRowField(row, "match_time", "matchTime");
  const homeScore = readMatchRowField(row, "home_score", "homeScore");
  const awayScore = readMatchRowField(row, "away_score", "awayScore");
  const roundNumber = readMatchRowField(row, "round_number", "roundNumber");
  const coachNotes = readMatchRowField(row, "coach_notes", "coachNotes");

  return {
    id: String(row.id ?? ""),
    matchDate: matchDate != null ? String(matchDate) : "",
    matchTime: matchTime != null ? String(matchTime) : "00:00",
    homeTeamName: String(readMatchRowField(row, "home_team_name", "homeTeamName") ?? ""),
    awayTeamName: String(readMatchRowField(row, "away_team_name", "awayTeamName") ?? ""),
    homeScore: homeScore != null ? Number(homeScore) : null,
    awayScore: awayScore != null ? Number(awayScore) : null,
    stadium: readMatchRowField(row, "stadium", "stadium") ? String(readMatchRowField(row, "stadium", "stadium")) : null,
    competition: readMatchRowField(row, "competition", "competition")
      ? String(readMatchRowField(row, "competition", "competition"))
      : "",
    roundNumber: roundNumber != null ? Number(roundNumber) : null,
    status: String(readMatchRowField(row, "status", "status") ?? "planned"),
    coachNotes: coachNotes ? String(coachNotes) : null,
  };
}

export function mapPublicSponsor(row: Record<string, unknown>): PublicSponsor {
  return {
    id: String(row.id),
    companyName: String(row.company_name),
    logoUrl: row.logo_url ? String(row.logo_url) : null,
    website: row.website ? String(row.website) : null,
    publicTier: row.public_tier as PublicSponsor["publicTier"],
    publicDescription: row.public_description ? String(row.public_description) : null,
  };
}

export function mapPublicPlayer(
  row: Record<string, unknown>,
  stats?: { goals?: number; assists?: number; matchesPlayed?: number },
): PublicPlayer {
  return {
    id: String(row.id),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    jerseyNumber: row.jersey_number != null ? Number(row.jersey_number) : null,
    position: row.primary_position ? String(row.primary_position) : null,
    goals: stats?.goals ?? 0,
    assists: stats?.assists ?? 0,
    matchesPlayed: stats?.matchesPlayed ?? 0,
  };
}

export function mapPublicPlayerFromRpc(row: Record<string, unknown>): PublicPlayer {
  return {
    id: String(row.id),
    firstName: String(row.firstName ?? ""),
    lastName: String(row.lastName ?? ""),
    jerseyNumber: row.jerseyNumber != null ? Number(row.jerseyNumber) : null,
    position: row.position ? String(row.position) : null,
    goals: Number(row.goals ?? 0),
    assists: Number(row.assists ?? 0),
    matchesPlayed: Number(row.matchesPlayed ?? 0),
  };
}

export function mapPublicSponsorFromRpc(row: Record<string, unknown>): PublicSponsor {
  return {
    id: String(row.id),
    companyName: String(row.companyName ?? ""),
    logoUrl: row.logoUrl ? String(row.logoUrl) : null,
    website: row.website ? String(row.website) : null,
    publicTier: row.publicTier as PublicSponsor["publicTier"],
    publicDescription: row.publicDescription ? String(row.publicDescription) : null,
  };
}

export function mapPublicTeamFromRpc(row: Record<string, unknown>): PublicTeamCard {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    category: String(row.category ?? ""),
    season: row.season ? String(row.season) : null,
    playersCount: Number(row.playersCount ?? 0),
    coachName: row.coachName ? String(row.coachName) : null,
    description: row.description ? String(row.description) : null,
    ageGroup: row.ageGroup ? String(row.ageGroup) : null,
  };
}

export function mapPublicClubStats(row: Record<string, unknown>): PublicClubStats {
  return {
    playersCount: Number(row.playersCount ?? 0),
    teamsCount: Number(row.teamsCount ?? 0),
    matchesPlayed: Number(row.matchesPlayed ?? 0),
    yearsActive: Number(row.yearsActive ?? 1),
  };
}

export const slugifyNewsTitle = slugifyTitle;
