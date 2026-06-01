"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { t, getStoredLocale } from "@/lib/pwa/i18n";
import type { ClubRole } from "@/types/rbac";

export function MobileMoreSheet({
  roles,
  appName,
  clubName,
}: {
  roles: ClubRole[];
  appName: string;
  clubName: string;
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
          <SheetTitle>{appName}</SheetTitle>
          <p className="text-sm text-muted-foreground">{clubName}</p>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto pb-8" onClick={() => setOpen(false)}>
          <DashboardNav roles={roles} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
