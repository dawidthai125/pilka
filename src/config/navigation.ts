import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Building2,
  CalendarDays,
  ClipboardList,
  Contact,
  Globe,
  GraduationCap,
  Handshake,
  HardHat,
  HeartPulse,
  LayoutDashboard,
  Link2,
  ListOrdered,
  Medal,
  MessageSquare,
  Newspaper,
  Package,
  Settings,
  Shield,
  Trophy,
  UserCheck,
  UserRound,
  Users,
  Video,
  Wallet,
} from "lucide-react";

export type DashboardNavAudience =
  | "attendance_staff"
  | "crm_staff"
  | "equipment_staff"
  | "injuries_staff"
  | "equipment_portal"
  | "injuries_portal"
  | "crm_parent"
  | "video_staff"
  | "content_staff"
  | "integration_staff"
  | "league_staff"
  | "communication_staff"
  | "academy_staff"
  | "staff"
  | "sponsor"
  | "finance_staff"
  | "parent"
  | "inventory_staff"
  | "player"
  | "website_staff";

export type DashboardNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  audience?: DashboardNavAudience;
};

export type DashboardNavSectionId =
  | "pulpit"
  | "sport"
  | "rozgrywki"
  | "klub"
  | "narzedzia"
  | "administracja";

export type DashboardNavSection = {
  id: DashboardNavSectionId;
  label: string;
  defaultCollapsed?: boolean;
  items: DashboardNavItem[];
};

/** Sprint 20.3B — grouped club panel navigation (URLs unchanged). */
export const dashboardNavSections: DashboardNavSection[] = [
  {
    id: "pulpit",
    label: "Pulpit",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: "sport",
    label: "Sport",
    items: [
      { title: "Mecze", href: "/matches", icon: Trophy },
      { title: "Treningi", href: "/training", icon: CalendarDays },
      {
        title: "Frekwencja",
        href: "/attendance",
        icon: UserCheck,
        audience: "attendance_staff",
      },
      { title: "Kadra", href: "/players", icon: UserRound },
      {
        title: "Urazy",
        href: "/injuries",
        icon: HeartPulse,
        audience: "injuries_staff",
      },
      {
        title: "Panel trenera",
        href: "/training/coach",
        icon: ClipboardList,
      },
      {
        title: "Mój status urazu",
        href: "/injuries/portal",
        icon: HeartPulse,
        audience: "injuries_portal",
      },
      {
        title: "Mój sprzęt",
        href: "/equipment/portal",
        icon: HardHat,
        audience: "equipment_portal",
      },
    ],
  },
  {
    id: "rozgrywki",
    label: "Rozgrywki",
    items: [
      {
        title: "Rozgrywki",
        href: "/league",
        icon: Medal,
        audience: "league_staff",
      },
      {
        title: "Tabela ligowa",
        href: "/matches/league-table",
        icon: ListOrdered,
      },
    ],
  },
  {
    id: "klub",
    label: "Klub",
    items: [
      {
        title: "Komunikacja",
        href: "/communication",
        icon: MessageSquare,
        audience: "communication_staff",
      },
      {
        title: "Strona i treści",
        href: "/website",
        icon: Globe,
        audience: "website_staff",
      },
      {
        title: "Treści",
        href: "/content",
        icon: Newspaper,
        audience: "content_staff",
      },
      {
        title: "Sponsorzy",
        href: "/sponsors",
        icon: Handshake,
        audience: "staff",
      },
      {
        title: "Panel sponsora",
        href: "/sponsors/portal",
        icon: Handshake,
        audience: "sponsor",
      },
      {
        title: "Finanse",
        href: "/finance",
        icon: Wallet,
        audience: "finance_staff",
      },
      {
        title: "Moje składki",
        href: "/finance/portal",
        icon: Wallet,
        audience: "parent",
      },
      {
        title: "Magazyn",
        href: "/inventory",
        icon: Package,
        audience: "inventory_staff",
      },
      {
        title: "Mój magazyn",
        href: "/inventory/portal",
        icon: Package,
        audience: "player",
      },
      {
        title: "Sprzęt",
        href: "/equipment",
        icon: HardHat,
        audience: "equipment_staff",
      },
      {
        title: "CRM",
        href: "/crm",
        icon: Contact,
        audience: "crm_staff",
      },
      {
        title: "Relacje klubu",
        href: "/crm/parents",
        icon: Contact,
        audience: "crm_parent",
      },
      {
        title: "Akademia",
        href: "/academy",
        icon: GraduationCap,
        audience: "academy_staff",
      },
    ],
  },
  {
    id: "narzedzia",
    label: "Narzędzia",
    items: [
      {
        title: "Wideo",
        href: "/video",
        icon: Video,
        audience: "video_staff",
      },
      {
        title: "Asystent AI",
        href: "/ai",
        icon: Bot,
      },
    ],
  },
  {
    id: "administracja",
    label: "Administracja",
    defaultCollapsed: true,
    items: [
      { title: "Drużyny", href: "/teams", icon: Users },
      {
        title: "Integracje",
        href: "/integrations",
        icon: Link2,
        audience: "integration_staff",
      },
      { title: "Role", href: "/members", icon: Shield },
      { title: "Profil klubu", href: "/club", icon: Building2 },
      {
        title: "Ustawienia",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];

/** Flat list — backward compat for portal whitelists and filters. */
export const dashboardNav: DashboardNavItem[] = dashboardNavSections.flatMap(
  (section) => section.items,
);
