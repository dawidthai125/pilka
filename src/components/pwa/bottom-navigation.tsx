"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { resolveBottomNavTabs } from "@/lib/navigation/mobile-nav";
import { cn } from "@/lib/utils";
import { t, getStoredLocale } from "@/lib/pwa/i18n";
import { MobileMoreSheet } from "@/components/pwa/mobile-more-sheet";
import type { ClubRole } from "@/types/rbac";

export function BottomNavigation({
  roles,
  clubName,
  logoUrl,
}: {
  roles: ClubRole[];
  clubName: string;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const locale = getStoredLocale();
  const tabs = resolveBottomNavTabs(roles);
  const gridCols = tabs.length + 1;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[color-mix(in_srgb,var(--club-primary)_20%,transparent)] bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
      aria-label="Nawigacja mobilna"
    >
      <ul
        className="mx-auto grid max-w-lg"
        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
      >
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
                <span className="max-w-full truncate">{t(tab.labelKey, locale)}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <MobileMoreSheet roles={roles} clubName={clubName} logoUrl={logoUrl} />
        </li>
      </ul>
    </nav>
  );
}
