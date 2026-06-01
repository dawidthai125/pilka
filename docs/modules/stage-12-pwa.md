# ETAP 12 — Progressive Web App (PWA)

Football Club OS jako instalowalna aplikacja mobilna (bez natywnego Android/iOS).

## Architektura

```
┌─────────────────────────────────────────────────────────┐
│  Next.js App Router (dashboard)                        │
│  ├── manifest.ts (FCOS, standalone, kolory klubu)      │
│  ├── Serwist SW (/sw.js)                               │
│  ├── Bottom nav + Mobile dashboard                     │
│  └── /settings (motyw, i18n, push prefs)               │
├─────────────────────────────────────────────────────────┤
│  Client: IndexedDB (sync queue + offline cache)        │
│  API: /api/pwa/offline-data, /sync, /push/*            │
├─────────────────────────────────────────────────────────┤
│  Supabase: push_subscriptions, notification_*          │
└─────────────────────────────────────────────────────────┘
```

## Service Worker

Plik: `src/sw.ts` → build → `public/sw.js` (Serwist)

- Precache assetów statycznych
- NetworkFirst dla stron i `/api/pwa/offline-data`
- CacheFirst dla obrazów
- Handlery **push** i **notificationclick**
- Komunikat `CLEAR_CACHES` przy wylogowaniu

Rejestracja: `src/components/pwa/pwa-provider.tsx`

## Powiadomienia

| Warstwa | Opis |
|---------|------|
| In-app | Istniejące `club_notifications` + filtry w centrum |
| Push | Web Push API + `push_subscriptions` |
| Kolejka | `notification_queue` (delivery pending/sent) |
| Preferencje | `notification_preferences` per event_type |

API:
- `POST /api/pwa/push/subscribe`
- `POST /api/pwa/push/unsubscribe`
- `POST /api/pwa/push/dispatch` — cron/worker (Bearer `PWA_CRON_SECRET`)

Server:
- `enqueueNotification()` — `src/lib/pwa/notification-queue.ts`
- `dispatchPendingPushNotifications()` — `src/lib/pwa/push-dispatch.ts`

Wymaga `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` na produkcji.

## Offline mode

Endpoint `GET /api/pwa/offline-data` zwraca:
- profil, klub, drużyny
- ostatnie mecze / treningi
- aktualności
- kolory PWA z `website_settings`

Dane kopiowane do IndexedDB przez `refreshOfflineCacheFromApi()`.

## Synchronizacja (sync queue)

IndexedDB store `syncQueue` — akcje offline:
- `training_availability`
- `notification_read`

Flush: `POST /api/pwa/sync` po odzyskaniu połączenia (`registerSyncOnReconnect`).

## Bezpieczeństwo

- Wylogowanie → `clearAllPwaLocalData()` + `CLEAR_CACHES` w SW
- API PWA wymaga sesji Supabase (`requireAccessContext`)
- Push subscriptions scoped per `user_id` + `club_id` (RLS)
- Brak cache wrażliwych danych finansowych w SW (tylko endpoint offline-data z auth)

## Wdrożenie

```bash
npm run setup:stage12
npm run build
```

Test Lighthouse PWA na `/dashboard` (Chrome DevTools → Lighthouse → Progressive Web App).

## Pliki kluczowe

| Plik | Rola |
|------|------|
| `src/app/manifest.ts` | Web App Manifest |
| `src/sw.ts` | Service Worker |
| `src/lib/pwa/offline-store.ts` | IndexedDB |
| `src/lib/pwa/sync-queue.ts` | Sync po online |
| `src/components/pwa/bottom-navigation.tsx` | Mobile nav |
| `supabase/migrations/20260610120000_stage12_pwa.sql` | DB |
