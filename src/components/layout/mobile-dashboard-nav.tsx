"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileDashboardNav({
  appName,
  clubName,
}: {
  appName: string;
  clubName: string;
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
        <SheetHeader className="border-b px-6 py-5 text-left">
          <SheetTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {appName}
          </SheetTitle>
          <p className="text-base font-semibold">{clubName}</p>
        </SheetHeader>
        <div className="px-3 py-4">
          <DashboardNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
