import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { getDashboardContext } from "@/lib/auth/session";
import { formatClubOfficialSubtitle, getClubBrandingName } from "@/lib/club/names";
import { siteConfig } from "@/config/site";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile, access, club, unreadNotifications } = await getDashboardContext();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="border-b px-6 py-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {siteConfig.shortName}
          </p>
          <p className="mt-1 font-semibold">{getClubBrandingName(club)}</p>
          {formatClubOfficialSubtitle(club) ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{club.officialName}</p>
          ) : null}
        </div>
        <div className="flex-1 px-3 py-4">
          <DashboardNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          profile={profile}
          roles={access.roles}
          clubName={getClubBrandingName(club)}
          appName={siteConfig.shortName}
          unreadNotifications={unreadNotifications}
        />
        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
