"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { ClubLogo } from "@/components/club/club-logo";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { t, getStoredLocale } from "@/lib/pwa/i18n";
import type { ClubRole } from "@/types/rbac";

export function MobileMoreSheet({
  roles,
  clubName,
  logoUrl,
}: {
  roles: ClubRole[];
  clubName: string;
  logoUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const locale = getStoredLocale();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="flex min-h-[56px] w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium text-muted-foreground"
      >
        <MoreHorizontal className="size-5" />
        <span>{t("nav.more", locale)}</span>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <ClubLogo logoUrl={logoUrl} clubName={clubName} size="sm" />
            <div className="min-w-0 text-left">
              <SheetTitle className="truncate">{clubName}</SheetTitle>
              <p className="text-sm text-muted-foreground">Menu klubu</p>
            </div>
          </div>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto pb-8" onClick={() => setOpen(false)}>
          <DashboardNav roles={roles} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
