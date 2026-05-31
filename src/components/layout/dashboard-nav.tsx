"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  canAccessFinancePortal,
  canAccessSponsorPortal,
  canReadAi,
  canReadFinance,
  canReadSponsors,
} from "@/config/permissions";
import { dashboardNav } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { ClubRole } from "@/types/rbac";

const SPONSOR_ONLY_HREFS = ["/dashboard", "/profile", "/club", "/sponsors/portal"];
const PARENT_ONLY_HREFS = ["/dashboard", "/profile", "/club", "/finance/portal", "/training", "/matches", "/players"];

export function DashboardNav({
  roles,
  onNavigate,
}: {
  roles?: ClubRole[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = roles
    ? canAccessSponsorPortal(roles) && !canReadSponsors(roles)
      ? dashboardNav.filter((item) => SPONSOR_ONLY_HREFS.includes(item.href))
      : canAccessFinancePortal(roles) && !canReadFinance(roles)
        ? dashboardNav.filter((item) => PARENT_ONLY_HREFS.includes(item.href))
        : dashboardNav.filter((item) => {
          if (item.href === "/ai") return canReadAi(roles);
          if ("audience" in item && item.audience === "staff") return canReadSponsors(roles);
          if ("audience" in item && item.audience === "sponsor") {
            return canAccessSponsorPortal(roles);
          }
          if ("audience" in item && item.audience === "finance_staff") {
            return canReadFinance(roles);
          }
          if ("audience" in item && item.audience === "parent") {
            return canAccessFinancePortal(roles);
          }
          return true;
        })
    : dashboardNav;

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/sponsors"
            ? pathname.startsWith("/sponsors") && !pathname.startsWith("/sponsors/portal")
            : item.href === "/finance"
              ? pathname.startsWith("/finance") && !pathname.startsWith("/finance/portal")
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

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
