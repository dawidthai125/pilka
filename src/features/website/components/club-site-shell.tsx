import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { PUBLIC_NAV_LINKS } from "@/lib/website/constants";
import { cn } from "@/lib/utils";
import type { WebsiteSettings } from "@/types/website";

type ClubSiteShellProps = {
  clubName: string;
  officialName: string;
  settings: WebsiteSettings;
  logoUrl?: string | null;
  children: React.ReactNode;
};

export function ClubSiteShell({
  clubName,
  officialName,
  settings,
  logoUrl,
  children,
}: ClubSiteShellProps) {
  const style = {
    ["--club-primary" as string]: settings.primaryColor,
    ["--club-secondary" as string]: settings.secondaryColor,
    ["--club-accent" as string]: settings.accentColor,
  } as React.CSSProperties;

  return (
    <div className="flex min-h-screen flex-col bg-background" style={style}>
      <header className="sticky top-0 z-40 border-b bg-[var(--club-primary)] text-[var(--club-accent)] shadow-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={clubName}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--club-secondary)] text-sm font-bold text-[var(--club-primary)]">
                PW
              </span>
            )}
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
          </nav>
          <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "bg-[var(--club-secondary)] text-[var(--club-primary)] hover:opacity-90")}>
            Panel klubu
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

      <footer className="border-t bg-[var(--club-primary)] text-[var(--club-accent)]">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-3">
          <div>
            <p className="font-semibold">{clubName}</p>
            <p className="mt-1 text-sm opacity-80">{officialName}</p>
          </div>
          <div className="text-sm opacity-90">
            {settings.contactAddress ? <p>{settings.contactAddress}</p> : null}
            {settings.contactEmail ? <p className="mt-1">{settings.contactEmail}</p> : null}
            {settings.contactPhone ? <p className="mt-1">{settings.contactPhone}</p> : null}
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/kontakt" className="underline opacity-90">Kontakt</Link>
            <Link href="/kibic" className="underline opacity-90">Panel kibica</Link>
            <Link href="/login" className="underline opacity-90">Logowanie do systemu</Link>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs opacity-70">
          © {new Date().getFullYear()} {clubName} · Powered by Football Club OS
        </div>
      </footer>
    </div>
  );
}
