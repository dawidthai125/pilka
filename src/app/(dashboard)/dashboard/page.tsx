import { Suspense } from "react";
import { CalendarDays, ClipboardCheck, Trophy, Users } from "lucide-react";

import { DashboardClubVisuals } from "@/features/dashboard/components/dashboard-club-visuals";
import { DashboardDocumentAlertsSection } from "@/features/dashboard/components/dashboard-player-section";
import { CoachDayPanel } from "@/features/dashboard/components/coach-day-panel";
import { DashboardHero } from "@/features/dashboard/components/dashboard-hero";
import { DashboardQuickActions } from "@/features/dashboard/components/dashboard-quick-actions";
import { DashboardStatsGrid, type StatItem } from "@/features/dashboard/components/dashboard-stats-grid";
import { OfflineCachedSummary } from "@/features/pwa/components/offline-cached-summary";
import { getDashboardContext } from "@/lib/auth/session";
import { getDashboardPresentation } from "@/lib/dashboard/presentation";
import { canShowCoachDay } from "@/lib/navigation/mobile-nav";
import { hasPermission } from "@/lib/rbac/permissions";
import { formatClubOfficialSubtitle, getClubBrandingName } from "@/lib/club/names";
import { getAnnouncements } from "@/lib/communication/loaders";
import { getWebsiteAssetUrl } from "@/lib/website/assets";

export default async function DashboardPage() {
  const { profile, access, club, websiteSettings } = await getDashboardContext();
  const clubName = getClubBrandingName(club);
  const presentation = await getDashboardPresentation(access.clubId);
  const { coachDay, playerCounts, plannedMatches, plannedTrainings, primaryTeamName } = presentation;

  const [logoUrl, heroImageUrl] = await Promise.all([
    websiteSettings?.logoPath ? getWebsiteAssetUrl(websiteSettings.logoPath) : null,
    websiteSettings?.heroImagePath ? getWebsiteAssetUrl(websiteSettings.heroImagePath) : null,
  ]);

  const showCoachDay = canShowCoachDay(access.roles);
  const canReadPlayers = hasPermission(access, "player:read");
  const canReadAttendance = hasPermission(access, "attendance:read");

  const announcements = showCoachDay
    ? await getAnnouncements(access.clubId, access.userId, { readStatus: "all" })
    : [];
  const latestAnnouncement = announcements.find((a) => a.status === "published");
  const lastAnnouncement = latestAnnouncement
    ? {
        title: latestAnnouncement.title,
        href: "/communication/announcements",
        date: latestAnnouncement.publishedAt ?? latestAnnouncement.createdAt,
      }
    : null;

  const stats: StatItem[] = [];

  if (canReadPlayers && playerCounts) {
    stats.push({
      id: "players",
      label: "Zawodnicy",
      value: String(playerCounts.total),
      detail: `${playerCounts.active} aktywnych w kadrze`,
      href: "/players",
      icon: Users,
      accent: "green",
    });
  }

  if (canReadAttendance) {
    stats.push({
      id: "attendance",
      label: "Frekwencja",
      value:
        coachDay.nextTrainingTotal > 0
          ? `${coachDay.nextTrainingAvailable}/${coachDay.nextTrainingTotal}`
          : "—",
      detail: "Dostępni na najbliższy trening",
      href: "/attendance",
      icon: ClipboardCheck,
      accent: "gold",
    });
  }

  stats.push({
    id: "matches",
    label: "Mecze",
    value: String(plannedMatches),
    detail: "Zaplanowane od dziś",
    href: "/matches",
    icon: Trophy,
  });

  stats.push({
    id: "trainings",
    label: "Treningi",
    value: String(plannedTrainings),
    detail: "Zaplanowane od dziś",
    href: "/training",
    icon: CalendarDays,
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-2 md:gap-8">
      <OfflineCachedSummary />

      <DashboardHero
        clubName={clubName}
        officialSubtitle={formatClubOfficialSubtitle(club)}
        logoUrl={logoUrl}
        userName={profile?.fullName ?? profile?.email ?? "Użytkowniku"}
        teamName={primaryTeamName}
        coachDay={coachDay}
      />

      <DashboardClubVisuals matchImageUrl={heroImageUrl} />

      <DashboardQuickActions roles={access.roles} />

      {showCoachDay ? <CoachDayPanel data={coachDay} lastAnnouncement={lastAnnouncement} /> : null}

      <DashboardStatsGrid items={stats} />

      {canReadPlayers ? (
        <Suspense fallback={null}>
          <DashboardDocumentAlertsSection />
        </Suspense>
      ) : null}
    </div>
  );
}
