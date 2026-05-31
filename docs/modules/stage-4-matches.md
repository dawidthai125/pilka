# ETAP 4 — Moduł meczów

Dokumentacja techniczna modułu zarządzania meczami klubu piłkarskiego.

## Zakres

| # | Funkcja | Status |
|---|---------|--------|
| 1 | CRUD meczów (drużyna, rozgrywki, sezon, kolejka, data, godzina, gospodarz, gość, stadion, status) | ✅ |
| 2 | Kalendarz: miesiąc / tydzień / lista + filtry drużyna/sezon/rozgrywki | ✅ |
| 3 | Kadra meczowa (skład, podstawowi, rezerwowi) z frekwencją, kontuzjami, zawieszeniami | ✅ |
| 4 | Ustawienie taktyczne (formacje 4-4-2, 4-3-3, 3-5-2, 4-2-3-1) + drag&drop na boisku | ✅ |
| 5 | Wydarzenia meczowe (gol, asysta, kartki, zmiana, kontuzja) | ✅ |
| 6 | Statystyki zawodników i drużyny | ✅ |
| 7 | MVP meczu + historia | ✅ |
| 8 | Raport meczowy (wynik, skład, wydarzenia, MVP, notatki) — druk/PDF | ✅ |
| 9 | Analiza formy (30 dni zawodnik, 5/10 meczów drużyna) | ✅ |
| 10 | Tabela ligowa ręczna | ✅ |
| 11 | Warstwa integracji PZPN/DZPN/Extranet (stub) | ✅ |
| 12 | RLS + RBAC + seed B Klasa | ✅ |

## Architektura

```
src/features/matches/
├── actions.ts
└── components/
    ├── match-calendar.tsx
    ├── match-form.tsx
    ├── match-detail-view.tsx
    ├── match-status-badge.tsx
    ├── match-report-view.tsx
    ├── league-table-view.tsx
    ├── team-form-stats-panel.tsx
    └── integrations-panel.tsx

src/lib/matches/
├── constants.ts
├── calendar.ts
└── mappers.ts

src/integrations/
├── index.ts
├── pzpn/
├── dzpn/
└── extranet/

src/app/(dashboard)/
├── matches/
│   ├── page.tsx
│   ├── new/page.tsx
│   ├── [id]/page.tsx
│   ├── [id]/report/page.tsx
│   └── league-table/page.tsx
└── integrations/page.tsx
```

## Tabele bazy danych

### `matches`

Główna encja meczu.

| Kolumna | Typ | Opis |
|---------|-----|------|
| `club_id`, `team_id` | UUID FK | Tenant i drużyna klubu |
| `competition`, `season` | TEXT | Rozgrywki i sezon |
| `round_number` | INTEGER | Kolejka |
| `match_date`, `match_time` | DATE, TIME | Termin |
| `home_team_name`, `away_team_name` | TEXT | Gospodarz i gość |
| `stadium`, `stadium_address` | TEXT | Obiekt |
| `status` | ENUM | planned / in_progress / completed / cancelled / postponed |
| `home_score`, `away_score` | INTEGER | Wynik (oba NULL lub oba ustawione) |
| `formation` | TEXT | Formacja taktyczna |
| `mvp_player_id` | UUID FK | MVP meczu |
| `coach_notes` | TEXT | Notatki trenera |

### `match_squad`

Kadra meczowa z rolą: `squad`, `starter`, `substitute`.

Unikalność: `(match_id, player_id)`.

### `match_lineup_positions`

Pozycje zawodników na boisku (drag&drop): `slot_code`, `pos_x`, `pos_y` (0–100%).

### `match_events`

Wydarzenia: gol, asysta, żółta/czerwona kartka, zmiana, kontuzja — z minutą, zawodnikiem i notatkami.

### `match_player_stats`

Statystyki per mecz: minuty, gole, asysty, kartki, `is_starter`.

### `match_mvp_history`

Historia wyborów MVP — jeden wpis na mecz.

### `league_table_entries`

Tabela ligowa ręczna: drużyna, mecze, W/R/P, bramki, punkty, `is_own_club`.

Unikalność: `(club_id, competition, season, team_name)`.

## Relacje

```
clubs ──< matches >── teams
matches ──< match_squad >── players
matches ──< match_lineup_positions >── players
matches ──< match_events >── players (player_id, related_player_id)
matches ──< match_player_stats >── players
matches ──< match_mvp_history >── players
matches ── mvp_player_id ──> players
clubs ──< league_table_entries
```

Triggery spójności:

- `team_id` musi należeć do `club_id` meczu
- `player_id` w kadrze/lineup musi należeć do drużyny meczu
- dzieci (`match_squad`, `match_events`, …) muszą mieć ten sam `club_id` co mecz

## Uprawnienia RBAC

| Uprawnienie | Role |
|-------------|------|
| `match:read` | owner, president, sports_director, coach, player, parent |
| `match:manage` | owner, president, sports_director, coach |
| `match:squad` | owner, president, sports_director, coach |
| `match:events` | owner, president, sports_director, coach |

Helpery: `canReadMatches`, `canManageMatches`, `canManageMatchSquad`, `canManageMatchEvents`.

## Polityki RLS

Wszystkie tabele meczowe mają włączone RLS.

| Polityka | Operacja | Warunek |
|----------|----------|---------|
| `*_select` | SELECT | `club_id IN user_club_ids()` AND `actor_can_read_matches(club_id)` |
| `*_manage` | ALL | `actor_can_manage_matches(club_id)` |

Funkcje pomocnicze: `actor_can_read_matches`, `actor_can_manage_matches` (staff trenerski).

## Integracje (stub)

```
src/integrations/
├── index.ts          — rejestr providerów, syncIntegration()
├── pzpn/index.ts     — fetchLeagueTable (stub)
├── dzpn/index.ts     — fetchCompetitionFixtures (stub)
└── extranet/index.ts — submitMatchReport (stub)
```

Strona `/integrations` pokazuje status bez pobierania danych zewnętrznych.

## Dane testowe

Migracja `20260531181000_seed_matches.sql`:

- Klub: **Piorun Wawrzeńczyce**
- Liga: **B Klasa**, sezon **2025/2026**
- 12 drużyn w tabeli ligowej
- 20 zakończonych meczów + 1 zaplanowany
- Kadry, wydarzenia, statystyki zawodników, MVP

Setup: `npm run setup:stage4` (wymaga `SUPABASE_DB_PASSWORD` w `.env.local`).

## Trasy UI

| Trasa | Opis |
|-------|------|
| `/matches` | Kalendarz meczów |
| `/matches/new` | Nowy mecz |
| `/matches/[id]` | Szczegóły, kadra, formacja, wydarzenia |
| `/matches/[id]/report` | Raport do druku/PDF |
| `/matches/league-table` | Tabela ligowa |
| `/integrations` | Panel integracji |

## Testowanie

1. Zaloguj się jako `trener@piorun.test` / `Piorun2026!`
2. Uruchom migracje: `npm run setup:stage4`
3. Otwórz `/matches` — widoki miesiąc/tydzień/lista, filtry
4. Wejdź w zakończony mecz — kadra, formacja, statystyki, MVP
5. `/matches/[id]/report` — Drukuj / PDF
6. `/matches/league-table` — tabela B Klasy
7. `/integrations` — stub PZPN/DZPN/Extranet
