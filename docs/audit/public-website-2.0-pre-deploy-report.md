# PUBLIC WEBSITE 2.0 PRE-DEPLOY REPORT

**Projekt:** Football Club OS — Public Website 2.0  
**Data audytu:** 2026-06-02  
**Commit bazowy (HEAD):** `67a4383`  
**Zakres:** lokalne zmiany niecommitowane (11 plików)  
**Produkcja:** https://pilka-mu.vercel.app

---

## 1. Typecheck

| Test | Wynik | Czas |
|------|-------|------|
| `npm run typecheck` | ✅ **PASS** | ~6 s |

Brak błędów TypeScript.

---

## 2. Build

| Test | Wynik | Czas |
|------|-------|------|
| `npm run build` | ✅ **PASS** | ~60 s |
| Trasy | **149 / 149** | — |
| Route `/` | 846 B / 113 kB First Load JS | — |

**Warningi (nieblokujące):**
- Lokalne `ALLOW_PUBLIC_REGISTRATION is not false` (dev `.env.local`)
- Edge runtime na `/api/pwa/offline-data` (znany)

Brak błędów ESLint blokujących build.

---

## 3. Migracja `20260603103000_public_website_v2.sql`

### Zawartość

| RPC | Cel |
|-----|-----|
| `get_public_teams(p_club_slug)` | Drużyny + liczba zawodników + trener + opis akademii |
| `get_public_club_stats(p_club_slug)` | Zawodnicy, drużyny, mecze, lata działalności |

### Bezpieczeństwo

| Kryterium | Werdykt | Uwagi |
|-----------|---------|-------|
| Modyfikacja danych | ✅ Bezpieczna | Tylko `CREATE OR REPLACE FUNCTION` + `GRANT` — brak INSERT/UPDATE/DELETE |
| SECURITY DEFINER | ✅ Zgodne wzorcem | Ten sam model co `get_public_players`, `get_public_team_stats` |
| Bramka publiczności | ✅ | `website_is_public(v_club_id)` — brak danych gdy strona wyłączona |
| Ujawniane dane | ⚠️ Zamierzone | Liczba zawodników per drużyna, imię trenera — dane publiczne klubu sportowego |
| search_path | ✅ | `SET search_path = public` |

### Idempotentność

| Element | Werdykt |
|---------|---------|
| `CREATE OR REPLACE FUNCTION` | ✅ Ponowne uruchomienie nadpisuje definicję |
| `GRANT EXECUTE` | ✅ Idempotentne |
| Tabele / indeksy | ✅ Brak zmian DDL na tabelach |

### Wpływ na istniejące dane

✅ **Brak** — migracja nie dotyka wierszy w DB, tylko definicje funkcji.

### Uprawnienia RPC

```sql
GRANT EXECUTE ON FUNCTION public.get_public_teams(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_club_stats(TEXT) TO anon, authenticated;
```

✅ Spójne z istniejącymi RPC strony publicznej (`get_public_website_home`, `get_public_sponsors`, …).

### Ryzyko migracji (P3)

**Potencjalne duplikaty drużyn** w `get_public_teams` przy wielu `academy_groups` wskazujących na ten sam `team_id` (LEFT JOIN). W seedzie Pioruna relacja 1:1 — na prod **niskie ryzyko**. Do obserwacji po wdrożeniu.

---

## 4. Weryfikacja fallbacków (homepage `/`)

Analiza statyczna komponentów + loaderów (`club-home-sections.tsx`, `public-data.ts`, `match-display.ts`).

| Scenariusz | Zachowanie UI | `undefined` / `null` / `00:00` |
|------------|---------------|--------------------------------|
| **Brak sponsorów** | `PublicSponsorsSection` → `return null` (sekcja ukryta) | ✅ |
| **Brak galerii** | `PublicGallerySection` → `return null` | ✅ |
| **Brak drużyn** | `PublicTeamsSection` → `return null`; Hero bez chipów | ✅ |
| **Brak statystyk (RPC null, counts=0)** | `PublicClubStatsSection` → `return null` | ✅ |
| **Brak zdjęć hero/galerii/news** | Gradient / placeholder CSS / inicjały kategorii | ✅ |
| **Brak następnego meczu** | `MatchEmptyState` + tekst w Hero | ✅ |
| **Brak ostatniego wyniku** | `MatchEmptyState` | ✅ |
| **Brak tabeli** | `MatchEmptyState` „Brak danych tabeli” | ✅ |
| **Brak aktualności** | `PublicNewsSection` → `return null` | ✅ |
| **Mecz bez godziny** | `formatPublicMatchTime` → `null` → wyświetlane **„—”** | ✅ |
| **Mecz z `00:00`** | Filtrowane w `match-display.ts` | ✅ |

