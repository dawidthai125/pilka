"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { COMMUNICATION_NAV } from "@/lib/communication/constants";
import { cn } from "@/lib/utils";

export function CommunicationSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b pb-2 text-sm">
      {COMMUNICATION_NAV.map((item) => {
        const active = pathname === item.href || (item.href !== "/communication" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
