import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * @deprecated Public pages resolve club from URL (Sprint 18.1). Use resolvePublicClub().
 * Kept only for scripts / legacy callers outside the app router.
 */
export function resolvePublicClubSlug(): string {
  const slug =
    process.env.PUBLIC_CLUB_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_DEFAULT_CLUB_SLUG?.trim() ||
    "";

  if (!slug) {
    throw new Error(
      "resolvePublicClubSlug: no slug in route context and no legacy env fallback.",
    );
  }

  return slug;
}

type ActiveMembership = {
  club_id: string;
  status: string;
};

async function loadActiveMemberships(userId: string): Promise<ActiveMembership[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_memberships")
    .select("club_id, status")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function resolveClubIdFromSlugHint(
  memberships: ActiveMembership[],
): Promise<string | null> {
  const slugHint =
    process.env.ACTIVE_CLUB_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_DEFAULT_CLUB_SLUG?.trim() ||
    process.env.PUBLIC_CLUB_SLUG?.trim();

  if (!slugHint) return null;

  const supabase = await createClient();
  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("slug", slugHint)
    .eq("status", "active")
    .maybeSingle();

  if (!club?.id) return null;
  if (!memberships.some((m) => m.club_id === club.id)) return null;
  return String(club.id);
}

/**
 * Dashboard tenant — from session membership (never a hardcoded UUID).
 */
export const resolveSessionClubId = cache(async (requestedClubId?: string): Promise<string> => {
  if (requestedClubId) return requestedClubId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const memberships = await loadActiveMemberships(user.id);
  if (memberships.length === 0) redirect("/login?error=no_membership");

  const hinted = await resolveClubIdFromSlugHint(memberships);
  if (hinted) return hinted;

  return memberships[0]!.club_id;
});

/** Cached per-request club id when loaders omit explicit tenant. */
export const resolveTenantClubId = cache(async (clubId?: string): Promise<string> => {
  return resolveSessionClubId(clubId);
});
