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

function formatFacebookLabel(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

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
        <div className="relative h-[200px] overflow-hidden sm:h-[220px] md:h-[248px]">
          {hasCoverPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImageUrl!} alt="" className="size-full object-cover object-center" />
          ) : (
            <div
              className="size-full bg-gradient-to-br from-[var(--club-primary)] via-[color-mix(in_srgb,var(--club-primary)_88%,#000)] to-[#041810]"
              aria-hidden
            />
          )}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10"
            aria-hidden
          />

          <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-6xl items-end justify-between gap-3 px-4 pb-4 sm:px-6 sm:pb-5">
            <div className="flex min-w-0 items-end gap-3 sm:gap-4">
              <ClubLogo
                logoUrl={logoUrl}
                clubName={clubName}
                variant="profile"
                className="size-[88px] shrink-0 border-[3px] border-white bg-white shadow-lg sm:size-[96px] md:size-[104px]"
              />
              <div className="min-w-0 pb-0.5 text-white">
                <h1
                  className={cn(
                    CLUB_DISPLAY_CLASS,
                    "truncate text-xl font-bold leading-tight drop-shadow-sm sm:text-2xl md:text-[1.75rem]",
                  )}
                >
                  {clubName}
                </h1>
                <p className="mt-0.5 truncate text-sm text-white/95 sm:text-base">{officialName}</p>
                <div className="mt-2 flex flex-col gap-1 text-xs text-white/90 sm:flex-row sm:flex-wrap sm:gap-x-4">
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
                      {formatFacebookLabel(facebookLink.profileUrl)}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <Link
              href="/#akademia"
              className="mb-0.5 inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--club-secondary)] px-4 text-sm font-bold text-[var(--club-primary)] shadow-md hover:brightness-105 sm:min-h-11 sm:px-5"
            >
              <UserPlus className="size-4" />
              <span className="hidden sm:inline">Zapisz dziecko</span>
              <span className="sm:hidden">Zapisz</span>
            </Link>
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
