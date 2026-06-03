import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { resolveClubSlugFromHost } from "@/lib/tenant/club-public-routing";

export type ResolvedPublicClub = {
  id: string;
  slug: string;
  publicName: string;
  officialName: string;
};

export {
  PUBLIC_PAGE_SEGMENTS,
  clubPublicPath,
  extractRouteClubSlug,
  isAppRootSegment,
  isLegacyFlatPublicPath,
  isPublicPageSegment,
  isPublicWebsitePath,
  resolveClubSlugFromHost,
  type PublicPageSegment,
} from "@/lib/tenant/club-public-routing";

export const listActivePublicClubs = cache(async (): Promise<ResolvedPublicClub[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("id, slug, public_name, official_name")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    publicName: String(row.public_name ?? row.slug),
    officialName: String(row.official_name ?? row.public_name ?? row.slug),
  }));
});

export const resolvePublicClubBySlug = cache(
  async (slug: string): Promise<ResolvedPublicClub | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("clubs")
      .select("id, slug, public_name, official_name")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (!data) return null;

    return {
      id: String(data.id),
      slug: String(data.slug),
      publicName: String(data.public_name ?? data.slug),
      officialName: String(data.official_name ?? data.public_name ?? data.slug),
    };
  },
);

export type ResolvePublicClubInput = {
  routeClubSlug?: string | null;
  host?: string;
};

/** Resolve tenant for public pages from URL path or hostname — no club ENV. */
export async function resolvePublicClub(
  input: ResolvePublicClubInput,
): Promise<ResolvedPublicClub | null> {
  const hostSlug = input.host ? resolveClubSlugFromHost(input.host) : null;
  const slug = input.routeClubSlug?.trim() || hostSlug;
  if (!slug) return null;
  return resolvePublicClubBySlug(slug);
}

/** Oldest active club — target for 301 from legacy flat URLs. */
export const getLegacyRedirectClubSlug = cache(async (): Promise<string | null> => {
  const clubs = await listActivePublicClubs();
  return clubs[0]?.slug ?? null;
});
