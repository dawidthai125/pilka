import { slugifyTitle } from "@/lib/strings";
import type {
  PublicMatchSummary,
  PublicPlayer,
  PublicSponsor,
  WebsiteGalleryAlbum,
  WebsiteGalleryPhoto,
  WebsiteNews,
  WebsiteSettings,
  WebsiteSocialIntegration,
} from "@/types/website";

export function mapWebsiteSettings(row: Record<string, unknown>): WebsiteSettings {
  return {
    clubId: String(row.club_id),
    publicSiteEnabled: Boolean(row.public_site_enabled),
    logoPath: row.logo_path ? String(row.logo_path) : null,
    logoDarkPath: row.logo_dark_path ? String(row.logo_dark_path) : null,
    primaryColor: String(row.primary_color ?? "#0B3D2E"),
    secondaryColor: String(row.secondary_color ?? "#F4C430"),
    accentColor: String(row.accent_color ?? "#FFFFFF"),
    heroImagePath: row.hero_image_path ? String(row.hero_image_path) : null,
    heroTitle: row.hero_title ? String(row.hero_title) : null,
    heroSubtitle: row.hero_subtitle ? String(row.hero_subtitle) : null,
    contactAddress: row.contact_address ? String(row.contact_address) : null,
    contactEmail: row.contact_email ? String(row.contact_email) : null,
    contactPhone: row.contact_phone ? String(row.contact_phone) : null,
    googleMapsEmbedUrl: row.google_maps_embed_url ? String(row.google_maps_embed_url) : null,
    seoTitle: row.seo_title ? String(row.seo_title) : null,
    seoDescription: row.seo_description ? String(row.seo_description) : null,
    ogImagePath: row.og_image_path ? String(row.og_image_path) : null,
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

export function mapPublicMatch(row: Record<string, unknown>): PublicMatchSummary {
  return {
    id: String(row.id),
    matchDate: String(row.match_date),
    matchTime: String(row.match_time ?? "00:00"),
    homeTeamName: String(row.home_team_name),
    awayTeamName: String(row.away_team_name),
    homeScore: row.home_score != null ? Number(row.home_score) : null,
    awayScore: row.away_score != null ? Number(row.away_score) : null,
    stadium: row.stadium ? String(row.stadium) : null,
    competition: String(row.competition),
    roundNumber: row.round_number != null ? Number(row.round_number) : null,
    status: String(row.status),
    coachNotes: row.coach_notes ? String(row.coach_notes) : null,
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

export const slugifyNewsTitle = slugifyTitle;
