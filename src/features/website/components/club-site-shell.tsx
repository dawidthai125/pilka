import Link from "next/link";
import { MapPin } from "lucide-react";

import { ClubLogo } from "@/components/club/club-logo";
import { PUBLIC_NAV_LINKS, WEBSITE_SOCIAL_PLATFORM_LABELS, CLUB_DISPLAY_CLASS } from "@/lib/website/constants";
import { cn } from "@/lib/utils";
import type { WebsiteSettings, WebsiteSocialIntegration } from "@/types/website";

type ClubSiteShellProps = {
  clubName: string;
  officialName: string;
  settings: WebsiteSettings;
  logoUrl?: string | null;
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
    <div className="flex min-h-screen flex-col bg-[#f7f5f0]" style={style}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--club-primary)]/95 text-[var(--club-accent)] shadow-md backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <ClubLogo logoUrl={logoUrl} clubName={clubName} size="md" onDark />
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">{clubName}</p>
              <p className="truncate text-xs opacity-80">{officialName}</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Nawigacja główna">
            {PUBLIC_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium transition hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="ml-2 rounded-md px-2 py-2 text-xs text-white/70 transition hover:text-white">
              Logowanie
            </Link>
          </nav>
          <Link href="/login" className="text-xs text-white/75 underline lg:hidden">
            Logowanie
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 lg:hidden" aria-label="Nawigacja mobilna">
          {PUBLIC_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <main id="main-content" className="flex-1">{children}</main>

      <footer className={cn("border-t border-white/10 bg-[#062820] text-white")}>
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className={cn(CLUB_DISPLAY_CLASS, "text-lg font-bold")}>{clubName}</p>
              <p className="mt-1 text-sm text-white/70">{officialName}</p>
              {settings.contactAddress ? (
                <p className="mt-3 flex items-start gap-2 text-sm text-white/80">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--club-secondary)]" />
                  {settings.contactAddress}
                </p>
              ) : null}
              <p className="mt-4 text-sm text-white/75">Dołącz do nas — treningi, mecze i wspólnota klubu.</p>
            </div>
            <div className="space-y-2 text-sm text-white/85">
              {settings.contactAddress ? <p>{settings.contactAddress}</p> : null}
              {settings.contactPhone ? (
                <p>
                  <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="hover:underline">
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
              <Link href="/kontakt" className="inline-block pt-2 font-semibold text-[var(--club-secondary)] hover:underline">
                Kontakt
              </Link>
            </div>
          </div>

          {activeSocial.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {activeSocial.map((item) => (
                <a
                  key={item.id}
                  href={item.profileUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-[var(--club-secondary)] hover:text-[var(--club-secondary)]"
                >
                  {WEBSITE_SOCIAL_PLATFORM_LABELS[item.platform]}
                </a>
              ))}
            </div>
          ) : null}
        </div>
        <div className="border-t border-white/10 py-4 text-center text-[11px] text-white/45">
          © {new Date().getFullYear()} {clubName}
          <span className="mx-2">·</span>
          System klubu: Football Club OS
        </div>
      </footer>
    </div>
  );
}
