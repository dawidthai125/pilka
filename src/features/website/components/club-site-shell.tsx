import Link from "next/link";
import { ExternalLink, Phone, UserPlus } from "lucide-react";

import { ClubLogo } from "@/components/club/club-logo";
import { PublicSiteNav } from "@/features/website/components/public-site-nav";
import { CLUB_DISPLAY_CLASS, WEBSITE_SOCIAL_PLATFORM_LABELS } from "@/lib/website/constants";
import { formatPublicSiteFooter } from "@/config/product";
import { cn } from "@/lib/utils";
import type { WebsiteSettings, WebsiteSocialIntegration } from "@/types/website";

type ClubSiteShellProps = {
  clubName: string;
  officialName: string;
  settings: WebsiteSettings;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  socialLinks?: WebsiteSocialIntegration[];
  children: React.ReactNode;
};

/** Wysokość okładki FB-style — osobna warstwa, bez tekstu. */
const COVER_HEIGHT = "h-[168px] sm:h-[188px] md:h-[220px]";

/** Logo nachodzi ~50% na cover (środek na linii cover / pasek). */
const LOGO_SIZE = "size-[96px] sm:size-[104px] md:size-[112px]";

export function ClubSiteShell({
  clubName,
  officialName,
  settings,
  logoUrl,
  coverImageUrl,
  socialLinks = [],
  children,
}: ClubSiteShellProps) {
  const style = {
    ["--club-primary" as string]: settings.primaryColor,
    ["--club-secondary" as string]: settings.secondaryColor,
    ["--club-accent" as string]: settings.accentColor,
  } as React.CSSProperties;

  const activeSocial = socialLinks.filter((item) => item.isEnabled && item.profileUrl);
  const facebookLink = activeSocial.find((item) => item.platform === "facebook");
  const hasCoverPhoto = Boolean(coverImageUrl);

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f2f5]" style={style}>
      <header className="relative">
        {/* Warstwa 1: cover — tylko zdjęcie / gradient, bez nachodzenia UI */}
        <div className={cn("relative w-full overflow-hidden", COVER_HEIGHT)}>
          {hasCoverPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImageUrl!} alt="" className="size-full object-cover object-center" />
          ) : (
            <div
              className="size-full bg-gradient-to-br from-[var(--club-primary)] via-[color-mix(in_srgb,var(--club-primary)_88%,#000)] to-[#041810]"
              aria-hidden
            />
          )}
        </div>

        {/* Warstwa 2: zielony pasek profilu (Facebook Page) */}
        <div className="relative bg-[var(--club-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative min-h-[92px] pb-4 pt-0 sm:min-h-[96px] sm:pb-5">
              {/* Logo — nachodzi tylko na cover, nie na tekst */}
              <div className="absolute left-0 top-0 z-10 -translate-y-1/2">
                <ClubLogo
                  logoUrl={logoUrl}
                  clubName={clubName}
                  variant="profile"
                  className={cn(
                    LOGO_SIZE,
                    "border-4 border-white bg-white shadow-[0_2px_12px_rgba(0,0,0,0.2)]",
                  )}
                />
              </div>

              {/* Nazwa, telefon, CTA — wyłącznie w pasku profilu */}
              <div className="flex flex-col gap-3 pt-[52px] sm:gap-4 sm:pt-[56px] md:flex-row md:items-end md:justify-between md:pt-2 md:pl-[112px] lg:pl-[128px]">
                <div className="min-w-0 text-white">
                  <h1 className={cn(CLUB_DISPLAY_CLASS, "text-xl font-bold leading-tight sm:text-2xl md:text-3xl")}>
                    {clubName}
                  </h1>
                  <p className="mt-0.5 text-sm text-white/90">{officialName}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/90 sm:text-sm">
                    {settings.contactPhone ? (
                      <a
                        href={`tel:${settings.contactPhone.replace(/\s/g, "")}`}
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        <Phone className="size-3.5 shrink-0" />
                        {settings.contactPhone}
                      </a>
                    ) : null}
                    {facebookLink?.profileUrl ? (
                      <a
                        href={facebookLink.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        <ExternalLink className="size-3.5 shrink-0" />
                        Facebook
                      </a>
                    ) : null}
                  </div>
                </div>

                <Link
                  href="/#akademia"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-[var(--club-secondary)] px-5 text-sm font-bold text-[var(--club-primary)] shadow-md hover:brightness-105 md:self-auto"
                >
                  <UserPlus className="size-4" />
                  Zapisz dziecko
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <PublicSiteNav />

      <main id="main-content" className="flex-1">{children}</main>

      <footer className="mt-6 border-t border-black/5 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={cn(CLUB_DISPLAY_CLASS, "font-bold text-[var(--club-primary)]")}>{clubName}</p>
              <p className="text-sm text-muted-foreground">{officialName}</p>
            </div>
            {activeSocial.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeSocial.map((item) => (
                  <a
                    key={item.id}
                    href={item.profileUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold text-[var(--club-primary)] hover:bg-[var(--club-primary)] hover:text-white"
                  >
                    {WEBSITE_SOCIAL_PLATFORM_LABELS[item.platform]}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="border-t py-3 text-center text-[11px] text-muted-foreground">
          {formatPublicSiteFooter(clubName)}
        </div>
      </footer>
    </div>
  );
}
