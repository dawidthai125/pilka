import { DEFAULT_SEASON } from "@/lib/matches/constants";
import { createClient } from "@/lib/supabase/server";

export type SponsorAiContext = {
  totalSponsors: number;
  activeContracts: number;
  activeContractValue: number;
  expiringWithin60Days: Array<{ companyName: string; contractName: string; endDate: string }>;
  noContact30Days: Array<{ companyName: string; lastContact: string | null }>;
};

export async function buildSponsorAiContext(clubId: string): Promise<SponsorAiContext> {
  const supabase = await createClient();
  const today = new Date();
  const in60 = new Date(today);
  in60.setDate(in60.getDate() + 60);
  const ago30 = new Date(today);
  ago30.setDate(ago30.getDate() - 30);
  const ago30Str = ago30.toISOString().slice(0, 10);
  const in60Str = in60.toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const [{ count: totalSponsors }, { data: contracts }, { data: sponsors }, { data: notes }] =
    await Promise.all([
      supabase.from("sponsors").select("id", { count: "exact", head: true }).eq("club_id", clubId),
      supabase
        .from("sponsor_contracts")
        .select("name, end_date, value, status, sponsors(company_name)")
        .eq("club_id", clubId)
        .in("status", ["active", "expiring"]),
      supabase.from("sponsors").select("id, company_name").eq("club_id", clubId),
      supabase
        .from("sponsor_notes")
        .select("sponsor_id, contact_date")
        .eq("club_id", clubId)
        .order("contact_date", { ascending: false }),
    ]);

  const lastContactMap = new Map<string, string>();
  for (const note of notes ?? []) {
    if (!lastContactMap.has(note.sponsor_id)) {
      lastContactMap.set(note.sponsor_id, note.contact_date);
    }
  }

  const contractRows = contracts ?? [];
  const expiringWithin60Days = contractRows
    .filter((c) => c.end_date >= todayStr && c.end_date <= in60Str)
    .map((c) => ({
      companyName: (c.sponsors as { company_name?: string } | null)?.company_name ?? "Sponsor",
      contractName: c.name,
      endDate: c.end_date,
    }));

  const noContact30Days = (sponsors ?? [])
    .filter((s) => {
      const last = lastContactMap.get(s.id);
      return !last || last < ago30Str;
    })
    .map((s) => ({
      companyName: s.company_name,
      lastContact: lastContactMap.get(s.id) ?? null,
    }))
    .slice(0, 10);

  return {
    totalSponsors: totalSponsors ?? 0,
    activeContracts: contractRows.length,
    activeContractValue: contractRows.reduce((sum, c) => sum + Number(c.value), 0),
    expiringWithin60Days,
    noContact30Days,
  };
}

export async function buildSponsorReportContent(
  clubId: string,
  sponsorId: string,
  periodStart: string,
  periodEnd: string,
): Promise<Record<string, unknown>> {
  const supabase = await createClient();

  const [{ data: sponsor }, { data: exposure }, { data: publications }, { data: matches }] =
    await Promise.all([
      supabase.from("sponsors").select("company_name").eq("id", sponsorId).maybeSingle(),
      supabase
        .from("sponsor_exposure")
        .select("title, exposure_type, exposure_date")
        .eq("sponsor_id", sponsorId)
        .eq("club_id", clubId)
        .gte("exposure_date", periodStart)
        .lte("exposure_date", periodEnd),
      supabase
        .from("sponsor_publication_links")
        .select("publication_id, sponsor_publications(title, published_at, source)")
        .eq("sponsor_id", sponsorId)
        .eq("club_id", clubId),
      supabase
        .from("matches")
        .select("home_team_name, away_team_name, home_score, away_score, match_date, status")
        .eq("club_id", clubId)
        .eq("season", DEFAULT_SEASON)
        .eq("status", "completed")
        .gte("match_date", periodStart)
        .lte("match_date", periodEnd)
        .order("match_date", { ascending: false })
        .limit(10),
    ]);

  const pubList = (publications ?? [])
    .map((p) => p.sponsor_publications as { title?: string; published_at?: string; source?: string } | null)
    .filter(Boolean);

  const results = (matches ?? [])
    .map((m) => `${m.home_team_name} ${m.home_score}:${m.away_score} ${m.away_team_name}`)
    .join(", ");

  return {
    sponsorName: sponsor?.company_name ?? "Sponsor",
    periodStart,
    periodEnd,
    publicationsCount: pubList.length,
    publications: pubList.map((p) => ({ title: p?.title, date: p?.published_at, source: p?.source })),
    exposureCount: exposure?.length ?? 0,
    exposureEvents: (exposure ?? []).map((e) => ({
      title: e.title,
      type: e.exposure_type,
      date: e.exposure_date,
    })),
    teamResults: results || "Brak zakończonych meczów w okresie.",
    highlights: pubList.slice(0, 5).map((p) => p?.title).filter(Boolean),
  };
}
