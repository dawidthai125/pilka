# Raport audytu — ETAP 11 (Akademia, rozwój, skauting)

**Data:** 2026-05-31  
**Zakres:** bezpieczeństwo danych zawodników, oceny, wykresy rozwoju, skauting, analiza przeciwników, RLS, wydajność, TypeScript, mobile, izolacja zawodnik/rodzic  
**Status po audycie:** poprawki wdrożone

---

## Podsumowanie

| Obszar | Ocena przed | Ocena po | Naprawione |
|--------|-------------|----------|------------|
| Bezpieczeństwo danych zawodników (RLS) | ⚠️ Średnie | ✅ Dobre | 4 |
| Izolacja zawodnik / rodzic | ⚠️ Średnie | ✅ Dobre | 5 |
| Poprawność ocen | ✅ Dobre | ✅ Dobre | 1 |
| Wykresy rozwoju | ⚠️ Średnie | ✅ Dobre | 2 |
| Skauting | ✅ Dobre | ✅ Dobre | 1 |
| Analiza przeciwników | ✅ Dobre | ✅ Dobre | 0 |
| Polityki RLS / GRANT | ⚠️ Średnie | ✅ Dobre | 3 |
| Wydajność zapytań | ⚠️ Średnie | ✅ Dobre | 2 |
| TypeScript | 🔴 Błąd build | ✅ Dobre | 1 |
| Mobile (panel akademii) | ✅ Dobre | ✅ Dobre | 1 |

**Weryfikacja:** `npm run typecheck` — ✅ | `npm run build` — ✅  
**Migracje audytu:** `20260605103000_academy_audit_fixes.sql`  
**Skrypt:** `npm run db:migrate:academy-audit-fixes` lub `npm run setup:stage11`

---

## 1. Bezpieczeństwo danych zawodników

### Znalezione problemy

1. **P0** — Rola `scout` była w `actor_can_read_academy` — skaut mógł odczytać profile rozwoju wszystkich zawodników klubu (sprzeczne ze specyfikacją: skaut = wyłącznie skauting).
2. **P1** — Polityka `academy_groups_select` dopuszczała `actor_can_read_scouting` — skaut widział grupy akademii poza modułem skautingu.
3. **P1** — `canReadAcademy()` w aplikacji zawierało rolę `scout` — niespójność z RLS i UI.
4. **P2** — Brak triggerów spójności `club_id` ↔ `player_id` na tabelach ocen, celów, testów, przejść, historii.

### Wdrożone poprawki

- Migracja `20260605103000_academy_audit_fixes.sql`:
  - `actor_can_read_academy` — usunięto `scout`.
  - `academy_groups_select` — tylko `actor_can_read_academy`.
  - Triggery `enforce_player_row_club_consistency` na 5 tabelach rozwojowych.
- `src/config/permissions.ts` — `canReadAcademy` bez roli `scout`.

---

## 2. Izolacja zawodnik / rodzic

### Znalezione problemy

1. **P1** — Zawodnik/rodzic miał dostęp do `/academy` i `/academy/groups` (statystyki klubu, grupy wiekowe).
2. **P1** — Sub-nawigacja pokazywała wszystkie zakładki (ranking, skauting, przeciwnicy) — redirect dopiero po wejściu.
3. **P1** — Zawodnik/rodzic nie widział pozycji „Akademia” w głównym menu (`/academy` brakowało w `PLAYER_ONLY_HREFS` / `PARENT_ONLY_HREFS`).
4. **P1** — Porównanie z drużyną na wykresie: zapytanie `player_development IN (team)` zwracało tylko własny wiersz (RLS) — fałszywa „średnia drużyny”.
5. **P0** — Kontrola na stronie profilu — `canAccessPlayerDevelopment` + `notFound()` (wdrożone w ETAP 11, potwierdzone w audycie).

### Wdrożone poprawki

- Redirect z `/academy` i `/academy/groups` → `/academy/development` gdy brak `canReadAcademy`.
- `getAcademyNavItems(roles)` — filtrowana sub-nawigacja (zawodnik/rodzic: tylko „Rozwój”; skaut: skauting + przeciwnicy).
- `dashboard-nav.tsx` — dodano `/academy` do list zawodnik/rodzic.
- Funkcja `team_development_average(club_id, team_id)` — agregat SECURITY DEFINER; dostęp dla staff lub zawodnika/rodzica z tej samej drużyny bez ujawniania pojedynczych profili.
- Strona `[playerId]` — RPC zamiast bezpośredniego SELECT wielu profili.

### Weryfikacja logiki dostępu

| Rola | Lista rozwoju | Profil obcego zawodnika | Ranking | Skauting |
|------|---------------|-------------------------|---------|----------|
| Zawodnik | tylko siebie | 404 | redirect | redirect |
| Rodzic | tylko dzieci | 404 | redirect | redirect |
| Trener | wszyscy | ✅ | ✅ | ✅ |
| Skaut | brak | 404 | redirect | ✅ |

---

## 3. Poprawność ocen trenerskich

### Stan