### Fallbacki w loaderach (bez migracji na prod)

| Loader | Gdy RPC niedostępne |
|--------|---------------------|
| `getPublicTeams` | Fallback: SELECT z `teams` (nazwy, bez trenera/kadry) |
| `getPublicClubStats` | Fallback: count `teams` + `matches` + `get_public_team_stats` |

✅ Strona **nie crashuje** przed migracją — pełne dane drużyn wymagają RPC.

### Sekcja Akademia przy 0 drużyn

⚠️ `PublicAcademySection` **nadal renderuje się** (pusty pasek grup + CTA kontakt). Nie pokazuje `null`/`undefined`, ale UX jest ubogi. **P3 — nie blokuje deployu homepage.**

### Pre-existing poza scope 2.0 (P2)

Strona `/mecze` nadal używa `m.matchTime.slice(0, 5)` — może wyświetlić **`00:00`**. Nie wprowadzone w Public Website 2.0; homepage naprawiony przez `match-display.ts`.

---

## 5. Ryzyka

| # | Severity | Ryzyko | Blokuje GO LIVE? |
|---|----------|--------|------------------|
| R1 | **Operacyjne** | Migracja `20260603103000` **nie jest na prod Supabase** — pełne karty drużyn (trener, kadra) wymagają RPC | ⚠️ Uruchomić migrację **przed lub razem z deployem** |
| R2 | Niskie | `/mecze` — możliwe `00:00` (pre-existing) | ❌ Nie (poza homepage) |
| R3 | Niskie | Duplikaty drużyn w RPC przy nietypowym `academy_groups` | ❌ Nie |
| R4 | Niskie | Akademia bez drużyn — pusta sekcja | ❌ Nie |
| R5 | Info | `yearsActive` fallback = `1` gdy RPC niedostępne | ❌ Nie |

---

## 6. Rekomendacja

### Warunki deployu

1. ✅ Commit zmian Public Website 2.0 (11 plików)
2. ✅ **Uruchomić migrację** na prod Supabase:
   `supabase/migrations/20260603103000_public_website_v2.sql`
3. ✅ Deploy Vercel (build PASS lokalnie)
4. ✅ Smoke test `/` — hero, centrum meczowe, drużyny, brak surowych `null` w HTML

### Opcjonalnie po deployu (nie blokuje)

- Naprawa `/mecze` — użycie `formatPublicMatchTime` (follow-up)
- `PublicAcademySection` — `return null` gdy `teams.length === 0`
- RPC `get_public_teams` — `DISTINCT ON (t.id)` przy duplikatach

---

## Pliki w scope (niecommitowane)

| Plik | Typ |
|------|-----|
| `src/app/(public)/page.tsx` | Modified |
| `src/features/website/components/club-home-sections.tsx` | Modified |
| `src/features/website/components/club-site-page.tsx` | Modified |
| `src/features/website/components/club-site-shell.tsx` | Modified |
| `src/lib/website/mappers.ts` | Modified |
| `src/lib/website/public-data.ts` | Modified |
| `src/lib/website/match-display.ts` | **New** |
| `src/types/database.ts` | Modified |
| `src/types/website.ts` | Modified |
| `supabase/migrations/20260603103000_public_website_v2.sql` | **New** |
| `docs/audit/public-website-2.0-report.md` | **New** |

---

## Końcowy werdykt

### ✅ **GO LIVE**

Public Website 2.0 przechodzi **typecheck** i **build**. Migracja jest **bezpieczna i idempotentna**. Fallbacki homepage **nie eksponują** `undefined`, `null` ani `00:00` w UI meczów.

**Warunek obowiązkowy:** zastosować migrację `20260603103000_public_website_v2.sql` na produkcyjnej bazie Supabase przed oczekiwaniem pełnych danych drużyn (trener, liczba zawodników).

---

*Nie wykonano commita, pusha ani deployu (zgodnie z instrukcją).*
