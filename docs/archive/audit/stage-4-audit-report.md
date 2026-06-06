# Raport audytu — ETAP 4 (moduł meczów)

**Data:** 2026-05-31  
**Zakres:** mecze, kalendarz, kadra, formacja, wydarzenia, statystyki, MVP, raport PDF, tabela ligowa, RLS  
**Status po audycie:** poprawki wdrożone

---

## Podsumowanie

| Obszar | Ocena przed | Ocena po | Naprawione |
|--------|-------------|----------|------------|
| Poprawność statystyk | ⚠️ Średnie | ✅ Dobre | 3 |
| Wydarzenia meczowe | ⚠️ Średnie | ✅ Dobre | 4 |
| Tabela ligowa | ⚠️ Średnie | ✅ Dobre | 4 |
| Bezpieczeństwo danych | ⚠️ Średnie | ✅ Dobre | 6 |
| Polityki RLS | ✅ Dobre | ✅ Dobre | 2 (DB) |
| Wydajność bazy | ⚠️ Średnie | ✅ Dobre | 4 |
| TypeScript | ✅ Dobre | ✅ Dobre | 2 |
| Raport PDF / druk | ⚠️ Średnie | ✅ Dobre | 2 |
| Mobile / responsywność | ⚠️ Średnie | ✅ Dobre | 2 |

**Weryfikacja:** `npm run typecheck` — ✅ | `npm run build` — ✅  
**Migracja audytu:** `20260531183000_matches_audit_hardening.sql` (skrypt: `npm run db:migrate:matches-audit`)

---

## 1. Poprawność statystyk

### Znalezione problemy

| # | Problem | Severity |
|---|---------|----------|
| 1 | `getPlayerFormStats(undefined, teamId)` — jawne `undefined` omija domyślny `clubId` | Wysokie |
| 2 | Dodanie wydarzenia (gol/kartka) nie aktualizowało `match_player_stats` | Wysokie |
| 3 | `aggregatePlayerMatchStats()` w widoku pojedynczego meczu — zbędna agregacja | Niskie |

### Naprawione

- Zmieniono sygnaturę na `getPlayerFormStats(teamId?, clubId?)` i wywołanie `getPlayerFormStats(data.match.teamId)`.
- Po `addMatchEvent` synchronizacja statystyk per mecz (`incrementMatchPlayerStat`).
- Statystyki w `getMatchDetail` mapowane bezpośrednio z `match_player_stats`.

### Pozostaje (świadome)

| Problem | Rekomendacja |
|---------|--------------|
| Sezonowe `player_stats` nie są automatycznie przeliczane po każdym zdarzeniu | Przeliczenie batch / trigger w kolejnym etapie |
| Tabela ligowa ręczna nie synchronizuje się z wynikami meczów | Integracja DZPN/PZPN (ETAP przyszły) |

---

## 2. Wydarzenia meczowe

### Naprawione

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | Brak `verifyMatchInClub()` w `addMatchEvent` | Walidacja przed insertem |
| 2 | Brak walidacji minuty 0–130 po stronie aplikacji | Sprawdzenie w akcji (DB CHECK już istniał) |
| 3 | Brak triggera DB — zawodnik spoza drużyny meczu | `enforce_match_event_players_team` |
| 4 | Raport PDF nie pokazywał zawodnika powiązanego (asysta) | Uzupełniono `relatedPlayerName` w raporcie |

---

## 3. Tabela ligowa

### Naprawione

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | Edycja wpisu po `entryId` bez filtra `club_id` (IDOR) | `.eq("club_id", DEFAULT_CLUB_ID)` |
| 2 | Brak walidacji M = Z + R + P | Walidacja w `upsertLeagueTableEntry` + CHECK w DB |
| 3 | Sortowanie tylko po punktach | Sortowanie: punkty → bilans → bramki zdobyte |
| 4 | Formularz „Dodaj / zaktualizuj” zawsze INSERT | `upsert` na `(club_id, competition, season, team_name)` |

---

## 4. Bezpieczeństwo danych

### Naprawione

