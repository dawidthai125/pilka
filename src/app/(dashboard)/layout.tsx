import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { ClubLogo } from "@/components/club/club-logo";
import { ClubThemeStyles } from "@/components/club/club-theme-styles";
import { BottomNavigation } from "@/components/pwa/bottom-navigation";
import { AiCommandPalette } from "@/features/ai-manager/components/agent-manager-dashboard";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { PwaThemeMeta } from "@/components/pwa/pwa-theme-meta";
import { formatProductAttribution } from "@/config/product";
import { getDashboardContext } from "@/lib/auth/session";
import { formatClubOfficialSubtitle, getClubBrandingName } from "@/lib/club/names";
import { resolveClubTheme } from "@/lib/club/theme";
import { CLUB_DISPLAY_CLASS } from "@/lib/website/constants";
import { getWebsiteAssetUrl } from "@/lib/website/assets";
import { cn } from "@/lib/utils";

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
      <div className="flex min-h-screen bg-[#060d0a]">
        <aside className="hidden w-[272px] shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-[#041810] to-[#020806] text-white md:flex print:hidden">
          <div className="border-b border-white/10 px-5 py-6">
            <div className="flex items-center gap-4">
              <ClubLogo logoUrl={logoUrl} clubName={clubName} size="xl" onDark className="size-14" />
              <div className="min-w-0">
                <p className={cn(CLUB_DISPLAY_CLASS, "truncate text-base font-bold leading-tight")}>{clubName}</p>
                {formatClubOfficialSubtitle(club) ? (
                  <p className="mt-0.5 truncate text-xs text-white/60">{club.officialName}</p>
                ) : null}
              </div>
            </div>
            <p className="mt-4 inline-flex rounded-full border border-[var(--club-secondary)]/30 bg-[var(--club-secondary)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--club-secondary)]">
              Sezon 2025/26
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <DashboardNav roles={access.roles} variant="sidebar" />
          </div>
          <div className="border-t border-white/10 p-4">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="size-3.5" />
              Strona publiczna
            </Link>
            <p className="mt-3 px-3 text-[10px] text-white/35">{formatProductAttribution()}</p>
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
          <main className="dashboard-surface flex-1 px-3 py-4 pb-24 md:px-5 md:py-6 md:pb-8 print:bg-white print:p-0 lg:px-8">
            {children}
          </main>
          <BottomNavigation roles={access.roles} clubName={clubName} logoUrl={logoUrl} />
        </div>
      </div>
    </PwaProvider>
  );
}
