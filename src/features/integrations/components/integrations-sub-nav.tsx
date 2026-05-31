"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { INTEGRATION_NAV } from "@/lib/integrations/constants";
import { cn } from "@/lib/utils";

export function IntegrationsSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b pb-2" aria-label="Nawigacja integracji">
      {INTEGRATION_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition",
            pathname === item.href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
