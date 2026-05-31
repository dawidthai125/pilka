import {
  Bot,
  Building2,
  CalendarDays,
  ClipboardList,
  Handshake,
  LayoutDashboard,
  Shield,
  ListOrdered,
  Trophy,
  User,
  UserRound,
  Users,
} from "lucide-react";

export const dashboardNav = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Profil użytkownika",
    href: "/profile",
    icon: User,
  },
  {
    title: "Profil klubu",
    href: "/club",
    icon: Building2,
  },
  {
    title: "Drużyny",
    href: "/teams",
    icon: Users,
  },
  {
    title: "Zawodnicy",
    href: "/players",
    icon: UserRound,
  },
  {
    title: "Treningi",
    href: "/training",
    icon: CalendarDays,
  },
  {
    title: "Mecze",
    href: "/matches",
    icon: Trophy,
  },
  {
    title: "Tabela ligowa",
    href: "/matches/league-table",
    icon: ListOrdered,
  },
  {
    title: "Panel trenera",
    href: "/training/coach",
    icon: ClipboardList,
  },
  {
    title: "Club AI Assistant",
    href: "/ai",
    icon: Bot,
  },
  {
    title: "Sponsorzy",
    href: "/sponsors",
    icon: Handshake,
    audience: "staff" as const,
  },
  {
    title: "Panel sponsora",
    href: "/sponsors/portal",
    icon: Handshake,
    audience: "sponsor" as const,
  },
  {
    title: "Role i uprawnienia",
    href: "/members",
    icon: Shield,
  },
] as const;
