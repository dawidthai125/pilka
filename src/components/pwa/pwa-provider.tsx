"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  clearAllPwaLocalData,
  setOfflineScope,
} from "@/lib/pwa/offline-store";
import { registerSyncOnReconnect, refreshOfflineCacheFromApi } from "@/lib/pwa/sync-queue";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export function PwaProvider({
  children,
  userId,
  clubId,
}: {
  children: React.ReactNode;
  userId: string;
  clubId: string;
}) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    setOfflineScope(userId, clubId);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        void clearAllPwaLocalData();
      }
    });

    const unregisterSync = registerSyncOnReconnect(() => {
      void refreshOfflineCacheFromApi(true);
    });
    const refreshTimer = window.setTimeout(() => {
      void refreshOfflineCacheFromApi();
    }, 2500);

    return () => {
      window.clearTimeout(refreshTimer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      subscription.unsubscribe();
      unregisterSync();
    };
  }, [userId, clubId]);

  return (
    <>
      {!online ? <OfflineBanner /> : null}
      <InstallPrompt />
      {children}
    </>
  );
}
