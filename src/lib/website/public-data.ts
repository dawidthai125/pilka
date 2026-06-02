import { cache } from "react";

import { siteConfig } from "@/config/site";
import { DEFAULT_CLUB_ID } from "@/lib/auth/session";
import { DEFAULT_COMPETITION, DEFAULT_SEASON } from "@/lib/matches/constants";
import { mapLeagueEntry } from "@/lib/matches/mappers";
import { getClubBrandingName } from "@/lib/club/names";
import { createClient } from "@/lib/supabase/server";
import type { LeagueTableEntry } from "@/types/matches";
import type {
  PublicMatchSummary,
  PublicPlayer,
  PublicSponsor,
  PublicTeamStats,
  PublicTeamCard,
  PublicClubStats,
  PublicWebsiteHome,
  WebsiteGalleryAlbum,
  WebsiteGalleryPhoto,
  WebsiteNews,
  WebsiteNewsCategory,
  WebsiteSettings,
  WebsiteSocialIntegration,
  WebsiteMediaItem,
} from "@/types/website";
import {
  mapPublicMatch,
  mapPublicPlayerFromRpc,
  mapPublicSponsorFromRpc,
  mapPublicTeamFromRpc,
  mapPublicClubStats,
  mapWebsiteGalleryAlbum,
  mapWebsiteGalleryPhoto,
  mapWebsiteNews,
  mapWebsiteSettings,
  mapWebsiteSocialIntegration,
  mapWebsiteMedia,
} from "@/lib/website/mappers";

export const DEFAULT_PUBLIC_CLUB_SLUG = siteConfig.defaultClubSlug;

const MATCH_PUBLIC_SELECT =
  "id, match_date, match_time, home_team_name, away_team_name, home_score, away_score, stadium, competition, round_number, status";

export const resolvePublicClubId = cache(async (slug: string = DEFAULT_PUBLIC_CLUB_SLUG): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("clubs").select("id").eq("slug", slug).eq("status", "active").maybeSingle();
  return data?.id ? String(data.id) : null;
});

export const getPublicWebsiteHome = cache(
  async (slug: string = DEFAULT_PUBLIC_CLUB_SLUG): Promise<PublicWebsiteHome | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_website_home", { p_club_slug: slug });
    if (error || !data) return null;

    const payload = data as Record<string, unknown>;
    const club = payload.club as Record<string, unknown>;
    const settingsRaw = payload.settings as Record<string, unknown>;
    const clubId = String(club.id);

    const settings: WebsiteSettings = {
      ...mapWebsiteSettings({ club_id: clubId, public_site_enabled: true, ...settingsRaw }),
    };

    return {
      club: {
        id: clubId,
        slug: String(club.slug),
        publicName: String(club.publicName ?? club.public_name ?? ""),
        officialName: String(club.officialName ?? club.official_name ?? ""),
        competitionLevel: club.competitionLevel ? String(club.competitionLevel) : null,
        voivodeship: club.voivodeship ? String(club.voivodeship) : null,
      },
      settings,
      nextMatch: payload.nextMatch ? mapPublicMatch(payload.nextMatch as Record<string, unknown>) : null,
      lastResult: payload.lastResult ? mapPublicMatch(payload.lastResult as Record<string, unknown>) : null,
      newsCount: Number(payload.newsCount ?? 0),
      sponsorCount: Number(payload.sponsorCount ?? 0),
    };
  },
);

export const getPublicWebsiteSettings = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<WebsiteSettings | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("website_settings").select("*").eq("club_id", clubId).maybeSingle();
    if (error || !data) return null;
    return mapWebsiteSettings(data as Record<string, unknown>);
  },
);

export const getPublicNews = cache(
  async (
    clubId: string = DEFAULT_CLUB_ID,
    options?: { category?: string; limit?: number; publishedOnly?: boolean },
  ): Promise<WebsiteNews[]> => {
    const supabase = await createClient();
    let query = supabase
      .from("website_news")
      .select("*, author:author_id(full_name)")
      .eq("club_id", clubId)
      .order("published_at", { ascending: false, nullsFirst: false });

    if (options?.publishedOnly !== false) query = query.eq("status", "published");
    if (options?.category) query = query.eq("category", options.category as WebsiteNewsCategory);
    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapWebsiteNews(row as Record<string, unknown>));
  },
);

export const getPublicNewsBySlug = cache(
  async (slug: string, clubId: string = DEFAULT_CLUB_ID): Promise<WebsiteNews | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("website_news")
      .select("*, author:author_id(full_name)")
      .eq("club_id", clubId)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error || !data) return null;
    return mapWebsiteNews(data as Record<string, unknown>);
  },
);

