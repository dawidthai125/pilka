import {
  Building2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Shield,
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
    title: "Panel trenera",
    href: "/training/coach",
    icon: ClipboardList,
  },
  {
    title: "Role i uprawnienia",
    href: "/members",
    icon: Shield,
  },
] as const;
