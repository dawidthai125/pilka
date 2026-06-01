"use client";

import { WifiOff } from "lucide-react";

import { t, getStoredLocale } from "@/lib/pwa/i18n";

export function OfflineBanner() {
  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-sm font-medium text-white"
    >
      <WifiOff className="size-4 shrink-0" />
      {t("offline.banner", getStoredLocale())}
    </div>
  );
}