export const getPublicMatches = cache(
  async (
    clubId: string = DEFAULT_CLUB_ID,
    filter: "all" | "upcoming" | "results" = "all",
    limit = 50,
  ): Promise<PublicMatchSummary[]> => {
    const supabase = await createClient();
    let query = supabase
      .from("matches")
      .select(MATCH_PUBLIC_SELECT)
      .eq("club_id", clubId)
      .order("match_date", { ascending: filter === "upcoming" })
      .order("match_time", { ascending: filter === "upcoming" })
      .limit(limit);

    if (filter === "upcoming") {
      query = query.in("status", ["planned", "in_progress"]).gte("match_date", new Date().toISOString().slice(0, 10));
    } else if (filter === "results") {
      query = query.eq("status", "completed");
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapPublicMatch(row as Record<string, unknown>));
  },
);

export const getPublicMatchById = cache(
  async (matchId: string, clubId: string = DEFAULT_CLUB_ID): Promise<PublicMatchSummary | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("matches")
      .select(MATCH_PUBLIC_SELECT)
      .eq("club_id", clubId)
      .eq("id", matchId)
      .maybeSingle();
    if (error || !data) return null;
    return mapPublicMatch(data as Record<string, unknown>);
  },
);

export const getPublicLeagueTable = cache(
  async (
    clubId: string = DEFAULT_CLUB_ID,
    competition?: string,
    season?: string,
  ): Promise<{ entries: LeagueTableEntry[]; ownTeamName: string; competition: string; season: string }> => {
    const supabase = await createClient();

    let resolvedCompetition = competition;
    let resolvedSeason = season;

    if (!resolvedCompetition || !resolvedSeason) {
      const { data: activeSeason } = await supabase
        .from("league_seasons")
        .select("name")
        .eq("club_id", clubId)
        .eq("is_active", true)
        .order("name", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: activeCompetition } = await supabase
        .from("league_competitions")
        .select("name, season:league_seasons(name)")
        .eq("club_id", clubId)
        .eq("is_active", true)
        .order("name")
        .limit(1)
        .maybeSingle();

      resolvedSeason =
        resolvedSeason ??
        (activeSeason?.name ? String(activeSeason.name) : DEFAULT_SEASON);
      resolvedCompetition =
        resolvedCompetition ??
        (activeCompetition?.name ? String(activeCompetition.name) : DEFAULT_COMPETITION);
    }

    const clubRes = await supabase.from("clubs").select("public_name, official_name").eq("id", clubId).maybeSingle();
    const ownTeamName = clubRes.data
      ? getClubBrandingName({ publicName: String(clubRes.data.public_name) })
      : "Klub";

    let query = supabase.from("league_table_entries").select("*").eq("club_id", clubId);
    if (resolvedCompetition) query = query.eq("competition", resolvedCompetition);
    if (resolvedSeason) query = query.eq("season", resolvedSeason);

    const { data, error } = await query.order("points", { ascending: false });
    if (error) throw new Error(error.message);

    const entries = (data ?? [])
      .map(mapLeagueEntry)
      .sort(
        (a, b) =>
          b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor,
      );

    return {
      entries,
      ownTeamName,
      competition: resolvedCompetition ?? DEFAULT_COMPETITION,
      season: resolvedSeason ?? DEFAULT_SEASON,
    };
  },
);

export const getPublicPlayers = cache(
  async (slug: string = DEFAULT_PUBLIC_CLUB_SLUG): Promise<PublicPlayer[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_players", { p_club_slug: slug });
    if (error) throw new Error(error.message);
    const rows = Array.isArray(data) ? data : [];
    return rows.map((row) => mapPublicPlayerFromRpc(row as Record<string, unknown>));
  },
);

export const getPublicSponsors = cache(
  async (slug: string = DEFAULT_PUBLIC_CLUB_SLUG): Promise<PublicSponsor[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_sponsors", { p_club_slug: slug });
    if (error) throw new Error(error.message);
    const rows = Array.isArray(data) ? data : [];
    return rows.map((row) => mapPublicSponsorFromRpc(row as Record<string, unknown>));
  },
);

export type PublicSitemapUrls = {
  news: Array<{ slug: string; updatedAt: string }>;
  gallery: Array<{ slug: string; updatedAt: string }>;
};