- Skala 1–10 walidowana w SQL (`CHECK`) i w server actions (`readInt`).
- Średnia liczona przez `computeAssessmentAverage()` (9 kategorii, zaokrąglenie do 2 miejsc).
- Historia zachowana — każdy INSERT tworzy nowy wiersz w `player_assessments`.

### Poprawka

- Trigger spójności `player_id` ↔ `club_id` przy INSERT/UPDATE.

---

## 4. Wykresy rozwoju

### Znalezione problemy

1. **P2** — Przy pustej historii wykres był pusty mimo istniejącego profilu `player_development`.
2. **P1** — Porównanie z drużyną — patrz sekcja 2 (naprawione przez RPC).

### Wdrożone poprawki

- Fallback: bieżący profil jako punkt wykresu gdy brak wpisów historycznych w wybranym zakresie.
- Zakresy: miesiąc (30 dni), pół roku (183), rok (365), cały okres — `filterByChartRange`.
- Porównanie drużynowe: stała linia średniej z `team_development_average`.

---

## 5. Skauting i analiza przeciwników

### Stan

- Tabele `scouting_players`, `scouting_reports`, `scouting_clubs`, `opponent_analysis` — RLS przez `actor_can_read/manage_scouting`.
- Prezes: odczyt; skaut/trener/dyrektor: zarządzanie.
- Formularze ukryte gdy `!canManageScouting`.
- Trigger spójności raport ↔ `scouting_player_id` ↔ `club_id` (wcześniejsza migracja audytu).

### Poprawka

- Indeks `idx_scouting_reports_player` dla list raportów per zawodnik.

---

## 6. Polityki RLS — macierz końcowa

| Tabela | SELECT | INSERT/UPDATE/DELETE |
|--------|--------|----------------------|
| `academy_groups` | `actor_can_read_academy` | `actor_can_manage_academy` |
| `player_development*` | `actor_can_read_development_row` | `actor_can_manage_academy` |
| `player_assessments`, `player_goals`, `fitness_tests`, `player_team_transitions` | j.w. | j.w. |
| `scouting_*`, `opponent_analysis` | `actor_can_read_scouting` | `actor_can_manage_scouting` |

Helper `actor_can_read_development_row` = staff akademii **LUB** własny zawodnik (`player_id_for_user`) **LUB** dziecko rodzica (`parent_player_ids`).

---

## 7. Wydajność zapytań

### Wdrożone

- `idx_player_development_club_player` — lookup profilu zawodnika.
- `idx_scouting_reports_player` — raporty skautingowe.
- Wcześniejsze indeksy: `player_assessments`, `fitness_tests`, `player_development_history`, `player_goals`, `player_team_transitions`.
- Loadery używają `cache()` i równoległych zapytań (`Promise.all`).

### Uwaga (poza zakresem audytu)

- Ranking talentów: frekwencja = placeholder 85% — wymaga integracji z modułem treningów w przyszłym etapie.

---

## 8. TypeScript

### Znaleziony problem

- **P0** — Błędne destrukturyzowanie `useActionState` w `academy-panels.tsx`.

### Poprawka

- `const [, goalAction, goalPending] = useActionState(...)`.

---

## 9. Mobile

### Stan

- Sub-nawigacja: `overflow-x-auto`, `min-h-[44px]`, `shrink-0`.
- Listy zawodników / ranking: widok kart na `< md`, tabela na desktop.
- Formularze: `min-h-[44px]` na inputach i przyciskach.

### Poprawka

- Filtrowana sub-nawigacja — mniej zakładek na telefonie dla zawodnika/rodzica/skauta.

---

## Pliki zmienione w audycie

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/20260605103000_academy_audit_fixes.sql` | RLS, RPC, triggery, indeksy |
| `src/config/permissions.ts` | `canReadAcademy` bez scout |
| `src/lib/academy/constants.ts` | `getAcademyNavItems` |
| `src/app/(dashboard)/academy/layout.tsx` | Filtrowana nawigacja |
| `src/app/(dashboard)/academy/page.tsx` | Redirect zawodnik/rodzic |
| `src/app/(dashboard)/academy/groups/page.tsx` | Redirect zawodnik/rodzic |
| `src/app/(dashboard)/academy/development/[playerId]/page.tsx` | RPC średniej drużyny |
| `src/features/academy/components/academy-panels.tsx` | TS fix, fallback wykresu |
| `src/features/academy/components/academy-sub-nav.tsx` | Prop `items` |
| `src/components/layout/dashboard-nav.tsx` | `/academy` dla zawodnik/rodzic |
| `src/types/database.ts` | Typ RPC `team_development_average` |
| `scripts/setup-stage11.mjs`, `package.json` | Nowa migracja |

---

## Wdrożenie poprawek audytu

```bash
npm run db:migrate:academy-audit-fixes
# lub pełny setup ETAP 11:
npm run setup:stage11
```

---

## Rekomendacje na przyszłość (poza ETAP 11)

1. Seed użytkownika testowego z rolą `scout` w `club_memberships`.
2. Integracja frekwencji treningów z rankingiem talentów.
3. Testy E2E RLS dla ról zawodnik/rodzic/skaut (Playwright + Supabase test users).
