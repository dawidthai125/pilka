"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const allLinks = [
  { href: "/attendance", label: "Dashboard", staffOnly: false },
  { href: "/attendance/calendar", label: "Kalendarz", staffOnly: false },
  { href: "/attendance/coach", label: "Raporty trenera", staffOnly: true },
  { href: "/attendance/ai", label: "AI Insights", staffOnly: true },
] as const;

export function AttendanceSubNav({ showStaffTabs = false }: { showStaffTabs?: boolean }) {
  const pathname = usePathname();
  const links = allLinks.filter((link) => !link.staffOnly || showStaffTabs);

  return (
    <nav className="flex flex-wrap gap-2 border-b pb-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "min-h-11 rounded-md px-3 py-2 text-sm inline-flex items-center",
            pathname === link.href || (link.href !== "/attendance" && pathname.startsWith(link.href))
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
