# Raport audytu — Football Club OS

**Data:** 2026-05-31  
**Zakres:** ETAP 1 (fundament + auth + panel klubu)  
**Status po audycie:** poprawki wdrożone

---

## Podsumowanie

| Obszar | Ocena przed | Ocena po | Naprawione |
|--------|-------------|----------|------------|
| Bezpieczeństwo | ⚠️ Średnie | ✅ Dobre | 9 |
| RBAC / RLS | ⚠️ Średnie | ✅ Dobre | 4 |
| TypeScript | ✅ Dobre | ✅ Dobre | 5 |
| Wydajność | ⚠️ Średnie | ✅ Dobre | 3 |
| Responsywność / mobile | ❌ Słabe | ✅ Dobre | 4 |
| Vercel | ⚠️ Średnie | ✅ Dobre | 4 |

**Build:** `npm run build` — ✅ przechodzi (validate:env + typecheck + next build)

---

## 1. Bezpieczeństwo

### Naprawione

| # | Problem | Severity | Rozwiązanie |
|---|---------|----------|-------------|
| 1 | `GRANT ALL` dla roli `anon` | Krytyczne | Migracja `20260531140000_security_hardening.sql` — revoke anon, grant tylko `authenticated` |
| 2 | Eskalacja roli (prezes → owner) | Wysokie | Funkcje `actor_can_assign_role`, `actor_is_owner` + polityki INSERT/UPDATE/DELETE |
| 3 | Open redirect w `/auth/callback` | Wysokie | `safeRedirectPath()` — tylko ścieżki względne |
| 4 | Ujawnianie błędów Supabase Auth | Średnie | Generyczne komunikaty w server actions |
| 5 | Edycja chronionych kolumn `profiles` | Średnie | Trigger `protect_profile_columns` |
| 6 | Edycja chronionych kolumn `clubs` | Średnie | Trigger `protect_club_columns` |
| 7 | Brak security headers | Niskie | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` w `next.config.ts` |
| 8 | Usunięto `getSession()` | Niskie | Tylko `getUser()` (walidacja JWT po stronie serwera) |
| 9 | Usunięto martwy `middleware.ts` helper | Niskie | Plik `src/lib/supabase/middleware.ts` usunięty |

### Do ręcznej decyzji (bez zmian funkcjonalnych)

| Problem | Rekomendacja |
|---------|--------------|
| Otwarta rejestracja `/register` | Wyłączyć signup w Supabase Auth przed produkcją lub przejść na invite-only |
| Hasło bazy w `.env.local` | Nie commitować; rozważyć rotację po udostępnieniu w czacie |
| `SUPABASE_SERVICE_ROLE_KEY` | Tylko server-side — obecnie OK |

---

## 2. Role i uprawnienia (RBAC)

### Macierz ról (bez zmian funkcjonalnych)

| Rola | Zarządzanie klubem | Drużyny | Członkowie |
|------|:------------------:|:-------:|:----------:|
| owner | ✅ | ✅ | ✅ |
| president | ✅ | ✅ | ✅ |
| sports_director | ✅ | ✅ | ✅ |
| coach | ❌ | ✅ | odczyt |
| player / parent | ❌ | odczyt | odczyt |
| sponsor | ❌ | odczyt | ❌ |

### Naprawione

- Walidacja ról z bazy przez `parseClubRole()` (Zod) zamiast `as ClubRole`
- Strona `/members` — wymaga uprawnienia `member:read` (sponsor przekierowany na dashboard)
- Server actions — walidacja kategorii drużyny przez `parseTeamCategory()`
- `toggleTeamActive` — weryfikacja istnienia drużyny w klubie (`.select().maybeSingle()`)

### RLS (Supabase)

Polityki zaktualizowane w migracji security:
- INSERT/UPDATE członkostw — tylko dozwolone role wg hierarchii
- DELETE — owner lub leadership (bez usuwania owner przez non-owner)

---

## 3. TypeScript

| Naprawione | Plik |
|------------|------|
| `NEXT_PUBLIC_SITE_URL` w schemacie Zod | `src/config/env.ts` |
| Walidatory ról/kategorii | `src/lib/validators.ts` |
| Typ `ClubMemberRow` | `src/lib/auth/session.ts` |
| Wspólne `TEAM_CATEGORY_LABELS` | `src/config/constants.ts` |
| `CLUB_ROLES` — jedno źródło w `types/rbac.ts` | `src/config/permissions.ts` |

**Wynik:** `tsc --noEmit` — 0 błędów

---

## 4. Wydajność

| Naprawione | Opis |
|------------|------|
| `React.cache()` | `createClient`, `getUser`, `getDashboardContext`, zapytania sesji |
| Mniej round-tripów | Layout + strona współdzielą cache w ramach jednego requestu |
| Usunięto duplikat kodu middleware | Jeden plik `src/middleware.ts` |

---

## 5. Responsywność i mobile

| Naprawione | Opis |
|------------|------|
| Menu mobilne | `MobileDashboardNav` — Sheet + hamburger (`md:hidden`) |
| Padding mobile | `px-4 py-6` na mobile, `md:px-6 md:py-8` na desktop |
| Header | Przycisk menu + `truncate` długich nazw |
| Nawigacja | `DashboardNav` zamyka Sheet po kliknięciu linku |

**Auth / public:** layouty już responsywne (`max-w-md`, `px-6`)

---

## 6. Zgodność z Vercel

| Naprawione | Opis |
|------------|------|
| `npm run validate:env` przed buildem | Wymusza `NEXT_PUBLIC_SITE_URL` + klucze Supabase |
| `typecheck` w pipeline build | `package.json` → `"build": "validate:env && typecheck && next build"` |
| `NEXT_PUBLIC_SITE_URL` | Dodane do `.env.local` i schematu env |
| Security headers | `next.config.ts` — kompatybilne z Vercel |

### Wymagane zmienne na Vercel

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL          ← ustaw na URL produkcyjny (np. https://pilka.vercel.app)
SUPABASE_SERVICE_ROLE_KEY
```

