"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EquipmentQuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/equipment/assignments"
        className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
      >
        Wydaj sprzęt
      </Link>
      <Link
        href="/equipment/assignments"
        className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
      >
        Zwrot sprzętu
      </Link>
      <Link
        href="/equipment/maintenance"
        className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
      >
        Zgłoś uszkodzenie
      </Link>
    </div>
  );
}
