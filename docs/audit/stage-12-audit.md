# Audyt ETAP 12 — PWA (post-fix)

**Data:** 2026-06-01  
**Zakres:** instalacja PWA, Service Worker, offline, cache, push, bezpieczeństwo danych lokalnych, synchronizacja, Android/iPhone, Lighthouse  
**Status po audycie:** ✅ krytyczne i wysokie problemy naprawione

---

## Podsumowanie wykonawcze

| Obszar | Przed audytem | Po naprawie |
|--------|---------------|-------------|
| Cache SW (API/HTML/Supabase) | ❌ wyciek danych między użytkownikami | ✅ NetworkOnly dla wrażliwych tras |
| Wylogowanie / sesja | ⚠️ częściowe czyszczenie | ✅ push + IDB + cache + SIGNED_OUT |
| Sync queue offline | ❌ nigdy nie kolejkowano | ✅ obecność + powiadomienia |
| IndexedDB scope | ❌ globalne klucze | ✅ `userId:clubId` prefix |
| Manifest / ikony | ⚠️ SVG-only, brak `id` | ✅ PNG 192/512 + `id: "/"` |
| SW rejestracja | ⚠️ tylko po logowaniu | ✅ globalnie (`SwRegister`) |
| Push `href` | ⚠️ open redirect | ✅ walidacja same-origin path |
| Build | ✅ | ✅ `npm run typecheck` + `npm run build` |

---

## 1. Instalacja PWA

### Sprawdzone
- `manifest.webmanifest` — nazwa FCOS, `display: standalone`, `start_url: /dashboard`
- `beforeinstallprompt` — `InstallPrompt` z opcją ukrycia
- Ikony PNG (`/icons/icon-192`, `/icons/icon-512`) + SVG maskable
- `appleWebApp` w metadata root layout
- `SwRegister` w root layout — SW dostępny przed logowaniem

### Naprawione (P2)
| ID | Problem | Fix |
|----|---------|-----|
| L-01 | Brak `manifest.id` | Dodano `id: "/"` |
| L-02 | Tylko ikony SVG | Dodano route PNG 192/512 |
| L-03 | SW rejestrowany tylko w dashboard | `SwRegister` w `layout.tsx` |

### Android / iPhone (checklist manualny)
| Platforma | Oczekiwane zachowanie | Status |
|-----------|----------------------|--------|
| Android Chrome | Install prompt, standalone, bottom nav | ✅ gotowe do testu |
| iPhone Safari | Add to Home Screen, safe-area, brak beforeinstallprompt (normalne) | ✅ meta + apple-icon |
| Tablet | Bottom nav ukryty md+, sidebar | ✅ istniejące klasy |
| Desktop | Install w Chrome/Edge | ✅ manifest + SW |

---

## 2. Service Worker

### Znalezione problemy (P0/P1)

| ID | Sev | Problem | Plik |
|----|-----|---------|------|
| SW-01 | P0 | `defaultCache` cache'ował `GET /api/*` bez klucza użytkownika | `src/sw.ts` |
| SW-02 | P0 | HTML/RSC dashboard cache'owane 24h | `src/sw.ts` |
| SW-03 | P0 | Odpowiedzi Supabase (JWT) w cache cross-origin | `src/sw.ts` |
| SW-04 | P1 | Własne reguły SW nigdy nie wygrywały (kolejność) | `src/sw.ts` |
| SW-05 | P2 | Push `href` bez walidacji | `src/sw.ts` |

### Naprawa
Przed `...defaultCache` dodano reguły `NetworkOnly`:
- wszystkie `/api/*`
- `*.supabase.co`
- chronione ścieżki app (dashboard, mecze, treningi, …) dla navigate/RSC/`/_next/data`
- wszystkie żądania cross-origin

Push: `safePushHref()` — tylko ścieżki względne `/…`.

Precache statycznych assetów (`/_next/static`, fonty, obrazy publiczne) bez zmian.

---

## 3. Offline mode & cache

### Znalezione problemy

| ID | Sev | Problem | Fix |
|----|-----|---------|-----|
| OFF-01 | P1 | `readOfflineCache()` nigdy nie używany | `OfflineCachedSummary` na dashboardzie |
| OFF-02 | P1 | Klucze IDB bez scope użytkownika | `setOfflineScope(userId, clubId)` |
| OFF-03 | P2 | API offline-data `max-age=60` | `Cache-Control: private, no-store` |
| OFF-04 | P2 | Błędy refresh połykały catch | 401 → `clearAllPwaLocalData()` |

### Architektura po fix
- Dane offline: IndexedDB (scoped), **nie** SW cache API
- UI offline: banner + podsumowanie terminarza z cache
- Refresh: `refreshOfflineCacheFromApi()` przy mount i po sync

---

## 4. Push notifications

