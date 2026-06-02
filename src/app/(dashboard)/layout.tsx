import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { ClubLogo } from "@/components/club/club-logo";
import { ClubThemeStyles } from "@/components/club/club-theme-styles";
import { BottomNavigation } from "@/components/pwa/bottom-navigation";
import { AiCommandPalette } from "@/features/ai-manager/components/agent-manager-dashboard";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { PwaThemeMeta } from "@/components/pwa/pwa-theme-meta";
import { getDashboardContext } from "@/lib/auth/session";
import { formatClubOfficialSubtitle, getClubBrandingName } from "@/lib/club/names";
import { resolveClubTheme } from "@/lib/club/theme";
import { getWebsiteAssetUrl } from "@/lib/website/assets";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile, access, club, unreadNotifications, websiteSettings } = await getDashboardContext();
  const clubName = getClubBrandingName(club);
  const theme = resolveClubTheme({
    primaryColor: websiteSettings?.primaryColor,
    secondaryColor: websiteSettings?.secondaryColor,
    accentColor: websiteSettings?.accentColor,
  });
  const logoUrl = websiteSettings?.logoPath
    ? await getWebsiteAssetUrl(websiteSettings.logoPath)
    : null;

  return (
    <PwaProvider userId={access.userId} clubId={access.clubId}>
      <ClubThemeStyles theme={theme} />
      <AiCommandPalette />
      <PwaThemeMeta theme={theme} />
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col print:hidden">
          <div className="border-b border-sidebar-border px-4 py-5">
            <div className="flex items-center gap-3">
              <ClubLogo logoUrl={logoUrl} clubName={clubName} size="lg" onDark />
              <div className="min-w-0">
                <p className="truncate font-semibold leading-tight">{clubName}</p>
                {formatClubOfficialSubtitle(club) ? (
                  <p className="mt-0.5 truncate text-xs text-sidebar-foreground/75">{club.officialName}</p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <DashboardNav roles={access.roles} variant="sidebar" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="print:hidden">
            <DashboardHeader
              profile={profile}
              roles={access.roles}
              clubName={clubName}
              logoUrl={logoUrl}
              unreadNotifications={unreadNotifications}
            />
          </div>
          <main className="flex-1 px-4 py-6 pb-24 md:px-6 md:py-8 md:pb-8 print:p-0">
            {children}
          </main>
          <BottomNavigation
            roles={access.roles}
            clubName={clubName}
            logoUrl={logoUrl}
          />
        </div>
      </div>
    </PwaProvider>
  );
}
