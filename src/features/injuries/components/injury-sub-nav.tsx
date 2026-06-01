"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { INJURY_NAV } from "@/types/injuries";
import type { ClubRole } from "@/types/rbac";
import {
  canAccessInjuryPortal,
  canManageInjuryConfig,
  canManageInjuryStaff,
} from "@/config/permissions";

export function InjurySubNav({ roles }: { roles: ClubRole[] }) {
  const pathname = usePathname();
  const staff = canManageInjuryStaff(roles);
  const portal = canAccessInjuryPortal(roles);
  const config = canManageInjuryConfig(roles);

  const items = INJURY_NAV.filter((item) => {
    if (item.href === "/injuries/portal") return portal;
    if (item.href === "/injuries/categories") return config;
    if (item.href === "/injuries/report") return staff;
    if (item.href === "/injuries/ai" || item.href === "/injuries/history") return staff;
    if (item.href === "/injuries/registry") return staff;
    return staff || portal;
  });

  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b pb-2">
      {items.map((item) => {
        const active =
          item.href === "/injuries"
            ? pathname === "/injuries"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