| ID | Sev | Problem | Fix |
|----|-----|---------|-----|
| PUSH-01 | P1 | Push subscription nie usuwana przy logout | `unsubscribeFromPush()` w `clearAllPwaLocalData()` |
| PUSH-02 | P2 | `href` w dispatch bez walidacji | sanitize w `push-dispatch.ts` + SW |

Pozostałe (OK): subscribe/unsubscribe z auth, RLS, dispatch z `PWA_CRON_SECRET` na prod.

---

## 5. Bezpieczeństwo danych lokalnych

| ID | Sev | Problem | Fix |
|----|-----|---------|-----|
| SEC-01 | P0 | SW cache wrażliwych API | NetworkOnly (patrz SW-01–03) |
| SEC-02 | P1 | Czyszczenie tylko z przycisku wyloguj | `onAuthStateChange(SIGNED_OUT)` |
| SEC-03 | P1 | Push zostawał po logout | unsubscribe + clear subscriptions |
| SEC-04 | P2 | SW clear tylko via controller | `registration.active.postMessage` + `caches.delete` |

Wylogowanie (`clearAllPwaLocalData`):
1. `unsubscribeFromPush()`
2. `sessionStorage` scope
3. IndexedDB clear
4. SW `CLEAR_CACHES` + Cache API

---

## 6. Synchronizacja offline

| ID | Sev | Problem | Fix |
|----|-----|---------|-----|
| SYNC-01 | P1 | `enqueueSyncItem` bez callerów | `offline-actions.ts` + UI |
| SYNC-02 | P2 | Brak retry limit | max 5 prób, potem drop |
| SYNC-03 | P2 | Nieużywane typy w union | usunięto `training_note`, `match_status` |

### Podłączone akcje
- `markNotificationReadOfflineAware` — centrum powiadomień
- `setTrainingAvailabilityOfflineAware` — formularz dostępności treningu
- Flush: `POST /api/pwa/sync` po `online`

---

## 7. Lighthouse

Automatyczny test CLI (`/login`) zwrócił **500** (serwer lokalny na :3000 — konflikt/stary build).  
**Rekomendacja manualna** po `npm run build && npm start`:

```bash
# Chrome DevTools → Lighthouse → Mode: Navigation
# URL: http://localhost:3000/dashboard (zalogowany)
# lub /login dla SEO/Performance
```

### Kryteria ETAP 12 (docelowe)
| Kategoria | Target | Uwagi |
|-----------|--------|-------|
| PWA | Installable | manifest + SW + PNG icons ✅ |
| Performance | > 90 | wymaga testu na prod build |
| Accessibility | > 90 | wymaga testu manualnego |
| Best Practices | > 90 | HTTPS na prod |
| SEO | > 90 | metadata obecne |

W Lighthouse 12+ kategoria „PWA” wchodzi w **Best Practices** (installable, manifest, SW).

---

## 8. Pliki zmienione w audycie

| Plik | Zmiana |
|------|--------|
| `src/sw.ts` | Security rules NetworkOnly, safePushHref |
| `src/lib/pwa/offline-store.ts` | scope, push unsubscribe, lepsze clear |
| `src/lib/pwa/sync-queue.ts` | retry, 401 handling |
| `src/lib/pwa/offline-actions.ts` | **nowy** — offline-aware actions |
| `src/components/pwa/pwa-provider.tsx` | auth listener, scope |
| `src/components/pwa/sw-register.tsx` | **nowy** — global SW |
| `src/app/layout.tsx` | SwRegister |
| `src/app/manifest.ts` | id + PNG icons |
| `src/app/icons/icon-192/route.tsx` | PNG 192 |
| `src/app/icons/icon-512/route.tsx` | PNG 512 |
| `src/features/pwa/components/offline-cached-summary.tsx` | odczyt IDB offline |
| `src/features/pwa/components/notifications-center-enhanced.tsx` | sync offline |
| `src/features/training/components/training-detail-view.tsx` | sync offline |
| `src/lib/pwa/push-dispatch.ts` | href sanitize |
| `src/app/api/pwa/offline-data/route.ts` | no-store |

---

## 9. Weryfikacja

```bash
npm run typecheck   # ✅
npm run build       # ✅
```

---

## 10. Pozostałe ryzyka (akceptowalne)

1. **iOS push** — Web Push na iOS wymaga iOS 16.4+ i Add to Home Screen; brak `beforeinstallprompt` to ograniczenie platformy.
2. **Lighthouse scores** — wymagają testu na HTTPS produkcji; lokalnie auth redirect może wpływać na wynik.
3. **`markAllNotificationsRead` offline** — nadal wymaga sieci (batch); pojedyncze read są kolejkowane.
4. **Cron push dispatch** — wymaga `PWA_CRON_SECRET` + VAPID na produkcji (konfiguracja ops).

---

*Audyt ETAP 12 zakończony. Bez przejścia do kolejnych etapów.*
