"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ACADEMY_NAV } from "@/lib/academy/constants";
import { cn } from "@/lib/utils";

export function AcademySubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2">
      {ACADEMY_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "min-h-[44px] shrink-0 rounded-lg border px-3 py-2 text-sm whitespace-nowrap",
            pathname === item.href || (item.href !== "/academy" && pathname.startsWith(item.href))
              ? "border-primary bg-primary/5 font-medium"
              : "text-muted-foreground hover:bg-muted/50",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
