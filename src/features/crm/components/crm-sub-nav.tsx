"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CRM_NAV } from "@/types/crm";
import { cn } from "@/lib/utils";

export function CrmSubNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b pb-2">
      {CRM_NAV.map((item) => {
        const active =
          item.href === "/crm"
            ? pathname === "/crm"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
