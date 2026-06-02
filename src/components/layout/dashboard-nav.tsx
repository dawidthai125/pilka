"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  canAccessFinancePortal,
  canAccessInventoryPortal,
  canAccessSponsorPortal,
  canReadAcademy,
  canReadAi,
  canReadFinance,
  canReadIntegrations,
  canReadLeague,
  canReadInventory,
  canReadOwnDevelopment,
  canReadScouting,
  canReadSponsors,
  canReadVideos,
  canReadContent,
  canReadCommunication,
  canReadAttendance,
  canReadCrm,
  canAccessCrmPortal,
  canReadEquipment,
  canAccessEquipmentPortal,
  canReadInjuries,
  canAccessInjuryPortal,
  canReadWebsite,
} from "@/config/permissions";
import { dashboardNav } from "@/config/navigation";
import {
  PARENT_ONLY_HREFS,
  PLAYER_ONLY_HREFS,
  SPONSOR_ONLY_HREFS,
  WEBSITE_ADMIN_HREFS,
} from "@/lib/navigation/mobile-nav";
import { cn } from "@/lib/utils";
import type { ClubRole } from "@/types/rbac";

export function DashboardNav({
  roles,
  onNavigate,
  variant = "default",
}: {
  roles?: ClubRole[];
  onNavigate?: () => void;
  variant?: "default" | "sidebar";
}) {
  const pathname = usePathname();
  const items = roles
    ? roles.includes("website_admin") && !canReadFinance(roles) && !canReadInventory(roles)
      ? dashboardNav.filter((item) => WEBSITE_ADMIN_HREFS.some((h) => item.href === h || item.href.startsWith(`${h}/`)))
      : canAccessSponsorPortal(roles) && !canReadSponsors(roles)
      ? dashboardNav.filter((item) => SPONSOR_ONLY_HREFS.includes(item.href))
      : canAccessFinancePortal(roles) && !canReadFinance(roles)
        ? dashboardNav.filter((item) => PARENT_ONLY_HREFS.includes(item.href))
        : canAccessInventoryPortal(roles) && !canReadInventory(roles)
          ? dashboardNav.filter((item) => PLAYER_ONLY_HREFS.includes(item.href))
          : dashboardNav.filter((item) => {
          if (item.href === "/ai") return canReadAi(roles);
          if (item.href.startsWith("/ai")) return canReadAi(roles);
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
          if ("audience" in item && item.audience === "inventory_staff") {
            return canReadInventory(roles);
          }
          if ("audience" in item && item.audience === "player") {
            return canAccessInventoryPortal(roles);
          }
          if ("audience" in item && item.audience === "website_staff") {
            return canReadWebsite(roles);
          }
          if ("audience" in item && item.audience === "integration_staff") {
            return canReadIntegrations(roles);
          }
          if ("audience" in item && item.audience === "league_staff") {
            return canReadLeague(roles);
          }
          if ("audience" in item && item.audience === "academy_staff") {
            return canReadAcademy(roles) || canReadOwnDevelopment(roles) || canReadScouting(roles);
          }
          if ("audience" in item && item.audience === "video_staff") {
            return canReadVideos(roles);
          }
          if ("audience" in item && item.audience === "content_staff") {
            return canReadContent(roles);
          }
          if ("audience" in item && item.audience === "communication_staff") {
            return canReadCommunication(roles);
          }
          if ("audience" in item && item.audience === "attendance_staff") {
            return canReadAttendance(roles);
          }
          if ("audience" in item && item.audience === "crm_staff") {
            return canReadCrm(roles);
          }
          if ("audience" in item && item.audience === "crm_parent") {
            return canAccessCrmPortal(roles);
          }
          if ("audience" in item && item.audience === "equipment_staff") {
            return canReadEquipment(roles);
          }
          if ("audience" in item && item.audience === "equipment_portal") {
            return canAccessEquipmentPortal(roles);
          }
          if ("audience" in item && item.audience === "injuries_staff") {
            return canReadInjuries(roles);
          }
          if ("audience" in item && item.audience === "injuries_portal") {
            return canAccessInjuryPortal(roles);
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
              : item.href === "/inventory"
                ? pathname.startsWith("/inventory") && !pathname.startsWith("/inventory/portal")
                : item.href === "/website"
                  ? pathname.startsWith("/website")
                  : item.href === "/integrations"
                    ? pathname.startsWith("/integrations")
                    : item.href === "/academy"
                      ? pathname.startsWith("/academy")
                  : item.href === "/video"
                  ? pathname.startsWith("/video")
                  : item.href === "/content"
                    ? pathname.startsWith("/content")
                  : item.href === "/league"
                    ? pathname.startsWith("/league")
                  : item.href === "/communication"
                    ? pathname.startsWith("/communication")
                  : item.href === "/attendance"
                    ? pathname.startsWith("/attendance")
                  : item.href === "/equipment"
                    ? pathname.startsWith("/equipment") && !pathname.startsWith("/equipment/portal")
                  : item.href === "/equipment/portal"
                    ? pathname.startsWith("/equipment/portal")
                  : item.href === "/injuries"
                    ? pathname.startsWith("/injuries") && !pathname.startsWith("/injuries/portal")
                  : item.href === "/injuries/portal"
                    ? pathname.startsWith("/injuries/portal")
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              variant === "sidebar"
                ? active
                  ? "bg-[var(--club-secondary)] font-semibold text-[var(--club-primary)]"
                  : "text-white/85 hover:bg-white/10 hover:text-white"
                : active
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
