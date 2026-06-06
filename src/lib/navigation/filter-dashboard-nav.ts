import {
  canAccessCrmPortal,
  canAccessEquipmentPortal,
  canAccessFinancePortal,
  canAccessInjuryPortal,
  canAccessInventoryPortal,
  canAccessSponsorPortal,
  canReadAcademy,
  canReadAi,
  canReadAttendance,
  canReadCommunication,
  canReadContent,
  canReadCrm,
  canReadEquipment,
  canReadFinance,
  canReadInjuries,
  canReadIntegrations,
  canReadInventory,
  canReadLeague,
  canReadOwnDevelopment,
  canReadScouting,
  canReadSponsors,
  canReadVideos,
  canReadWebsite,
} from "@/config/permissions";
import type { DashboardNavItem } from "@/config/navigation";
import { dashboardNav } from "@/config/navigation";
import {
  PARENT_ONLY_HREFS,
  PLAYER_ONLY_HREFS,
  SPONSOR_ONLY_HREFS,
  WEBSITE_ADMIN_HREFS,
} from "@/lib/navigation/mobile-nav";
import type { ClubRole } from "@/types/rbac";

export function isDashboardNavItemVisible(item: DashboardNavItem, roles: ClubRole[]): boolean {
  if (item.href === "/ai" || item.href.startsWith("/ai/")) {
    return canReadAi(roles);
  }
  if ("audience" in item && item.audience === "staff") return canReadSponsors(roles);
  if ("audience" in item && item.audience === "sponsor") return canAccessSponsorPortal(roles);
  if ("audience" in item && item.audience === "finance_staff") return canReadFinance(roles);
  if ("audience" in item && item.audience === "parent") return canAccessFinancePortal(roles);
  if ("audience" in item && item.audience === "inventory_staff") return canReadInventory(roles);
  if ("audience" in item && item.audience === "player") return canAccessInventoryPortal(roles);
  if ("audience" in item && item.audience === "website_staff") return canReadWebsite(roles);
  if ("audience" in item && item.audience === "integration_staff") return canReadIntegrations(roles);
  if ("audience" in item && item.audience === "league_staff") return canReadLeague(roles);
  if ("audience" in item && item.audience === "academy_staff") {
    return canReadAcademy(roles) || canReadOwnDevelopment(roles) || canReadScouting(roles);
  }
  if ("audience" in item && item.audience === "video_staff") return canReadVideos(roles);
  if ("audience" in item && item.audience === "content_staff") return canReadContent(roles);
  if ("audience" in item && item.audience === "communication_staff") return canReadCommunication(roles);
  if ("audience" in item && item.audience === "attendance_staff") return canReadAttendance(roles);
  if ("audience" in item && item.audience === "crm_staff") return canReadCrm(roles);
  if ("audience" in item && item.audience === "crm_parent") return canAccessCrmPortal(roles);
  if ("audience" in item && item.audience === "equipment_staff") return canReadEquipment(roles);
  if ("audience" in item && item.audience === "equipment_portal") return canAccessEquipmentPortal(roles);
  if ("audience" in item && item.audience === "injuries_staff") return canReadInjuries(roles);
  if ("audience" in item && item.audience === "injuries_portal") return canAccessInjuryPortal(roles);
  return true;
}

export function filterDashboardNavForRoles(roles: ClubRole[]): DashboardNavItem[] {
  if (roles.includes("website_admin") && !canReadFinance(roles) && !canReadInventory(roles)) {
    return dashboardNav.filter((item) =>
      WEBSITE_ADMIN_HREFS.some((h) => item.href === h || item.href.startsWith(`${h}/`)),
    );
  }
  if (canAccessSponsorPortal(roles) && !canReadSponsors(roles)) {
    return dashboardNav.filter((item) => SPONSOR_ONLY_HREFS.includes(item.href));
  }
  if (canAccessFinancePortal(roles) && !canReadFinance(roles)) {
    return dashboardNav.filter((item) => PARENT_ONLY_HREFS.includes(item.href));
  }
  if (canAccessInventoryPortal(roles) && !canReadInventory(roles)) {
    return dashboardNav.filter((item) => PLAYER_ONLY_HREFS.includes(item.href));
  }
  return dashboardNav.filter((item) => isDashboardNavItemVisible(item, roles));
}
