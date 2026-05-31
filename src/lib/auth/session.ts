import { cache } from "react";
import { redirect } from "next/navigation";

import { ROLE_LABELS } from "@/config/permissions";
import { buildAccessContext } from "@/lib/rbac/permissions";
import { hasPermission } from "@/lib/rbac/permissions";
import { parseClubRole } from "@/lib/validators";
import { createClient, getUser } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";
import type { Club, ClubRole, Profile, Team, UserAccessContext } from "@/types/rbac";

export const DEFAULT_CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

export type ClubMemberRow = {
  id: string;
  role: ClubRole;
  status: string;
  team_id: string | null;
  user_id: string;
  profile: { id: string; email: string; full_name: string | null } | null;
  team: { id: string; name: string } | null;
};

export const requireUser = cache(async () => {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
});

export const getProfile = cache(async (userId: string): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, phone, locale")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    phone: data.phone,
    locale: data.locale,
  };
});

export const getUserMemberships = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_memberships")
    .select("id, club_id, user_id, role, status, team_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getAccessContext = cache(
  async (userId: string, clubId: string = DEFAULT_CLUB_ID): Promise<UserAccessContext | null> => {
    const memberships = await getUserMemberships(userId);
    const clubMemberships = memberships.filter((m) => m.club_id === clubId);

    if (clubMemberships.length === 0) return null;

    const roles: ClubRole[] = [];

    for (const membership of clubMemberships) {
      const parsed = parseClubRole(membership.role);
      if (parsed.success) {
        roles.push(parsed.data);
      }
    }

    if (roles.length === 0) return null;

    return buildAccessContext({
      userId,
      clubId,
      roles,
    });
  },
);

export async function requireAccessContext(
  clubId: string = DEFAULT_CLUB_ID,
): Promise<UserAccessContext> {
  const user = await requireUser();
  const context = await getAccessContext(user.id, clubId);

  if (!context) {
    redirect("/login?error=no_membership");
  }

  return context;
}

export const getClub = cache(async (clubId: string = DEFAULT_CLUB_ID): Promise<Club | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .select(
      "id, slug, public_name, official_name, association, competition_level, country, voivodeship, status",
    )
    .eq("id", clubId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    slug: data.slug,
    publicName: data.public_name,
    officialName: data.official_name,
    association: data.association,
    competitionLevel: data.competition_level,
    country: data.country,
    voivodeship: data.voivodeship,
    status: data.status,
  };
});

export const getTeams = cache(async (clubId: string = DEFAULT_CLUB_ID): Promise<Team[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, club_id, name, category, season, is_active")
    .eq("club_id", clubId)
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((team) => ({
    id: team.id,
    clubId: team.club_id,
    name: team.name,
    category: team.category,
    season: team.season,
    isActive: team.is_active,
  }));
});

export const getClubMembers = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<ClubMemberRow[]> => {
    const supabase = await createClient();
    const { data: memberships, error } = await supabase
      .from("club_memberships")
      .select("id, role, status, team_id, user_id")
      .eq("club_id", clubId)
      .order("role");

    if (error) throw new Error(error.message);
    if (!memberships?.length) return [];

    const userIds = [...new Set(memberships.map((m) => m.user_id))];
    const teamIds = [
      ...new Set(memberships.map((m) => m.team_id).filter(Boolean)),
    ] as string[];

    const [{ data: profiles }, { data: teams }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name").in("id", userIds),
      teamIds.length
        ? supabase.from("teams").select("id, name").in("id", teamIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ]);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
    const teamMap = new Map(teams?.map((t) => [t.id, t]) ?? []);

    return memberships.flatMap((membership) => {
      const parsedRole = parseClubRole(membership.role);
      if (!parsedRole.success) return [];

      return [
        {
          id: membership.id,
          role: parsedRole.data,
          status: membership.status,
          team_id: membership.team_id,
          user_id: membership.user_id,
          profile: profileMap.get(membership.user_id) ?? null,
          team: membership.team_id ? teamMap.get(membership.team_id) ?? null : null,
        },
      ];
    });
  },
);

export const getDashboardContext = cache(async (clubId: string = DEFAULT_CLUB_ID) => {
  const user = await requireUser();
  const [profile, access, club, teams] = await Promise.all([
    getProfile(user.id),
    getAccessContext(user.id, clubId),
    getClub(clubId),
    getTeams(clubId),
  ]);

  if (!access || !club) {
    redirect("/login?error=no_membership");
  }

  return {
    user,
    profile,
    access,
    club,
    teams,
    siteName: siteConfig.name,
  };
});

export function getRoleLabels(roles: ClubRole[]): string[] {
  return roles.map((role) => ROLE_LABELS[role]);
}

export function requireMemberReadAccess(access: UserAccessContext) {
  if (!hasPermission(access, "member:read")) {
    redirect("/dashboard");
  }
}
