"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { canReadAi } from "@/config/permissions";
import { dashboardNav } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { ClubRole } from "@/types/rbac";

export function DashboardNav({
  roles,
  onNavigate,
}: {
  roles?: ClubRole[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = roles
    ? dashboardNav.filter((item) => item.href !== "/ai" || canReadAi(roles))
    : dashboardNav;

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
