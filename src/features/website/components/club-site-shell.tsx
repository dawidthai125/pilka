import Link from "next/link";
import { Mail, MapPin, Phone, User, UserPlus } from "lucide-react";

import { ClubLogo } from "@/components/club/club-logo";
import { PublicClubNav } from "@/features/website/components/public-club-nav";
import { formatPublicSiteFooter } from "@/config/product";
import { CLUB_DISPLAY_CLASS, PUBLIC_NAV_LINKS, WEBSITE_SOCIAL_PLATFORM_LABELS } from "@/lib/website/constants";
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
  socialLinks = [],
  children,
}: ClubSiteShellProps) {
  const style = {
    ["--club-primary" as string]: settings.primaryColor,
    ["--club-secondary" as string]: settings.secondaryColor,
    ["--club-accent" as string]: settings.accentColor,
  } as React.CSSProperties;

  const activeSocial = socialLinks.filter((item) => item.isEnabled && item.profileUrl);

  return (
    <div className="club-public-surface flex min-h-screen flex-col" style={style}>
      <header className="sticky top-0 z-50 shadow-md">
        {/* Pasek social */}
        {activeSocial.length > 0 ? (
          <div className="bg-[#041810] px-4 py-1.5 text-xs text-white/70 sm:px-6">
            <div className="mx-auto flex max-w-6xl justify-end gap-3">
              {activeSocial.map((item) => (
                <a
                  key={item.id}
                  href={item.profileUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:text-[var(--club-secondary)]"
                >
                  {WEBSITE_SOCIAL_PLATFORM_LABELS[item.platform]}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {/* Nawigacja główna */}
        <div className="bg-[var(--club-primary)]">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="flex shrink-0 items-center gap-3">
              <ClubLogo logoUrl={logoUrl} clubName={clubName} size="md" onDark className="size-11 sm:size-12" />
              <span className={cn(CLUB_DISPLAY_CLASS, "hidden text-lg font-bold text-white sm:inline")}>{clubName}</span>
            </Link>

            <PublicClubNav variant="desktop" />

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Link
                href="/#akademia"
                className="hidden min-h-10 items-center gap-1.5 rounded-lg bg-[var(--club-secondary)] px-4 text-xs font-bold uppercase tracking-wide text-[var(--club-primary)] hover:brightness-105 sm:inline-flex"
              >
                <UserPlus className="size-4" />
                Zapisz dziecko
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/25 px-3 text-xs font-semibold text-white hover:bg-white/10"
              >
                <User className="size-4" />
                <span className="hidden sm:inline">Panel klubu</span>
              </Link>
            </div>
          </div>

          <PublicClubNav variant="mobile" />
        </div>
      </header>

      <main id="main-content" className="club-public-surface flex-1">{children}</main>

      {/* Footer */}
      <footer className={cn(CLUB_DISPLAY_CLASS, "bg-[#041810] text-white")}>
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <ClubLogo logoUrl={logoUrl} clubName={clubName} size="lg" onDark className="mb-3" />
            <p className="font-bold">{clubName}</p>
            <p className="text-sm text-white/70">{officialName}</p>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--club-secondary)]">Kontakt</p>
            <ul className="space-y-2 text-sm text-white/80">
              {settings.contactPhone ? (
                <li>
                  <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-white">
                    <Phone className="size-4 shrink-0 text-[var(--club-secondary)]" />
                    {settings.contactPhone}
                  </a>
                </li>
              ) : null}
              {settings.contactEmail ? (
                <li>
                  <a href={`mailto:${settings.contactEmail}`} className="flex items-center gap-2 hover:text-white">
                    <Mail className="size-4 shrink-0 text-[var(--club-secondary)]" />
                    {settings.contactEmail}
                  </a>
                </li>
              ) : null}
              {settings.contactAddress ? (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--club-secondary)]" />
                  {settings.contactAddress}
                </li>
              ) : null}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--club-secondary)]">Strona</p>
            <ul className="space-y-1.5 text-sm text-white/80">
              {PUBLIC_NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-[var(--club-secondary)]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--club-secondary)]">Klub</p>
            <ul className="space-y-1.5 text-sm text-white/80">
              <li><Link href="/druzyna" className="hover:text-[var(--club-secondary)]">Kadra</Link></li>
              <li><Link href="/mecze" className="hover:text-[var(--club-secondary)]">Terminarz</Link></li>
              <li><Link href="/tabela" className="hover:text-[var(--club-secondary)]">Tabela</Link></li>
              <li><Link href="/login" className="hover:text-[var(--club-secondary)]">Panel klubowy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-[11px] text-white/45">
          {formatPublicSiteFooter(clubName)}
        </div>
      </footer>
    </div>
  );
}
