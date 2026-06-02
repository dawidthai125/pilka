"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { ClubLogo } from "@/components/club/club-logo";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import type { ClubRole } from "@/types/rbac";

export function MobileDashboardNav({
  clubName,
  logoUrl,
  roles,
}: {
  clubName: string;
  logoUrl?: string | null;
  roles?: ClubRole[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="md:hidden"
        render={
          <Button variant="outline" size="icon" aria-label="Otwórz menu nawigacji" />
        }
      >
        <Menu className="size-4" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0" showCloseButton>
        <SheetHeader className="border-b bg-sidebar px-4 py-5 text-left text-sidebar-foreground">
          <div className="flex items-center gap-3">
            <ClubLogo logoUrl={logoUrl} clubName={clubName} size="md" onDark />
            <SheetTitle className="text-base font-semibold text-sidebar-foreground">{clubName}</SheetTitle>
          </div>
        </SheetHeader>
        <div className="px-3 py-4">
          <DashboardNav roles={roles} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