| # | Problem | Severity | Rozwiązanie |
|---|---------|----------|-------------|
| 1 | `addMatchEvent` / `saveLineupPosition` / `setMatchMvp` bez weryfikacji meczu | Wysokie | `verifyMatchInClub()` |
| 2 | `updateMatch` — brak walidacji `teamId` | Wysokie | `verifyTeamInClub()` |
| 3 | `updateMatch` — możliwy częściowy wynik (tylko home lub away) | Średnie | Wymóg obu wyników lub obu pustych |
| 4 | `league_table_entries` update bez `club_id` | Wysokie | Filtr tenant |
| 5 | `match_player_stats` — brak triggera drużyny | Wysokie | Trigger `enforce_match_squad_player_team` |
| 6 | `match_events` — brak triggera drużyny | Wysokie | Trigger `enforce_match_event_players_team` |

### Stan RBAC (bez zmian — poprawny)

| Uprawnienie | Role zapisu |
|-------------|-------------|
| `match:read` | owner, president, sports_director, coach, player, parent |
| `match:manage` / `match:squad` / `match:events` | owner, president, sports_director, coach |

---

## 5. Polityki RLS

### Stan po audycie

| Tabela | SELECT | INSERT/UPDATE/DELETE |
|--------|--------|----------------------|
| `matches` | `user_club_ids` + `actor_can_read_matches` | `actor_can_manage_matches` |
| `match_squad` | j.w. | j.w. |
| `match_lineup_positions` | j.w. | j.w. |
| `match_events` | j.w. | j.w. |
| `match_player_stats` | j.w. | j.w. |
| `match_mvp_history` | j.w. | j.w. |
| `league_table_entries` | j.w. | j.w. |

Dodatkowe triggery DB (migracja audytu):
- `match_events_enforce_players_team`
- `match_player_stats_enforce_player_team`
- `league_table_played_check`

---

## 6. Wydajność bazy danych

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | `getMatchDetail` — nieograniczone pobieranie `training_attendance` | `.limit(min(roster×5, 150))` |
| 2 | Brak indeksu pod wydarzenia meczu | `idx_match_events_club_match` |
| 3 | Brak indeksu pod sortowanie tabeli | `idx_league_table_points` |
| 4 | Brak indeksu pod ostatnią aktywność zawodnika | `idx_training_attendance_player_marked` |

Istniejące indeksy z ETAP 4 (`idx_matches_club_completed_date`, `idx_match_player_stats_club_player`) — bez zmian.

---

## 7. TypeScript

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | Nieużywany import `aggregatePlayerMatchStats` w `session.ts` | Usunięto |
| 2 | Błędna kolejność argumentów `getPlayerFormStats` | Poprawiono sygnaturę |

`npm run typecheck` — **0 błędów**.

---

## 8. Raport PDF / druk

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | Sidebar i header dashboardu widoczne przy druku | `print:hidden` na `<aside>` i wrapperze nagłówka |
| 2 | Brak padding reset na druku | `print:p-0` na `<main>` |

Mechanizm: przycisk „Drukuj / PDF” → `window.print()` → zapis do PDF w przeglądarce. Raport dostępny tylko dla meczów `completed`.

---

## 9. Mobile / responsywność

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | Formularz roli w kadrze — elementy nachodziły na wąskich ekranach | `flex-col` na mobile, `sm:flex-row` na szerszych |
| 2 | Kalendarz / tabele — już poprawne | `overflow-x-auto`, `min-w-*` (bez zmian) |

Widok tygodnia: jedna kolumna na telefonie (`md:grid-cols-7`).

---

## Pliki zmienione w audycie

```
supabase/migrations/20260531183000_matches_audit_hardening.sql
src/features/matches/actions.ts
src/lib/auth/session.ts
src/app/(dashboard)/layout.tsx
src/app/(dashboard)/matches/[id]/page.tsx
src/features/matches/components/match-detail-view.tsx
src/features/matches/components/match-report-view.tsx
scripts/setup-stage4.mjs
package.json
docs/audit/stage-4-audit-report.md
```

---

## Instrukcja wdrożenia migracji audytu

Jeśli ETAP 4 był już wcześniej zastosowany:

```bash
npm run db:migrate:matches-audit
```

Pełny setup ETAP 4 (pierwsze wdrożenie):

```bash
npm run setup:stage4
```

---

## Werdykt

**ETAP 4 — ZATWIERDZONY PO AUDYCIE**

Moduł meczowy spełnia wymagania funkcjonalne i bezpieczeństwa po wdrożeniu powyższych poprawek. Kolejne etapy (integracje zewnętrzne, auto-tabela) pozostają poza zakresem ETAP 4.
