"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/attendance", label: "Dashboard" },
  { href: "/attendance/calendar", label: "Kalendarz" },
  { href: "/attendance/coach", label: "Raporty trenera" },
  { href: "/attendance/ai", label: "AI Insights" },
];

export function AttendanceSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b pb-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm",
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
