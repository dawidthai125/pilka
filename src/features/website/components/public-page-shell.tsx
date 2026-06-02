import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { CLUB_DISPLAY_CLASS } from "@/lib/website/constants";
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
  theme = "light",
}: PublicPageShellProps) {
  const isDark = theme === "dark";

  return (
    <div className={cn(isDark ? "bg-[#062820] text-white" : "bg-[#f7f5f0] text-[#0B3D2E]")}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <Link href="/" className={cn("hover:underline", isDark && "text-white/60")}>
              Strona główna
            </Link>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.label} className="inline-flex items-center gap-1">
                <ChevronRight className="size-3" />
                {crumb.href ? (
                  <Link href={crumb.href} className={cn("hover:underline", isDark && "text-white/60")}>
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isDark ? "text-white/90" : "text-foreground"}>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}

        <header className="mb-8 rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-white/5">
          <h1 className={cn(CLUB_DISPLAY_CLASS, "text-3xl font-bold tracking-tight sm:text-4xl", isDark && "text-white")}>
            {title}
          </h1>
          {subtitle ? (
            <p className={cn("mt-2 max-w-2xl text-sm sm:text-base", isDark ? "text-white/75" : "text-muted-foreground")}>
              {subtitle}
            </p>
          ) : null}
        </header>

        {children}
      </div>
    </div>
  );
}
