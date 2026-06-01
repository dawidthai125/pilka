"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Trophy, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { t, getStoredLocale } from "@/lib/pwa/i18n";
import { MobileMoreSheet } from "@/components/pwa/mobile-more-sheet";
import type { ClubRole } from "@/types/rbac";

const tabs = [
  { href: "/dashboard", labelKey: "nav.start", icon: LayoutDashboard, match: (p: string) => p === "/dashboard" },
  { href: "/matches", labelKey: "nav.matches", icon: Trophy, match: (p: string) => p.startsWith("/matches") },
  {
    href: "/training",
    labelKey: "nav.training",
    icon: CalendarDays,
    match: (p: string) => p.startsWith("/training"),
  },
  {
    href: "/players",
    labelKey: "nav.team",
    icon: UserRound,
    match: (p: string) => p.startsWith("/players") || p.startsWith("/teams"),
  },
] as const;

export function BottomNavigation({
  roles,
  appName,
  clubName,
}: {
  roles: ClubRole[];
  appName: string;
  clubName: string;
}) {
  const pathname = usePathname();
  const locale = getStoredLocale();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
      aria-label="Nawigacja mobilna"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.5]")} />
                <span>{t(tab.labelKey, locale)}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <MobileMoreSheet roles={roles} appName={appName} clubName={clubName} />
        </li>
      </ul>
    </nav>
  );
}
