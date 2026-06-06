import { cache } from "react";

import { mapLeagueEntry } from "@/lib/matches/mappers";
import { resolvePublicCoverImageUrl } from "@/lib/website/cover-image";
import { buildPublicWebsiteMediaBundle } from "@/lib/website/media";
import {
  mapPublicMatch,
  mapPublicPlayerFromRpc,
  mapPublicSponsorFromRpc,
  mapPublicTeamFromRpc,
  mapWebsiteMedia,
  mapWebsiteNews,
  mapWebsiteSettings,
} from "@/lib/website/mappers";
import { createClient } from "@/lib/supabase/server";
import type { LeagueTableEntry } from "@/types/matches";
import type {
  PublicMatchSummary,
  PublicNewsPreviewItem,
  PublicPlayer,
  PublicSponsor,
  PublicTeamCard,
  PublicTeamStats,
  WebsiteNews,
} from "@/types/website";

export type PublicHomeBundleRaw = Record<string, unknown>;

export type HydratedPublicHomePage = {
  clubName: string;
  officialName: string;
  heroTitle: string;
  heroSubtitle: string | null;
  coverImageUrl: string | null;
  news: PublicNewsPreviewItem[];
  nextMatch: PublicMatchSummary | null;
  recentResults: PublicMatchSummary[];
  league: {
    entries: LeagueTableEntry[];
    ownTeamName: string;
    competition: string;
    season: string;
  };
  teamStats: PublicTeamStats | null;
  players: PublicPlayer[];
  topScorers: PublicPlayer[];
  teams: PublicTeamCard[];
  academyImages: Array<{ id?: string; slotKey: string; url: string | null; caption: string | null }>;
  contactPhone: string | null;
  contactAddress: string | null;
  sponsors: PublicSponsor[];
};

export const getPublicHomeBundle = cache(
  async (slug: string): Promise<PublicHomeBundleRaw | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_home_bundle", { p_club_slug: slug });
    if (error || !data || typeof data !== "object") return null;
    return data as PublicHomeBundleRaw;
  },
);

function mapBundleNewsItem(row: Record<string, unknown>): WebsiteNews {
  return mapWebsiteNews({
    id: row.id,
    club_id: "",
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    featured_image_path: row.featuredImagePath,
    content: "",
    category: row.category,
    status: "published",
    author_id: null,
    author: row.authorName ? { full_name: row.authorName } : null,
    published_at: row.publishedAt,
    ai_generated: false,
    seo_title: null,
    seo_description: null,
    created_at: row.publishedAt ?? new Date().toISOString(),
    updated_at: row.publishedAt ?? new Date().toISOString(),
  });
}

function mapBundleLeagueEntries(raw: PublicHomeBundleRaw) {
  const league = raw.league as Record<string, unknown> | undefined;
  const entries = Array.isArray(league?.entries) ? league.entries : [];
  const mapped = entries.map((row, index) => {
    const item = row as Record<string, unknown>;
    return mapLeagueEntry({
      id: String(item.id ?? `row-${index}`),
      competition: String(league?.competition ?? ""),
      season: String(league?.season ?? ""),
      team_name: String(item.teamName ?? ""),
      played: Number(item.played ?? 0),
      won: Number(item.won ?? 0),
      drawn: Number(item.drawn ?? 0),
      lost: Number(item.lost ?? 0),
      goals_for: Number(item.goalsFor ?? 0),
      goals_against: Number(item.goalsAgainst ?? 0),
      points: Number(item.points ?? 0),
      is_own_club: Boolean(item.isOwnClub),
    });
  });

  return {
    entries: mapped.sort(
      (a, b) =>
        b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor,
    ),
    ownTeamName: String(league?.ownTeamName ?? ""),
    competition: String(league?.competition ?? ""),
    season: String(league?.season ?? ""),
  };
}

export async function hydratePublicHomeBundle(raw: PublicHomeBundleRaw): Promise<HydratedPublicHomePage> {
  const club = raw.club as Record<string, unknown>;
  const branding = raw.branding as Record<string, unknown>;
  const clubId = String(club.id);

  const settings = mapWebsiteSettings({
    club_id: clubId,
    public_site_enabled: true,
    ...branding,
  });

  const mediaItems = (Array.isArray(raw.media) ? raw.media : []).map((row) =>
    mapWebsiteMedia({ club_id: clubId, ...(row as Record<string, unknown>) }),
  );

  const mediaBundle = await buildPublicWebsiteMediaBundle(mediaItems);
  const coverImageUrl = await resolvePublicCoverImageUrl(settings);

  const newsRows = Array.isArray(raw.news) ? raw.news : [];
  const news: PublicNewsPreviewItem[] = newsRows.map((row) => {
    const item = mapBundleNewsItem(row as Record<string, unknown>);
    const featuredImageUrl =
      mediaBundle.newsImages[item.id] ??
      (item.featuredImagePath?.startsWith("club-media/") ? `/${item.featuredImagePath}` : null);
    return { ...item, featuredImageUrl };
  });

  const teamsRaw = Array.isArray(raw.teams) ? raw.teams : [];
  const teams = teamsRaw.map((row) => {
    const team = mapPublicTeamFromRpc(row as Record<string, unknown>);
    return {
      ...team,
      imageUrl: mediaBundle.teamImages[team.id] ?? null,
    };
  });

  const academyImages = mediaBundle.academyImages;

  const stats = raw.stats as Record<string, unknown> | undefined;
  const teamStatsRaw = stats?.team as Record<string, unknown> | undefined;

  return {
    clubName: String(club.publicName ?? ""),
    officialName: String(club.officialName ?? ""),
    heroTitle: String(branding.heroTitle ?? club.publicName ?? ""),
    heroSubtitle: branding.heroSubtitle ? String(branding.heroSubtitle) : null,
    coverImageUrl,
    news,
    nextMatch: raw.nextMatch ? mapPublicMatch(raw.nextMatch as Record<string, unknown>) : null,
    recentResults: (Array.isArray(raw.recentResults) ? raw.recentResults : []).map((row) =>
      mapPublicMatch(row as Record<string, unknown>),
    ),
    league: mapBundleLeagueEntries(raw),
    teamStats: teamStatsRaw
      ? {
          playersCount: Number(teamStatsRaw.playersCount ?? 0),
          goals: Number(teamStatsRaw.goals ?? 0),
          assists: Number(teamStatsRaw.assists ?? 0),
          matchesPlayed: Number(teamStatsRaw.matchesPlayed ?? 0),
        }
      : null,
    players: (Array.isArray(raw.players) ? raw.players : []).map((row) =>
      mapPublicPlayerFromRpc(row as Record<string, unknown>),
    ),
    topScorers: (Array.isArray(raw.topScorers) ? raw.topScorers : []).map((row) =>
      mapPublicPlayerFromRpc(row as Record<string, unknown>),
    ),
    teams,
    academyImages,
    contactPhone: settings.contactPhone,
    contactAddress: settings.contactAddress,
    sponsors: (Array.isArray(raw.sponsors) ? raw.sponsors : []).map((row) =>
      mapPublicSponsorFromRpc(row as Record<string, unknown>),
    ),
  };
}

export async function loadHydratedPublicHomePage(slug: string): Promise<HydratedPublicHomePage | null> {
  const raw = await getPublicHomeBundle(slug);
  if (!raw) return null;
  return hydratePublicHomeBundle(raw);
}

/** Metryki audytu — round-trip Supabase RPC na warstwie danych homepage (bez layoutu). */
export const PUBLIC_HOME_BUNDLE_QUERY_COUNT = 1;
