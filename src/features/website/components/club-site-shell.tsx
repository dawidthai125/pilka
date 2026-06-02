import Link from "next/link";
import { ExternalLink, Phone, UserPlus } from "lucide-react";

import { ClubLogo } from "@/components/club/club-logo";
import { PublicSiteNav } from "@/features/website/components/public-site-nav";
import {
  CLUB_COVER_IMAGE,
  CLUB_DISPLAY_CLASS,
  WEBSITE_SOCIAL_PLATFORM_LABELS,
} from "@/lib/website/constants";
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

  const cover = coverImageUrl ?? CLUB_COVER_IMAGE;
  const activeSocial = socialLinks.filter((item) => item.isEnabled && item.profileUrl);
  const facebookLink = activeSocial.find((item) => item.platform === "facebook");

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f2f5]" style={style}>
      <header className="relative bg-[var(--club-primary)]">
        <div className="relative h-48 overflow-hidden sm:h-56 md:h-64">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="size-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="-mt-12 flex flex-col gap-4 pb-0 sm:-mt-14 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <ClubLogo
                logoUrl={logoUrl}
                clubName={clubName}
                size="xl"
                onDark
                className="size-24 shrink-0 rounded-full border-4 border-[#f0f2f5] bg-[var(--club-primary)] shadow-lg sm:size-28"
              />
              <div className="min-w-0 pb-1 text-white">
                <h1 className={cn(CLUB_DISPLAY_CLASS, "text-2xl font-bold sm:text-3xl")}>{clubName}</h1>
                <p className="text-sm text-white/90">{officialName}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/85">
                  {settings.contactPhone ? (
                    <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 hover:underline">
                      <Phone className="size-3.5" />
                      {settings.contactPhone}
                    </a>
                  ) : null}
                  {facebookLink?.profileUrl ? (
                    <a
                      href={facebookLink.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="size-3.5" />
                      Facebook
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <Link
              href="/#akademia"
              className="mb-1 inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-[var(--club-secondary)] px-5 text-sm font-bold text-[var(--club-primary)] shadow-md md:self-auto"
            >
              <UserPlus className="size-4" />
              Zapisz dziecko
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
          © {new Date().getFullYear()} {clubName} · Football Club OS
        </div>
      </footer>
    </div>
  );
}
