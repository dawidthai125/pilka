import Link from "next/link";
import { ExternalLink, MapPin, Phone } from "lucide-react";

import { ClubLogo } from "@/components/club/club-logo";
import {
  CLUB_COVER_IMAGE,
  CLUB_DISPLAY_CLASS,
  PUBLIC_NAV_LINKS,
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
      <div className="relative bg-[var(--club-primary)]">
        <div className="relative h-44 overflow-hidden sm:h-56 lg:h-64">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--club-primary)]/90 via-[var(--club-primary)]/20 to-transparent" />
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="-mt-14 flex flex-col gap-4 pb-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <ClubLogo
                logoUrl={logoUrl}
                clubName={clubName}
                size="xl"
                onDark
                className="size-24 shrink-0 rounded-2xl border-4 border-[#f0f2f5] bg-[var(--club-primary)] shadow-lg sm:size-28"
              />
              <div className="min-w-0 pb-1">
                <h1 className={cn(CLUB_DISPLAY_CLASS, "text-2xl font-bold text-white sm:text-3xl")}>{clubName}</h1>
                <p className="text-sm text-white/85">{officialName}</p>
                {settings.contactAddress ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-white/75">
                    <MapPin className="size-3.5 shrink-0" />
                    {settings.contactAddress}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pb-1">
              {settings.contactPhone ? (
                <a
                  href={`tel:${settings.contactPhone.replace(/\s/g, "")}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--club-secondary)] px-4 text-sm font-bold text-[var(--club-primary)]"
                >
                  <Phone className="size-4" />
                  {settings.contactPhone}
                </a>
              ) : null}
              {facebookLink?.profileUrl ? (
                <a
                  href={facebookLink.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-sm"
                >
                  Facebook
                  <ExternalLink className="size-3.5" />
                </a>
              ) : null}
              <Link
                href="/#akademia"
                className="inline-flex min-h-10 items-center rounded-lg border border-white/30 px-4 text-sm font-semibold text-white"
              >
                Zapisz dziecko
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-40 border-b border-black/5 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto py-1" aria-label="Nawigacja główna">
            <Link
              href="/"
              className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:text-[var(--club-primary)]"
            >
              Start
            </Link>
            {PUBLIC_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:border-[var(--club-primary)] hover:text-[var(--club-primary)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link href="/login" className="hidden shrink-0 text-xs text-muted-foreground hover:text-[var(--club-primary)] sm:inline">
            Panel klubu
          </Link>
        </div>
      </div>

      <main id="main-content" className="flex-1">{children}</main>

      <footer className="border-t border-black/5 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className={cn(CLUB_DISPLAY_CLASS, "text-lg font-bold text-[var(--club-primary)]")}>{clubName}</p>
              <p className="mt-1 text-sm text-muted-foreground">{officialName}</p>
              <p className="mt-3 text-sm text-muted-foreground">Treningi, mecze i wspólnota — tak jak na naszym Facebooku.</p>
            </div>
            <div className="space-y-2 text-sm">
              {settings.contactPhone ? (
                <p>
                  <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="font-semibold text-[var(--club-primary)] hover:underline">
                    {settings.contactPhone}
                  </a>
                </p>
              ) : null}
              {settings.contactEmail ? (
                <p>
                  <a href={`mailto:${settings.contactEmail}`} className="hover:underline">
                    {settings.contactEmail}
                  </a>
                </p>
              ) : null}
              <Link href="/kontakt" className="inline-block pt-1 font-semibold text-[var(--club-primary)] hover:underline">
                Kontakt
              </Link>
            </div>
          </div>

          {activeSocial.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {activeSocial.map((item) => (
                <a
                  key={item.id}
                  href={item.profileUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border px-4 py-2 text-xs font-semibold text-[var(--club-primary)] transition hover:bg-[var(--club-primary)] hover:text-white"
                >
                  {WEBSITE_SOCIAL_PLATFORM_LABELS[item.platform]}
                </a>
              ))}
            </div>
          ) : null}
        </div>
        <div className="border-t py-4 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} {clubName} · Football Club OS
        </div>
      </footer>
    </div>
  );
}
