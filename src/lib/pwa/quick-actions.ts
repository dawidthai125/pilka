import type { LucideIcon } from "lucide-react";
import {
  CalendarPlus,
  ClipboardCheck,
  NotebookPen,
  Trophy,
  Wallet,
  Handshake,
  Bot,
  Users,
  Video,
  Medal,
  Newspaper,
} from "lucide-react";

import {
  canManageMatches,
  canManageTrainings,
  canManageVideos,
  canManageContent,
  canReadLeague,
  canMarkTrainingAttendance,
  canSetTrainingAvailability,
  canManagePlayers,
  canAccessFinancePortal,
  canAccessSponsorPortal,
  canUseAiChat,
  canReadPlayers,
} from "@/config/permissions";
import type { ClubRole } from "@/types/rbac";

export type QuickAction = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export function getQuickActionsForRoles(roles: ClubRole[]): QuickAction[] {
  const actions: QuickAction[] = [];

  if (canManageTrainings(roles)) {
    actions.push({
      id: "add-training",
      label: "Dodaj trening",
      href: "/training/new",
      icon: CalendarPlus,
    });
  }
  if (canManageMatches(roles)) {
    actions.push({
      id: "add-match",
      label: "Dodaj mecz",
      href: "/matches/new",
      icon: Trophy,
    });
  }
  if (canMarkTrainingAttendance(roles)) {
    actions.push({
      id: "attendance",
      label: "Oznacz obecność",
      href: "/training",
      icon: ClipboardCheck,
    });
  }
  if (canManageMatches(roles)) {
    actions.push({
      id: "add-result",
      label: "Dodaj wynik",
      href: "/matches",
      icon: Trophy,
    });
  }
  if (canManagePlayers(roles)) {
    actions.push({
      id: "add-note",
      label: "Dodaj notatkę",
      href: "/players",
      icon: NotebookPen,
    });
  }
  if (canSetTrainingAvailability(roles)) {
    actions.push({
      id: "availability-hub",
      label: "Frekwencja",
      href: "/attendance",
      icon: ClipboardCheck,
    });
  }
  if (canAccessFinancePortal(roles)) {
    actions.push({
      id: "fees",
      label: "Moje składki",
      href: "/finance/portal",
      icon: Wallet,
    });
  }
  if (canAccessSponsorPortal(roles)) {
    actions.push({
      id: "sponsor-portal",
      label: "Panel sponsora",
      href: "/sponsors/portal",
      icon: Handshake,
    });
  }
  if (canManageVideos(roles)) {
    actions.push({
      id: "video-upload",
      label: "Video Center",
      href: "/video",
      icon: Video,
    });
  }
  if (canReadLeague(roles) && actions.length < 6) {
    actions.push({
      id: "league-hub",
      label: "League Hub",
      href: "/league",
      icon: Medal,
    });
  }
  if (canManageContent(roles)) {
    actions.push({
      id: "content-hub",
      label: "Content Hub",
      href: "/content",
      icon: Newspaper,
    });
  }
  if (canUseAiChat(roles)) {
    actions.push({
      id: "ai-chat",
      label: "AI Assistant",
      href: "/ai/chat",
      icon: Bot,
    });
  }
  if (canReadPlayers(roles) && actions.length < 6) {
    actions.push({
      id: "team",
      label: "Skład drużyny",
      href: "/players",
      icon: Users,
    });
  }

  return actions.slice(0, 6);
}

export type MobileDashboardVariant = "coach" | "player" | "parent" | "president" | "sponsor" | "default";

export function resolveMobileDashboardVariant(roles: ClubRole[]): MobileDashboardVariant {
  if (roles.includes("sponsor") && roles.length <= 2) return "sponsor";
  if (roles.includes("player") && !roles.includes("coach")) return "player";
  if (roles.includes("parent") && !roles.some((r) => ["coach", "president", "owner"].includes(r))) {
    return "parent";
  }
  if (roles.includes("coach")) return "coach";
  if (roles.includes("president") || roles.includes("owner")) return "president";
  return "default";
}

export const MOBILE_DASHBOARD_COPY: Record<
  MobileDashboardVariant,
  { title: string; subtitle: string }
> = {
  coach: {
    title: "Panel trenera",
    subtitle: "Treningi, obecności i skład na dziś.",
  },
  player: {
    title: "Panel zawodnika",
    subtitle: "Twój terminarz i dostępność na treningi.",
  },
  parent: {
    title: "Panel rodzica",
    subtitle: "Informacje o dziecku i składkach.",
  },
  president: {
    title: "Panel zarządu",
    subtitle: "Klub, finanse i terminarz meczów.",
  },
  sponsor: {
    title: "Panel sponsora",
    subtitle: "Terminarz i kontakt z klubem.",
  },
  default: {
    title: "Start",
    subtitle: "Szybki dostęp do modułów klubu.",
  },
};
