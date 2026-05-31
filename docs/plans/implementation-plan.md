# Plan realizacji — Football Club OS

## Faza 0 — Fundament ✅ (bieżący etap)

| # | Zadanie | Status |
|---|---------|--------|
| 0.1 | Next.js 15 + TypeScript strict + Tailwind + Shadcn | ✅ |
| 0.2 | Struktura katalogów Clean Architecture | ✅ |
| 0.3 | Integracja Supabase (client, server, admin, middleware) | ✅ |
| 0.4 | Infrastruktura Supabase Auth (callback, session refresh) | ✅ |
| 0.5 | Macierz RBAC w kodzie | ✅ |
| 0.6 | Migracja SQL foundation + dokumentacja schematu | ✅ |
| 0.7 | Konfiguracja env + Vercel | ✅ |
| 0.8 | Katalog dokumentacji | ✅ |

**Commit:** `feat: project foundation and architecture`

---

## Faza 1 — Inicjalizacja platformy

| # | Zadanie | Szacunek | Zależności |
|---|---------|----------|------------|
| 1.1 | Zastosowanie migracji foundation w Supabase | 1h | Dostęp CLI |
| 1.2 | Seed pierwszego klubu (Piorun Wawrzeńczyce) | 2h | 1.1 |
| 1.3 | Seed drużyny Seniorzy | 1h | 1.2 |
| 1.4 | UI logowania (email + magic link / hasło) | 4h | Auth config |
| 1.5 | Middleware ochrony tras dashboard | 2h | 1.4 |
| 1.6 | Wybór aktywnego klubu (multi-club context) | 3h | 1.5 |
| 1.7 | Layout panelu klubu (sidebar, nawigacja) | 4h | 1.5 |

**Commit:** `feat: platform initialization and auth`

**Kryteria akceptacji:**
- Użytkownik może się zalogować
- Po zalogowaniu widzi panel klubu Piorun Wawrzeńczyce
- RLS blokuje dane innych klubów

---

## Faza 2 — Zarządzanie członkostwem

| # | Zadanie | Szacunek |
|---|---------|----------|
| 2.1 | Lista członków klubu | 4h |
| 2.2 | Zaproszenia użytkowników (email) | 6h |
| 2.3 | Przypisywanie ról RBAC | 4h |
| 2.4 | Przypisywanie do drużyny | 3h |
| 2.5 | Zarządzanie statusem członkostwa | 2h |

**Commit:** `feat: membership management module`

---

## Faza 3 — Drużyny

| # | Zadanie | Szacunek |
|---|---------|----------|
| 3.1 | CRUD drużyn | 4h |
| 3.2 | Kategorie wiekowe (U-10, U-12, U-18, Seniorzy) | 2h |
| 3.3 | Sezonowość drużyn | 2h |
| 3.4 | Dashboard drużyny | 4h |

**Commit:** `feat: teams module`

---

## Faza 4 — Zawodnicy

| # | Zadanie | Szacunek |
|---|---------|----------|
| 4.1 | Schemat DB zawodników + RLS | 3h |
| 4.2 | Profile zawodników | 6h |
| 4.3 | Powiązanie rodzic ↔ zawodnik | 4h |
| 4.4 | Widok zawodnika (self-service) | 4h |

**Commit:** `feat: players module`

---

## Faza 5 — Treningi i obecności

| # | Zadanie | Szacunek |
|---|---------|----------|
| 5.1 | Schemat treningów | 2h |
| 5.2 | Harmonogram treningów | 6h |
| 5.3 | Lista obecności | 4h |
| 5.4 | Raporty obecności | 3h |

**Commit:** `feat: training module`

---

## Faza 6 — Mecze

| # | Zadanie | Szacunek |
|---|---------|----------|
| 6.1 | Schemat meczów | 2h |
| 6.2 | Terminarz | 6h |
| 6.3 | Składy meczowe | 4h |
| 6.4 | Wyniki i statystyki | 4h |

**Commit:** `feat: matches module`

---

## Faza 7 — Komunikacja i Storage

| # | Zadanie | Szacunek |
|---|---------|----------|
| 7.1 | Supabase Storage — konfiguracja bucketów | 2h |
| 7.2 | Ogłoszenia klubu | 4h |
| 7.3 | Powiadomienia (Realtime) | 6h |
| 7.4 | Dokumenty klubu | 4h |

**Commit:** `feat: communication and storage module`

---

## Faza 8 — Sponsorzy i finanse

| # | Zadanie | Szacunek |
|---|---------|----------|
| 8.1 | Moduł sponsorów | 6h |
| 8.2 | Panel sponsora (read-only) | 3h |
| 8.3 | Podstawowe finanse klubu | 8h |

**Commit:** `feat: sponsors and finance module`

---

## Faza 9 — AI Assistant

| # | Zadanie | Szacunek |
|---|---------|----------|
| 9.1 | Integracja OpenAI API | 3h |
| 9.2 | Asystent zarządu | 8h |
| 9.3 | Automatyzacje (np. generowanie ogłoszeń) | 6h |

**Commit:** `feat: ai assistant module`

---

## Faza 10 — SaaS Multi-Tenant

| # | Zadanie | Szacunek |
|---|---------|----------|
| 10.1 | Rejestracja nowych klubów | 8h |
| 10.2 | Panel platform_admin | 6h |
| 10.3 | Plany i limity | 8h |
| 10.4 | Custom domains per klub | 6h |

**Commit:** `feat: multi-tenant saas platform`

---

## Zasady realizacji

1. **Jeden moduł = jeden commit** (po akceptacji)
2. **Migracja SQL** przed każdą zmianą schematu
3. **Dokumentacja modułu** w `docs/modules/<module>/`
4. **Testy manualne** wg checklisty w każdej fazie
5. **Brak refaktoryzacji** poza scope bieżącego modułu

## Priorytet dla pierwszego klubu

Zgodnie z [`FIRST_CLUB.md`](../../FIRST_CLUB.md):

1. Faza 1 → logowanie + panel
2. Faza 2 → członkostwo i role
3. Faza 3 → drużyna Seniorzy
4. Kolejne drużyny (U-10, U-12, U-18) w Fazie 3

## Szacowany czas do MVP (pierwszy klub)

| Zakres | Czas |
|--------|------|
| Fazy 0–3 | ~3–4 tygodnie |
| Fazy 0–6 (pełny operacyjny klub) | ~8–10 tygodni |
| Pełny SaaS (Faza 10) | ~4–6 miesięcy |
