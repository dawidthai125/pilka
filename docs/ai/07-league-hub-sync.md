# 07 — League Hub i synchronizacja ligowa

## Po co to jest

Dopóki nie ma oficjalnego API PZPN/DZPN, FC OS **pobiera dane z mirrorów HTML** i zapisuje do Supabase. Panel `/league` pokazuje stan; strona publiczna czyta **już zsynchronizowane** dane.

## Mapowanie nazw (krytyczne)

| Kontekst | Nazwa |
|----------|--------|
| 90minut, Regiowyniki, protokoły | **GLKS Mietków** |
| Strona, panel Mecze, `/tabela` | **Piorun Wawrzeńczyce** |

Tabela `league_teams`:

- `league_name` = nazwa w źródle
- `display_name` = nazwa na stronie
- `is_own_club` = true dla GLKS/Piorun

## Źródła danych

| Źródło | URL / klucz | Co daje | Status |
|--------|-------------|---------|--------|
| **90minut** | `liga14526` | Tabela + wyniki kolejek | ✅ Primary tabela |
| **regionalnyfutbol** | B Klasa Wrocław VII 2025/26 | Terminarz + weryfikacja tabeli | ✅ |
| **regiowyniki** | `/kadra/` | Nazwiska kadry | ✅ |
| **regiowyniki** | protokoły `/mecz/{id}/` | Bramki per zawodnik | ⚠️ Kod **lokalny niezacommitowany** |
| **mPZPN API** | competition-api-pro | Pełne statystyki | ❌ Token ~2 s; ręczny import |
| **90minut strzelcy/bilans** | B Klasa | Per-player stats | ❌ 0 w HTML |

Konfiguracja: `scripts/lib/league-live-sources.mjs` → `LEAGUE_CONFIG`

## Pipeline sync (jeden przebieg)

```
npm run sync:league-live
  → scripts/sync-league-live.mjs
  → fetchAllLeagueSources()     # 90minut + RF HTML
  → fetchSquadAndStats()      # regiowyniki + opcjonalnie LNP
  → runLivePipeline()         # zapis DB
```

### Co zapisuje `runLivePipeline`

1. **`league_tables`** — snapshot 12 drużyn
2. **`league_matches`** — terminarz (po **P0: tylko mecze z GLKS**, ~33 nie 200)
3. **`league_table_entries`** — publiczna tabela
4. **`matches`** — mecze własnego klubu (pending → synced)
5. **`league_player_registry`** — kadra + `notes` JSON
6. **`players`** — tworzy/linkuje zawodników FC OS
7. **`player_stats`** — aktualizacja z registry
8. **`league_sync_jobs`** + **`league_sync_logs`**

### Scalanie

| Dane | Reguła |
|------|--------|
| Tabela | 90minut jeśli ≥10 drużyn, inaczej RF |
| Terminarz | RF + nadpisanie wyników z 90minut |
| Konflikty punktów | Log w metadata joba |

Funkcje: `mergeLeagueTables()`, `mergeFixtures()` w `league-live-sources.mjs`

## Wydajność sync (P0)

| Metryka | Przed P0 | Po P0 |
|---------|----------|-------|
| Czas pełny sync | ~79 s | ~28 s |
| Mecze w ingest | 200 | ~33 |
| DB ops na mecz | SELECT+upsert × 200 | 1 SELECT + batch upsert |

Plik: `scripts/lib/league-live-pipeline.mjs`

## Cron produkcyjny

| Element | Wartość |
|---------|---------|
| Endpoint | `/api/cron/league-sync` |
| `maxDuration` | **300** (wdrożone) |
| Auth | `Authorization: Bearer ${CRON_SECRET}` |
| Skrypt | `spawnSync` → `sync-league-live.mjs --json` |

**Harmonogram w git `main`:** `0 6 */3 * *` (co 3 dni 06:00 UTC)  
**Lokalnie (niezacommitowane):** `0 6 * * *` codziennie — sprawdź Vercel Dashboard.

Env na Vercel: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

## Dopasowanie zawodników (stan obecny)

`matchClubPlayer()` w pipeline:

- Exact: `normalize(lastName)` + `normalize(firstName)`
- Tylko jeden kandydat → auto `player_id`
- Brak UI confidence / ręcznego zatwierdzenia

**Następny sprint:** League Player Matching 16.1 — patrz handoff.

## mPZPN / ręczny import

| Narzędzie | Użycie |
|-----------|--------|
| `IMPORT-MPZPN.cmd` | Workflow Windows |
| `scripts/discover-lnp-setup.mjs` | Instrukcja tokenu z F12 |
| `scripts/lnp-import-players-json.mjs` | Import JSON z DevTools |
| `fixtures/league/live/lnp-players-snapshot.json` | Fallback offline |

Token **nie** nadaje się do crona (wygasa natychmiast).

## Ograniczenia (nie obiecuj więcej bez pracy)

1. Bramki: ~15–16 z protokołów vs ~24 w tabeli drużyny
2. Appearances/minuty w B Klasie często 0 w mirrorach
3. Konflikty tabeli 90minut vs RF dla niektórych drużyn
4. Pełna liga w `mergeFixtures` (200) — fetch nadal ciężki; ingest już filtrowany

## Pliki must-know

```
scripts/sync-league-live.mjs
scripts/lib/league-live-sources.mjs
scripts/lib/league-live-pipeline.mjs
scripts/lib/league-squad-sources.mjs
scripts/lib/regiowyniki-match-goals.mjs   # lokalnie, nie na main
src/app/api/cron/league-sync/route.ts
src/features/league/
docs/modules/stage-15b-live-sync.md
```

## Gdzie użytkownik widzi „ostatni sync”

**Panel:** `/league/sync` — `league_sync_jobs`, logi, status completed/failed.

**Public:** brak dedykowanej strony — dane po prostu są w `/tabela` i `/druzyna`.
