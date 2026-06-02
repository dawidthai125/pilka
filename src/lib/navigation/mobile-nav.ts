import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Handshake,
  HeartPulse,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  Trophy,
  UserRound,
  Wallet,
} from "lucide-react";

import {
  canAccessFinancePortal,
  canAccessInjuryPortal,
  canAccessInventoryPortal,
  canAccessSponsorPortal,
  canReadAttendance,
  canReadCommunication,
  canReadFinance,
  canReadInventory,
  canReadMatches,
  canReadPlayers,
  canReadSponsors,
  canReadTrainings,
} from "@/config/permissions";
import type { ClubRole } from "@/types/rbac";

export type BottomNavTab = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

/** Whitelist hrefs for portal-only roles (sidebar + consistency). */
export const SPONSOR_ONLY_HREFS: readonly string[] = [
  "/dashboard",
  "/profile",
  "/club",
  "/sponsors/portal",
  "/content",
  "/communication",
] as const;

export const PARENT_ONLY_HREFS: readonly string[] = [
  "/dashboard",
  "/profile",
  "/club",
  "/finance/portal",
  "/training",
  "/matches",
  "/players",
  "/academy",
  "/academy/development",
  "/communication",
  "/attendance",
  "/crm/parents",
  "/equipment/portal",
  "/injuries/portal",
] as const;

export const PLAYER_ONLY_HREFS: readonly string[] = [
  "/dashboard",
  "/profile",
  "/club",
  "/inventory/portal",
  "/training",
  "/matches",
  "/league",
  "/players",
  "/academy",
  "/academy/development",
  "/communication",
  "/attendance",
  "/equipment/portal",
  "/injuries/portal",
] as const;

export const WEBSITE_ADMIN_HREFS: readonly string[] = ["/dashboard", "/profile", "/website", "/content"];

function dashboardTab(): BottomNavTab {
  return {
    href: "/dashboard",
    labelKey: "nav.start",
    icon: LayoutDashboard,
    match: (p) => p === "/dashboard",
  };
}

function matchesTab(): BottomNavTab {
  return {
    href: "/matches",
    labelKey: "nav.matches",
    icon: Trophy,
    match: (p) => p.startsWith("/matches"),
  };
}

function trainingTab(): BottomNavTab {
  return {
    href: "/training",
    labelKey: "nav.training",
    icon: CalendarDays,
    match: (p) => p.startsWith("/training"),
  };
}

function teamTab(): BottomNavTab {
  return {
    href: "/players",
    labelKey: "nav.team",
    icon: UserRound,
    match: (p) => p.startsWith("/players") || p.startsWith("/teams"),
  };
}

/** Up to 4 tabs shown in bottom bar; remainder via „Więcej”. */
export function resolveBottomNavTabs(roles: ClubRole[]): BottomNavTab[] {
  const isSponsorPortalOnly = canAccessSponsorPortal(roles) && !canReadSponsors(roles);
  const isParentPortalOnly = canAccessFinancePortal(roles) && !canReadFinance(roles);
  const isPlayerPortalOnly = canAccessInventoryPortal(roles) && !canReadInventory(roles);

  if (isSponsorPortalOnly) {
    return [
      dashboardTab(),
      {
        href: "/sponsors/portal",
        labelKey: "nav.sponsorPortal",
        icon: Handshake,
        match: (p) => p.startsWith("/sponsors/portal"),
      },
      {
        href: "/content",
        labelKey: "nav.content",
        icon: Newspaper,
        match: (p) => p.startsWith("/content"),
      },
      {
        href: "/communication",
        labelKey: "nav.communication",
        icon: MessageSquare,
        match: (p) => p.startsWith("/communication"),
      },
    ];
  }

  if (isParentPortalOnly) {
    const tabs: BottomNavTab[] = [
      dashboardTab(),
      {
        href: "/finance/portal",
        labelKey: "nav.fees",
        icon: Wallet,
        match: (p) => p.startsWith("/finance/portal"),
      },
    ];
    if (canReadAttendance(roles)) {
      tabs.push({
        href: "/attendance",
        labelKey: "nav.attendance",
        icon: CalendarDays,
        match: (p) => p.startsWith("/attendance"),
      });
    }
    if (canAccessInjuryPortal(roles)) {
      tabs.push({
        href: "/injuries/portal",
        labelKey: "nav.injury",
        icon: HeartPulse,
        match: (p) => p.startsWith("/injuries/portal"),
      });
    } else if (canReadCommunication(roles)) {
      tabs.push({
        href: "/communication",
        labelKey: "nav.communication",
        icon: MessageSquare,
        match: (p) => p.startsWith("/communication"),
      });
    }
    if (tabs.length < 4 && canReadCommunication(roles) && !tabs.some((t) => t.href === "/communication")) {
      tabs.push({
        href: "/communication",
        labelKey: "nav.communication",
        icon: MessageSquare,
        match: (p) => p.startsWith("/communication"),
      });
    }
    return tabs.slice(0, 4);
  }

  if (isPlayerPortalOnly) {
    const tabs: BottomNavTab[] = [dashboardTab()];
    if (canReadTrainings(roles)) tabs.push(trainingTab());
    if (canReadMatches(roles)) tabs.push(matchesTab());
    if (canReadAttendance(roles)) {
      tabs.push({
        href: "/attendance",
        labelKey: "nav.attendance",
        icon: CalendarDays,
        match: (p) => p.startsWith("/attendance"),
      });
    }
    if (tabs.length < 4 && canAccessInjuryPortal(roles)) {
      tabs.push({
        href: "/injuries/portal",
        labelKey: "nav.injury",
        icon: HeartPulse,
        match: (p) => p.startsWith("/injuries/portal"),
      });
    }
    return tabs.slice(0, 4);
  }

  const tabs: BottomNavTab[] = [dashboardTab()];
  if (canReadMatches(roles)) tabs.push(matchesTab());
  if (canReadTrainings(roles)) tabs.push(trainingTab());
  if (canReadPlayers(roles)) tabs.push(teamTab());
  if (tabs.length < 4 && canReadAttendance(roles)) {
    tabs.push({
      href: "/attendance",
      labelKey: "nav.attendance",
      icon: CalendarDays,
      match: (p) => p.startsWith("/attendance"),
    });
  }
  return tabs.slice(0, 4);
}

export function canShowCoachDay(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "coach"] as ClubRole[]).includes(role),
  );
}
