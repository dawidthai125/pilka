"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AI_NAV } from "@/lib/ai/nav";
import { cn } from "@/lib/utils";

export function AiSubNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b pb-2" aria-label="Nawigacja Asystent AI">
      {AI_NAV.map((item) => {
        const active =
          item.href === "/ai"
            ? pathname === "/ai"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition min-h-[44px] flex items-center",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