---

## 7. Pliki zmienione

```
supabase/migrations/20260531140000_security_hardening.sql  [NOWY]
scripts/run-sql.mjs, scripts/validate-env.mjs              [NOWY]
src/lib/validators.ts, src/config/constants.ts             [NOWY]
src/components/layout/mobile-dashboard-nav.tsx             [NOWY]
src/lib/supabase/middleware.ts                             [USUNIĘTY]
src/middleware.ts, src/lib/supabase/server.ts
src/lib/auth/session.ts, src/config/env.ts
src/features/auth/actions.ts, src/features/club/actions.ts
src/app/auth/callback/route.ts
src/app/(dashboard)/*, src/components/layout/*
next.config.ts, package.json, .gitignore, .env.example
scripts/setup-stage1.mjs
```

---

## 8. Komendy weryfikacji

```bash
npm run typecheck
npm run lint
npm run build
npm run db:migrate:security   # już zastosowane
npm run dev
```

### Test manualny (mobile)

1. Otwórz DevTools → widok telefonu (375px)
2. Zaloguj się jako `wlasciciel@piorun.test`
3. Sprawdź hamburger menu → nawigacja po wszystkich sekcjach
4. Sprawdź `/members` jako `sponsor@piorun.test` → przekierowanie na dashboard

---

## 9. Pozostałe ryzyka (akceptowalne na ETAP 1)

- Hardcoded `DEFAULT_CLUB_ID` — OK dla jednego klubu testowego
- Brak CSP (Content-Security-Policy) — można dodać w ETAP 2
- Middleware odświeża sesję na wszystkich trasach — akceptowalne dla Supabase SSR

---

*Audyt i poprawki wykonane bez dodawania nowych funkcji biznesowych.*
