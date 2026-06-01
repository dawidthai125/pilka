/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/matches",
  "/training",
  "/players",
  "/sponsors",
  "/finance",
  "/inventory",
  "/ai",
  "/settings",
  "/notifications",
  "/club",
  "/profile",
  "/members",
  "/teams",
  "/integrations",
  "/website",
  "/academy",
  "/video",
  "/content",
  "/league",
  "/communication",
  "/attendance",
  "/crm",
  "/equipment",
  "/injuries",
];

function isProtectedAppPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function safePushHref(href: unknown): string {
  if (typeof href !== "string") return "/notifications";
  if (!href.startsWith("/") || href.startsWith("//")) return "/notifications";
  return href;
}

/** Never cache authenticated API, Supabase, or protected app documents. */
const securityCacheRules = [
  {
    matcher: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
      sameOrigin && url.pathname.startsWith("/api/"),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url }: { url: URL }) => url.origin.includes("supabase.co"),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({
      url,
      request,
      sameOrigin,
    }: {
      url: URL;
      request: Request;
      sameOrigin: boolean;
    }) => {
      if (!sameOrigin || !isProtectedAppPath(url.pathname)) return false;
      return (
        request.mode === "navigate" ||
        request.headers.get("RSC") === "1" ||
        url.pathname.startsWith("/_next/data")
      );
    },
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ sameOrigin }: { sameOrigin: boolean }) => !sameOrigin,
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...securityCacheRules, ...defaultCache],
});

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; href?: string } = {};
  try {
    payload = event.data.json() as typeof payload;
  } catch {
    payload = { title: "Football Club OS", body: event.data.text() };
  }

  const title = payload.title ?? "Football Club OS";
  const href = safePushHref(payload.href);
  const options: NotificationOptions = {
    body: payload.body ?? "",
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    data: { href },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const href = safePushHref(
    (event.notification.data as { href?: string } | undefined)?.href,
  );

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients: readonly Client[]) => {
        for (const client of clients) {
          if ("focus" in client && client.url.includes(self.location.origin)) {
            void (client as WindowClient).navigate(href);
            return (client as WindowClient).focus();
          }
        }
        return self.clients.openWindow(href);
      }),
  );
});

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
  if (event.data?.type === "CLEAR_CACHES") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
    );
  }
});

serwist.addEventListeners();
