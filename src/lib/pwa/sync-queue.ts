import {
  clearAllPwaLocalData,
  incrementSyncItemRetries,
  listSyncQueue,
  removeSyncItem,
  type SyncQueueItem,
} from "@/lib/pwa/offline-store";

const MAX_SYNC_RETRIES = 5;

export async function flushSyncQueue(): Promise<{ synced: number; failed: number }> {
  const items = await listSyncQueue();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    const ok = await pushSyncItem(item);
    if (ok) {
      await removeSyncItem(item.id);
      synced += 1;
    } else {
      failed += 1;
    }
  }

  return { synced, failed };
}

async function pushSyncItem(item: SyncQueueItem): Promise<boolean> {
  try {
    const response = await fetch("/api/pwa/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: item.type, payload: item.payload }),
    });

    if (response.status === 401) {
      await clearAllPwaLocalData();
      return false;
    }

    if (!response.ok) {
      if (item.retries >= MAX_SYNC_RETRIES) {
        await removeSyncItem(item.id);
      } else {
        await incrementSyncItemRetries(item);
      }
      return false;
    }

    return true;
  } catch {
    if (item.retries >= MAX_SYNC_RETRIES) {
      await removeSyncItem(item.id);
    } else {
      await incrementSyncItemRetries(item);
    }
    return false;
  }
}

export function registerSyncOnReconnect(onSynced?: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const handler = () => {
    if (!navigator.onLine) return;
    void flushSyncQueue().then((result) => {
      if (result.synced > 0) onSynced?.();
    });
  };

  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}

const OFFLINE_REFRESH_TTL_MS = 5 * 60 * 1000;
const LAST_REFRESH_KEY = "fcos:pwa-offline-refreshed-at";

export async function refreshOfflineCacheFromApi(force = false): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;

  if (!force) {
    const lastRefresh = sessionStorage.getItem(LAST_REFRESH_KEY);
    if (lastRefresh && Date.now() - Number(lastRefresh) < OFFLINE_REFRESH_TTL_MS) {
      return;
    }
  }

  try {
    const response = await fetch("/api/pwa/offline-data", { cache: "no-store" });

    if (response.status === 401) {
      await clearAllPwaLocalData();
      return;
    }

    if (!response.ok) return;

    const data = await response.json();
    const { saveOfflineCache, OFFLINE_CACHE_KEYS } = await import("@/lib/pwa/offline-store");
    await saveOfflineCache(OFFLINE_CACHE_KEYS.profile, data.profile);
    await saveOfflineCache(OFFLINE_CACHE_KEYS.schedule, {
      matches: data.recentMatches,
      trainings: data.recentTrainings,
    });
    await saveOfflineCache(OFFLINE_CACHE_KEYS.recentMatches, data.recentMatches);
    await saveOfflineCache(OFFLINE_CACHE_KEYS.recentTrainings, data.recentTrainings);
    await saveOfflineCache(OFFLINE_CACHE_KEYS.news, data.news);
    sessionStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
  } catch {
    // offline — dane pozostają w IndexedDB
  }
}

export { clearAllPwaLocalData };
