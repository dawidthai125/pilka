import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const DB_NAME = "fcos-pwa";
const DB_VERSION = 1;
const SCOPE_STORAGE_KEY = "fcos-pwa-scope";

export type SyncQueueActionType = "training_availability" | "notification_read";

export type SyncQueueItem = {
  id: string;
  type: SyncQueueActionType;
  payload: Record<string, unknown>;
  createdAt: string;
  retries: number;
};

export type OfflineCacheSnapshot = {
  key: string;
  data: unknown;
  updatedAt: string;
};

interface FcosPwaDb extends DBSchema {
  syncQueue: {
    key: string;
    value: SyncQueueItem;
  };
  offlineCache: {
    key: string;
    value: OfflineCacheSnapshot;
  };
}

let dbPromise: Promise<IDBPDatabase<FcosPwaDb>> | null = null;

function getDb() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }
  if (!dbPromise) {
    dbPromise = openDB<FcosPwaDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("syncQueue")) {
          db.createObjectStore("syncQueue", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("offlineCache")) {
          db.createObjectStore("offlineCache", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export function setOfflineScope(userId: string, clubId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SCOPE_STORAGE_KEY, `${userId}:${clubId}`);
}

function getOfflineScope(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SCOPE_STORAGE_KEY);
}

function scopedCacheKey(key: string): string {
  const scope = getOfflineScope();
  return scope ? `${scope}:${key}` : key;
}

export async function enqueueSyncItem(
  type: SyncQueueActionType,
  payload: Record<string, unknown>,
): Promise<void> {
  const db = await getDb();
  const item: SyncQueueItem = {
    id: crypto.randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  await db.put("syncQueue", item);
}

export async function listSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  return db.getAll("syncQueue");
}

export async function removeSyncItem(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("syncQueue", id);
}

export async function incrementSyncItemRetries(item: SyncQueueItem): Promise<void> {
  const db = await getDb();
  await db.put("syncQueue", { ...item, retries: item.retries + 1 });
}

export async function saveOfflineCache(key: string, data: unknown): Promise<void> {
  const db = await getDb();
  await db.put("offlineCache", {
    key: scopedCacheKey(key),
    data,
    updatedAt: new Date().toISOString(),
  });
}

export async function readOfflineCache<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const row = await db.get("offlineCache", scopedCacheKey(key));
  return row ? (row.data as T) : null;
}

async function clearServiceWorkerCaches(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHES" });
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: "CLEAR_CACHES" });
  } catch {
    // brak aktywnego SW
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

/** Usuwa wszystkie dane lokalne — wywoływane przy wylogowaniu / utracie sesji. */
export async function clearAllPwaLocalData(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const { unsubscribeFromPush } = await import("@/lib/pwa/push-client");
    await unsubscribeFromPush();
  } catch {
    // push niedostępny
  }

  sessionStorage.removeItem(SCOPE_STORAGE_KEY);

  const db = await getDb();
  await db.clear("syncQueue");
  await db.clear("offlineCache");

  await clearServiceWorkerCaches();
}

export const OFFLINE_CACHE_KEYS = {
  profile: "profile",
  schedule: "schedule",
  recentMatches: "recentMatches",
  recentTrainings: "recentTrainings",
  news: "news",
} as const;
