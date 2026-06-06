# Raport — ETAP 12 (PWA)

**Data:** 2026-06-10  
**Zakres:** Progressive Web App — instalacja, offline, push, mobile UX  
**Bez aplikacji natywnej Android/iOS**

---

## Podsumowanie

| Obszar | Status |
|--------|--------|
| PWA Foundation (manifest, SW, icons) | ✅ |
| Mobile UX (bottom nav, quick actions, role dashboards) | ✅ |
| Offline + sync queue | ✅ |
| Push architecture (Web Push + DB) | ✅ |
| Centrum powiadomień (filtry) | ✅ |
| Ustawienia app (motyw, język, push prefs) | ✅ |
| Install prompt | ✅ |
| AI mobile (quick prompts, full width) | ✅ |
| Bezpieczeństwo (logout clears local data) | ✅ |
| Migracja DB + RLS | ✅ |
| Dokumentacja | ✅ |

**Weryfikacja:** `npm run typecheck` · `npm run build`

---

## 1. PWA Foundation

- **Serwist** (`@serwist/next`) — `src/sw.ts`, precache + runtime caching
- **Manifest** — `src/app/manifest.ts` (Football Club OS / FCOS, standalone)
- **Ikony** — SVG 192/512 + maskable, `icon.tsx`, `apple-icon.tsx`
- **Kolory** — domyślnie z brandingu klubu (`website_settings`), meta `theme-color` dynamicznie
- **Viewport** — `viewportFit: cover`, safe-area

---

## 2. Mobile UX

- **Bottom navigation** — Start, Mecze, Treningi, Drużyna, Więcej (sheet)
- **Quick actions** — role-based na dashboardzie (mobile)
- **Mobile role header** — trener / zawodnik / rodzic / prezes / sponsor
- **Padding** — `pb-24` pod bottom nav, touch targets 44px
- **CSS** — utilities w `globals.css`

---

## 3. Offline & Sync

- `GET /api/pwa/offline-data` — profil, terminarz, mecze, treningi, news
- IndexedDB — `syncQueue`, `offlineCache`
- `POST /api/pwa/sync` — availability, notification read
- Banner offline + auto-sync po `online`

---

## 4. Push & powiadomienia

**Tabele:** `push_subscriptions`, `notification_preferences`, `notification_queue`

**Event types:** training_tomorrow, match_tomorrow, schedule_change, document_expiring, fee_overdue, ai_report_new, general

**UI:** filtry w centrum powiadomień, ustawienia push/in-app per typ

**Dispatch (server):**
- `enqueueNotification()` — kolejkowanie zdarzeń
- `POST /api/pwa/push/dispatch` — worker/cron (Bearer `PWA_CRON_SECRET`)
- `web-push` + VAPID keys

---

## 5. Ustawienia aplikacji (`/settings`)

- Motyw jasny / ciemny / systemowy
- Język PL/EN (architektura i18n w `src/lib/pwa/i18n.ts`)
- Preferencje powiadomień
- Włącz/wyłącz Web Push

---

## 6. Bezpieczeństwo

- `SignOutButton` → `clearAllPwaLocalData()` przed `signOut()`
- SW `CLEAR_CACHES` message
- RLS na wszystkich nowych tabelach
- API PWA chronione sesją

---

## 7. Testy (manualne)

| Platforma | Checklist |
|-----------|-----------|
| Android Chrome | Install prompt, offline banner, bottom nav |
| iPhone Safari | Add to Home Screen, standalone, safe-area |
| Tablet | Bottom nav hidden (md+), sidebar |
| Desktop | PWA install (Chrome/Edge), sidebar nav |

**Lighthouse:** uruchom na `/dashboard` po `npm run build && npm start` — target PWA + scores > 90.

---

## Wdrożenie

```bash
npm run setup:stage12   # ✅ wykonane lokalnie
# Vercel env:
# NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PWA_CRON_SECRET
npm run build           # ✅ typecheck + build OK
```

Szczegóły: [`docs/modules/stage-12-pwa.md`](./modules/stage-12-pwa.md)  
Audyt: [`docs/archive/audit/stage-12-audit.md`](./archive/audit/stage-12-audit.md)

---

## Audyt (2026-06-01)

Naprawiono m.in.:
- P0: cache SW wrażliwych API/HTML/Supabase
- P1: push unsubscribe, sync queue, scope IDB, auth SIGNED_OUT
- P2: manifest PNG, push href validation, SW global register

Pełna lista: [`docs/archive/audit/stage-12-audit.md`](./archive/audit/stage-12-audit.md)

---

*ETAP 12 zakończony — bez przejścia do ETAP 13+.*
