import Link from "next/link";
import { Suspense } from "react";
import { Users, Building2 } from "lucide-react";

import {
  DashboardDocumentAlertsSection,
  DashboardPlayerSection,
  DashboardPlayerSectionFallback,
} from "@/features/dashboard/components/dashboard-player-section";
import { CoachDayPanel } from "@/features/dashboard/components/coach-day-panel";
import { MobileQuickActions, MobileRoleHeader } from "@/features/pwa/components/mobile-home";
import { OfflineCachedSummary } from "@/features/pwa/components/offline-cached-summary";
import { ClubLogo } from "@/components/club/club-logo";
import { getDashboardContext } from "@/lib/auth/session";
import { getCoachDayData } from "@/lib/dashboard/coach-day";
import { canShowCoachDay } from "@/lib/navigation/mobile-nav";
import { hasPermission } from "@/lib/rbac/permissions";
import { formatClubOfficialSubtitle, getClubBrandingName } from "@/lib/club/names";
import { getWebsiteAssetUrl } from "@/lib/website/assets";
import { ROLE_LABELS } from "@/config/permissions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const { profile, access, club, teams, websiteSettings } = await getDashboardContext();
  const clubName = getClubBrandingName(club);
  const logoUrl = websiteSettings?.logoPath
    ? await getWebsiteAssetUrl(websiteSettings.logoPath)
    : null;
  const canReadPlayers = hasPermission(access, "player:read");
  const showCoachDay = canShowCoachDay(access.roles);
  const coachDay = showCoachDay ? await getCoachDayData(access.clubId) : null;

  return (
    <div className="space-y-8">
      <OfflineCachedSummary />
      <MobileRoleHeader roles={access.roles} clubName={clubName} logoUrl={logoUrl} />
      <MobileQuickActions roles={access.roles} />

      <div className="flex items-start gap-4">
        <ClubLogo logoUrl={logoUrl} clubName={clubName} size="lg" className="hidden sm:flex" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Witaj, {profile?.fullName ?? profile?.email}. Oto podsumowanie {clubName}.
          </p>
          {formatClubOfficialSubtitle(club) ? (
            <p className="mt-1 text-xs text-muted-foreground">{formatClubOfficialSubtitle(club)}</p>
          ) : null}
        </div>
      </div>

      {coachDay ? <CoachDayPanel data={coachDay} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Klub</CardDescription>
            <CardTitle className="text-lg">{getClubBrandingName(club)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {formatClubOfficialSubtitle(club) ? (
              <p className="text-sm text-muted-foreground">{formatClubOfficialSubtitle(club)}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">{club.competitionLevel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Drużyny aktywne</CardDescription>
            <CardTitle className="text-lg">{teams.filter((t) => t.isActive).length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">W systemie klubu</p>
          </CardContent>
        </Card>
        {canReadPlayers ? (
          <Suspense fallback={<DashboardPlayerSectionFallback />}>
            <DashboardPlayerSection />
          </Suspense>
        ) : null}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Twoje role</CardDescription>
            <CardTitle className="text-lg">{access.roles.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {access.roles.map((role) => (
              <Badge key={role} variant="secondary">
                {ROLE_LABELS[role]}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Uprawnienia aktywne</CardDescription>
            <CardTitle className="text-lg">{access.permissions.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">W bieżącym klubie</p>
          </CardContent>
        </Card>
      </div>

      {canReadPlayers ? (
        <Suspense fallback={null}>
          <DashboardDocumentAlertsSection />
        </Suspense>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4" />
              Szybkie akcje
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/club" className={cn(buttonVariants({ variant: "outline" }))}>
              Profil klubu
            </Link>
            <Link href="/teams" className={cn(buttonVariants({ variant: "outline" }))}>
              Drużyny
            </Link>
            {canReadPlayers ? (
              <Link href="/players" className={cn(buttonVariants({ variant: "outline" }))}>
                Zawodnicy
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" />
              Drużyny
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak drużyn.</p>
            ) : (
              teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between text-sm">
                  <span>{team.name}</span>
                  <Badge variant={team.isActive ? "default" : "secondary"}>
                    {team.isActive ? "Aktywna" : "Nieaktywna"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
