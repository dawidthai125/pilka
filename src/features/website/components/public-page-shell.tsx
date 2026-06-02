import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { HomeDarkSection, HomeDarkSectionHeader } from "@/features/website/components/public-home-dark-ui";
import { cn } from "@/lib/utils";

type PublicPageShellProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  theme?: "light" | "dark";
};

export function PublicPageShell({
  title,
  subtitle,
  eyebrow,
  children,
  breadcrumbs,
  theme = "dark",
}: PublicPageShellProps) {
  if (theme === "light") {
    return (
      <div className="bg-[#f7f5f0] text-[#0B3D2E]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {breadcrumbs?.length ? (
            <PublicBreadcrumbs breadcrumbs={breadcrumbs} theme="light" />
          ) : null}
          <header className="mb-8 rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{subtitle}</p> : null}
          </header>
          {children}
        </div>
      </div>
    );
  }

  return (
    <HomeDarkSection
      className="club-public-surface-pitch min-h-[calc(100dvh-11rem)] border-t border-white/5 py-10 sm:py-12"
      aria-label={title}
    >
      {breadcrumbs?.length ? <PublicBreadcrumbs breadcrumbs={breadcrumbs} theme="dark" /> : null}
      <HomeDarkSectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      {children}
    </HomeDarkSection>
  );
}

function PublicBreadcrumbs({
  breadcrumbs,
  theme,
}: {
  breadcrumbs: { label: string; href?: string }[];
  theme: "light" | "dark";
}) {
  const isDark = theme === "dark";

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-6 flex flex-wrap items-center gap-1 text-xs", isDark && "-mt-2")}>
      <Link href="/" className={cn("hover:underline", isDark ? "text-white/60" : "text-muted-foreground")}>
        Strona główna
      </Link>
      {breadcrumbs.map((crumb) => (
        <span key={crumb.label} className="inline-flex items-center gap-1">
          <ChevronRight className="size-3" />
          {crumb.href ? (
            <Link href={crumb.href} className={cn("hover:underline", isDark ? "text-white/60" : "text-muted-foreground")}>
              {crumb.label}
            </Link>
          ) : (
            <span className={isDark ? "text-white/90" : "text-foreground"}>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Ciemna karta treści — ten sam styl co sekcje „Mecze i forma” na stronie głównej. */
export function PublicDarkCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-black/25 p-5 backdrop-blur-sm sm:p-6", className)}>
      {children}
    </div>
  );
}
