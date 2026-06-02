import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ClubPitchPatternOverlay } from "@/features/website/components/public-home-dark-ui";
import { CLUB_DISPLAY_CLASS, CLUB_SCENE_DARK } from "@/lib/website/constants";
import { cn } from "@/lib/utils";

type PublicPageShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  theme?: "light" | "dark";
};

export function PublicPageShell({
  title,
  subtitle,
  children,
  breadcrumbs,
  theme = "dark",
}: PublicPageShellProps) {
  const isDark = theme === "dark";

  return (
    <div className={cn("relative overflow-hidden", isDark ? CLUB_SCENE_DARK : "bg-[#f7f5f0] text-[#0B3D2E]")}>
      {isDark ? <ClubPitchPatternOverlay /> : null}
      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs">
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
        ) : null}

        <header className="mb-8">
          <h1 className={cn(CLUB_DISPLAY_CLASS, "text-3xl font-bold tracking-tight sm:text-4xl", isDark && "text-white")}>
            {title}
          </h1>
          {subtitle ? (
            <p className={cn("mt-2 max-w-2xl text-sm sm:text-base", isDark ? "text-white/65" : "text-muted-foreground")}>
              {subtitle}
            </p>
          ) : null}
        </header>

        {children}
      </div>
    </div>
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