export const getPublicWebsiteSitemap = cache(
  async (slug: string = DEFAULT_PUBLIC_CLUB_SLUG): Promise<PublicSitemapUrls> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_website_sitemap", { p_club_slug: slug });
    if (error || !data || typeof data !== "object") {
      return { news: [], gallery: [] };
    }

    const payload = data as Record<string, unknown>;
    const mapEntries = (value: unknown) =>
      (Array.isArray(value) ? value : []).map((row) => {
        const item = row as Record<string, unknown>;
        return {
          slug: String(item.slug),
          updatedAt: String(item.updatedAt ?? new Date().toISOString()),
        };
      });

    return {
      news: mapEntries(payload.news),
      gallery: mapEntries(payload.gallery),
    };
  },
);

export const getPublicGalleryAlbums = cache(
  async (clubId: string = DEFAULT_CLUB_ID, publishedOnly = true): Promise<WebsiteGalleryAlbum[]> => {
    const supabase = await createClient();
    let query = supabase.from("website_gallery_albums").select("*").eq("club_id", clubId).order("sort_order");
    if (publishedOnly) query = query.eq("is_published", true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapWebsiteGalleryAlbum(row as Record<string, unknown>));
  },
);

export const getPublicGalleryPhotos = cache(
  async (albumId: string, clubId: string = DEFAULT_CLUB_ID): Promise<WebsiteGalleryPhoto[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("website_gallery_photos")
      .select("*")
      .eq("club_id", clubId)
      .eq("album_id", albumId)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapWebsiteGalleryPhoto(row as Record<string, unknown>));
  },
);

export const getPublicGalleryAlbumBySlug = cache(
  async (slug: string, clubId: string = DEFAULT_CLUB_ID): Promise<WebsiteGalleryAlbum | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("website_gallery_albums")
      .select("*")
      .eq("club_id", clubId)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error || !data) return null;
    return mapWebsiteGalleryAlbum(data as Record<string, unknown>);
  },
);

export const getPublicSocialIntegrations = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<WebsiteSocialIntegration[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("website_social_integrations")
      .select("*")
      .eq("club_id", clubId)
      .order("platform");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapWebsiteSocialIntegration(row as Record<string, unknown>));
  },
);

export const getPublicTeamStats = cache(
  async (slug: string = DEFAULT_PUBLIC_CLUB_SLUG): Promise<PublicTeamStats | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_team_stats", { p_club_slug: slug });
    if (error || !data) return null;
    const row = data as Record<string, number>;
    return {
      playersCount: Number(row.playersCount ?? 0),
      goals: Number(row.goals ?? 0),
      assists: Number(row.assists ?? 0),
      matchesPlayed: Number(row.matchesPlayed ?? 0),
    };
  },
);

export const getPublicTeams = cache(
  async (slug: string = DEFAULT_PUBLIC_CLUB_SLUG): Promise<PublicTeamCard[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_teams", { p_club_slug: slug });

    if (!error && Array.isArray(data)) {
      return data.map((row) => mapPublicTeamFromRpc(row as Record<string, unknown>));
    }

    const clubId = await getPublicClubId(slug);
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name, category, season")
      .eq("club_id", clubId)
      .eq("is_active", true)
      .order("name");

    return (teams ?? []).map((row) =>
      mapPublicTeamFromRpc({
        id: row.id,
        name: row.name,
        category: row.category,
        season: row.season,
        playersCount: 0,
        coachName: null,
        description: null,
        ageGroup: null,
      }),
    );
  },
);

export const getPublicClubStats = cache(
  async (slug: string = DEFAULT_PUBLIC_CLUB_SLUG): Promise<PublicClubStats | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_club_stats", { p_club_slug: slug });
    if (!error && data && typeof data === "object") {
      return mapPublicClubStats(data as Record<string, unknown>);
    }

    const clubId = await getPublicClubId(slug);
    const [teamsRes, matchesRes, stats] = await Promise.all([
      supabase
        .from("teams")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("is_active", true),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("status", "completed"),
      getPublicTeamStats(slug),
    ]);

    return {
      playersCount: stats?.playersCount ?? 0,
      teamsCount: teamsRes.count ?? 0,
      matchesPlayed: matchesRes.count ?? 0,
      yearsActive: 1,
    };
  },
);

export async function getPublicClubId(slug: string = DEFAULT_PUBLIC_CLUB_SLUG): Promise<string> {
  const id = await resolvePublicClubId(slug);
  return id ?? DEFAULT_CLUB_ID;
}

export const getPublicWebsiteMedia = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<WebsiteMediaItem[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("website_media")
      .select("*")
      .eq("club_id", clubId)
      .eq("is_active", true)
      .order("sort_order");

    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapWebsiteMedia(row as Record<string, unknown>));
  },
);
