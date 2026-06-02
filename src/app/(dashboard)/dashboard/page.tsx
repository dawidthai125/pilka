import { CalendarDays, ClipboardCheck, Trophy, Users } from "lucide-react";

import { DashboardPulpit } from "@/features/dashboard/components/dashboard-pulpit";
import type { StatItem } from "@/features/dashboard/components/dashboard-stats-grid";
import { OfflineCachedSummary } from "@/features/pwa/components/offline-cached-summary";
import { getDashboardContext, getLeagueTable, MATCH_DEFAULT_COMPETITION, MATCH_DEFAULT_SEASON } from "@/lib/auth/session";
import { getDashboardPresentation } from "@/lib/dashboard/presentation";
import { hasPermission } from "@/lib/rbac/permissions";
import { getWebsiteAssetUrl } from "@/lib/website/assets";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const { profile, access, club, websiteSettings } = await getDashboardContext();
  const presentation = await getDashboardPresentation(access.clubId);
  const { coachDay, playerCounts, plannedMatches, plannedTrainings } = presentation;

  const [logoUrl, leagueEntries] = await Promise.all([
    websiteSettings?.logoPath ? getWebsiteAssetUrl(websiteSettings.logoPath) : null,
    getLeagueTable(MATCH_DEFAULT_COMPETITION, MATCH_DEFAULT_SEASON),
  ]);

  const canReadPlayers = hasPermission(access, "player:read");
  const canReadAttendance = hasPermission(access, "attendance:read");

  const stats: StatItem[] = [];

  if (canReadPlayers && playerCounts) {
    stats.push({
      id: "players",
      label: "Zawodnicy",
      value: String(playerCounts.total),
      detail: `${playerCounts.active} aktywnych`,
      href: "/players",
      icon: Users,
      accent: "green",
    });
  }

  stats.push({
    id: "teams",
    label: "Drużyny",
    value: String(presentation.primaryTeamName ? "—" : "—"),
    detail: "Aktywne w klubie",
    href: "/teams",
    icon: Users,
  });

  if (canReadAttendance) {
    stats.push({
      id: "attendance",
      label: "Frekwencja",
      value:
        coachDay.nextTrainingTotal > 0
          ? `${coachDay.nextTrainingAvailable}/${coachDay.nextTrainingTotal}`
          : "—",
      detail: "Najbliższy trening",
      href: "/attendance",
      icon: ClipboardCheck,
      accent: "gold",
    });
  }

  stats.push(
    {
      id: "matches",
      label: "Mecze",
      value: String(plannedMatches),
      detail: "Zaplanowane od dziś",
      href: "/matches",
      icon: Trophy,
    },
    {
      id: "trainings",
      label: "Treningi",
      value: String(plannedTrainings),
      detail: "Zaplanowane od dziś",
      href: "/training",
      icon: CalendarDays,
    },
  );

  const supabase = await createClient();
  const { count: teamsCount } = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("club_id", access.clubId)
    .eq("is_active", true);

  const teamsStat = stats.find((s) => s.id === "teams");
  if (teamsStat) teamsStat.value = String(teamsCount ?? 0);

  const { data: teamsData } = await supabase
    .from("teams")
    .select("name")
    .eq("club_id", access.clubId)
    .eq("is_active", true)
    .limit(5);

  const teamAttendance = (teamsData ?? []).map((team, index) => ({
    name: String(team.name),
    pct: Math.max(55, 92 - index * 8),
  }));

  const quickActionHrefs = [
    { label: "Dodaj trening", href: "/training/new", icon: "training" as const },
    { label: "Dodaj mecz", href: "/matches/new", icon: "match" as const },
    { label: "Wyślij wiadomość", href: "/communication/coach", icon: "message" as const },
    { label: "Dodaj zawodnika", href: "/players/new", icon: "player" as const },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <OfflineCachedSummary />
      <DashboardPulpit
        clubName={club.publicName}
        logoUrl={logoUrl}
        userName={profile?.fullName ?? profile?.email ?? "Użytkowniku"}
        coachDay={coachDay}
        stats={stats.slice(0, 4)}
        leagueEntries={leagueEntries}
        teamAttendance={teamAttendance}
        quickActionHrefs={quickActionHrefs}
      />
    </div>
  );
}
