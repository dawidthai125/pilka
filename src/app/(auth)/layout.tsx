import Link from "next/link";

import { ClubLogo } from "@/components/club/club-logo";
import { ClubThemeStyles } from "@/components/club/club-theme-styles";
import { formatProductAttribution } from "@/config/product";
import { getAuthClubBranding } from "@/lib/club/branding-loader";

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getAuthClubBranding();

  return (
    <>
      <ClubThemeStyles theme={branding.theme} />
      <div className="flex min-h-screen">
        <aside className="relative hidden max-w-md flex-col justify-between bg-[var(--club-primary)] p-10 text-[var(--club-accent)] lg:flex xl:max-w-lg">
          <div>
            <div className="flex items-center gap-4">
              <ClubLogo logoUrl={branding.logoUrl} clubName={branding.clubName} size="xl" onDark />
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-white/70">Panel klubowy</p>
                <h1 className="text-2xl font-bold leading-tight">{branding.panelTitle}</h1>
              </div>
            </div>
            {branding.officialName && branding.officialName !== branding.clubName ? (
              <p className="mt-6 text-sm text-white/80">{branding.officialName}</p>
            ) : null}
            <p className="mt-8 max-w-sm text-sm leading-relaxed text-white/75">
              Zarządzaj treningami, frekwencją, komunikacją i codzienną pracą klubu w jednym miejscu.
            </p>
          </div>
          <p className="text-xs text-white/50">
            <Link href="/" className="underline underline-offset-2 hover:text-white/80">
              Wróć na stronę klubu
            </Link>
            <span className="mt-3 block text-white/40">{formatProductAttribution()}</span>
          </p>
        </aside>

        <div className="flex flex-1 flex-col bg-background">
          <div className="border-b border-sidebar-border/30 bg-[var(--club-primary)] px-6 py-5 text-[var(--club-accent)] lg:hidden">
            <div className="mx-auto flex max-w-md items-center gap-3">
              <ClubLogo logoUrl={branding.logoUrl} clubName={branding.clubName} size="md" onDark />
              <div className="min-w-0">
                <p className="truncate text-xs uppercase tracking-wide text-white/70">Panel klubowy</p>
                <p className="truncate font-semibold">{branding.panelTitle}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
            <div className="w-full max-w-md">{children}</div>
            <p className="mt-8 text-center text-[11px] text-muted-foreground">{formatProductAttribution()}</p>
          </div>
        </div>
      </div>
    </>
  );
}
