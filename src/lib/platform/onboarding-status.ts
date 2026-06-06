import { createAdminClient } from "@/lib/supabase/admin";

export type OnboardingStepStatus = "not_started" | "in_progress" | "complete";

export type ClubOnboardingStatus = {
  branding: OnboardingStepStatus;
  website: OnboardingStepStatus;
  league: OnboardingStepStatus;
  owner: OnboardingStepStatus;
  media: OnboardingStepStatus;
  overall: OnboardingStepStatus;
};

export type PlatformClubListItem = {
  id: string;
  slug: string;
  publicName: string;
  status: string;
  ownerEmail: string | null;
  ownerStatus: string | null;
  createdAt: string;
  onboarding: ClubOnboardingStatus;
  publicUrl: string;
};

function stepFromFlags(complete: boolean, started: boolean): OnboardingStepStatus {
  if (complete) return "complete";
  if (started) return "in_progress";
  return "not_started";
}

export async function computeClubOnboardingStatus(clubId: string): Promise<ClubOnboardingStatus> {
  const admin = createAdminClient();

  const [settingsRes, sourcesRes, ownerRes, mediaRes] = await Promise.all([
    admin.from("website_settings").select("logo_path, hero_image_path, public_site_enabled, hero_title").eq("club_id", clubId).maybeSingle(),
    admin.from("league_sources").select("id, is_active").eq("club_id", clubId),
    admin.from("club_memberships").select("status").eq("club_id", clubId).eq("role", "owner").maybeSingle(),
    admin.from("website_media").select("id", { count: "exact", head: true }).eq("club_id", clubId).eq("is_active", true),
  ]);

  const settings = settingsRes.data;
  const hasLogo = Boolean(settings?.logo_path);
  const hasHero = Boolean(settings?.hero_image_path);
  const branding = stepFromFlags(hasLogo, Boolean(settings));

  const website = stepFromFlags(
    Boolean(settings?.public_site_enabled && settings?.hero_title),
    Boolean(settings),
  );

  const sources = sourcesRes.data ?? [];
  const leagueActive = sources.some((s) => s.is_active);
  const league = stepFromFlags(leagueActive, sources.length > 0);

  const ownerStatus = ownerRes.data?.status ?? null;
  const owner = stepFromFlags(ownerStatus === "active", Boolean(ownerStatus));

  const mediaCount = mediaRes.count ?? 0;
  const media = stepFromFlags(mediaCount > 0 || hasLogo, mediaCount > 0 || hasHero);

  const values = [branding, website, league, owner, media];
  const overall: OnboardingStepStatus = values.every((v) => v === "complete")
    ? "complete"
    : values.some((v) => v !== "not_started")
      ? "in_progress"
      : "not_started";

  return { branding, website, league, owner, media, overall };
}

/** Pojedynczy klub — ~5–6 zapytań stałych (bez N+1 list loader). */
export async function getPlatformClubDetail(clubId: string): Promise<PlatformClubListItem | null> {
  const admin = createAdminClient();

  const { data: club, error } = await admin
    .from("clubs")
    .select("id, slug, public_name, status, settings, created_at")
    .eq("id", clubId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!club) return null;

  const [onboarding, ownerMembershipRes] = await Promise.all([
    computeClubOnboardingStatus(clubId),
    admin
      .from("club_memberships")
      .select("status, user_id")
      .eq("club_id", clubId)
      .eq("role", "owner")
      .maybeSingle(),
  ]);

  let ownerEmail: string | null = null;
  const ownerMembership = ownerMembershipRes.data;
  if (ownerMembership?.user_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", ownerMembership.user_id)
      .maybeSingle();
    ownerEmail = profile?.email ?? null;
  }

  return {
    id: club.id,
    slug: club.slug,
    publicName: club.public_name,
    status: club.status,
    ownerEmail,
    ownerStatus: ownerMembership?.status ?? null,
    createdAt: club.created_at,
    onboarding,
    publicUrl: `/${club.slug}`,
  };
}
