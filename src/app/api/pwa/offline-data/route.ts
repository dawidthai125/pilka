import { NextResponse } from "next/server";

import { resolvePwaTheme } from "@/lib/pwa/branding";
import { resolveSessionClubId } from "@/lib/tenant/resolve";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

type PwaOfflineRpcPayload = {
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    roles: string[];
  } | null;
  club: {
    id: string;
    slug: string;
    public_name: string;
  } | null;
  teams: Array<{ id: string; name: string }>;
  recent_matches: Array<Record<string, unknown>>;
  recent_trainings: Array<Record<string, unknown>>;
  news: Array<Record<string, unknown>>;
  primary_color: string | null;
  secondary_color: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const clubId = await resolveSessionClubId();
    const { data, error } = await supabase.rpc("get_pwa_offline_context", {
      p_club_id: clubId,
    });

    if (error || !data) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = data as PwaOfflineRpcPayload;

    if (!payload.profile || !payload.club) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        profile: {
          id: payload.profile.id,
          email: payload.profile.email,
          fullName: payload.profile.full_name,
          roles: payload.profile.roles,
        },
        club: {
          id: payload.club.id,
          name: payload.club.public_name,
          slug: payload.club.slug,
        },
        teams: payload.teams,
        recentMatches: payload.recent_matches,
        recentTrainings: payload.recent_trainings,
        news: payload.news,
        theme: resolvePwaTheme({
          primaryColor: payload.primary_color,
          secondaryColor: payload.secondary_color,
        }),
        cachedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
