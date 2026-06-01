import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { BottomNavigation } from "@/components/pwa/bottom-navigation";
import { AiCommandPalette } from "@/features/ai-manager/components/agent-manager-dashboard";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { PwaThemeMeta } from "@/components/pwa/pwa-theme-meta";
import { getDashboardContext } from "@/lib/auth/session";
import { formatClubOfficialSubtitle, getClubBrandingName } from "@/lib/club/names";
import { resolvePwaTheme } from "@/lib/pwa/branding";
import { siteConfig } from "@/config/site";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile, access, club, unreadNotifications, websiteSettings } = await getDashboardContext();
  const pwaTheme = resolvePwaTheme({
    primaryColor: websiteSettings?.primaryColor,
    secondaryColor: websiteSettings?.secondaryColor,
  });

  return (
    <PwaProvider userId={access.userId} clubId={access.clubId}>
      <AiCommandPalette />
      <PwaThemeMeta theme={pwaTheme} />
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col print:hidden">
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
            <DashboardNav roles={access.roles} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="print:hidden">
            <DashboardHeader
              profile={profile}
              roles={access.roles}
              clubName={getClubBrandingName(club)}
              appName={siteConfig.shortName}
              unreadNotifications={unreadNotifications}
            />
          </div>
          <main className="flex-1 px-4 py-6 pb-24 md:px-6 md:py-8 md:pb-8 print:p-0">
            {children}
          </main>
          <BottomNavigation
            roles={access.roles}
            appName={siteConfig.shortName}
            clubName={getClubBrandingName(club)}
          />
        </div>
      </div>
    </PwaProvider>
  );
}
