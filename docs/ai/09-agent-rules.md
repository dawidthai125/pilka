# 09 — Zasady pracy dla agentów AI

## Zanim napiszesz kod

1. Przeczytaj [`README.md`](./README.md) + [`project-handoff-current.md`](../architecture/project-handoff-current.md).
2. Sprawdź `git status` — dużo **niezacommitowanego** (LNP, regiowyniki, probes).
3. Ustal, czy zadanie dotyczy **public**, **dashboard**, czy **sync** — czytaj odpowiedni plik `docs/ai/0x-*.md`.

## Zasady produktowe (od właściciela projektu)

| Zasada | Znaczenie |
|--------|-----------|
| **Nie dodawaj funkcji** bez wyraźnej prośby | Naprawa / optymalizacja > feature creep |
| **Nie zmieniaj layoutu** bez zlecenia | Zwłaszcza public 3.0/4.0 i dashboard 15.10C |
| **Nie przebudowuj dashboardu** | Tylko bugfixy w uzgodnionym zakresie |
| **ETAP 15.11 zamrożony** | Brak nowych dużych modułów |
| **Commit / push / deploy** | **Tylko na prośbę** użytkownika |

## Platform Admin — importy client/server (P0, Sprint 20.1)

| Kontekst | Importuj z |
|----------|------------|
| `"use client"` — typy Health, stałe paginacji monitoring | `@/lib/platform/health-types` |
| `"use client"` — typy Registry, stałe paginacji | `@/lib/platform/club-operations-registry-types` |
| Server loaders / RSC | `@/lib/platform/health`, `club-operations-registry` |

Value import z `health.ts` w komponencie klienckim **psuje build Vercel** (`pg` → `net`/`tls`). Szczegóły: [`sprint-201a-deploy-recovery-rca.md`](../architecture/sprint-201a-deploy-recovery-rca.md).

## Zasody techniczne

| Temat | Reguła |
|-------|--------|
| Scope diff | Minimalny poprawny diff |
| Konwencje | Czytaj otaczający kod przed edycją |
| Service role | Tylko server / skrypty |
| Testy | `npm run typecheck` + `npm run build` przed „gotowe” |
| Migracje | Nowy plik SQL w `supabase/migrations/`, nie edycja starego |
| PowerShell | `node scripts/...` zamiast problematycznego `npm.ps1` |

## Mapowanie GLKS ↔ Piorun

- W **źródłach zewnętrznych** szukaj „Mietków” / „GLKS”.
- W **UI klubu** pokazuj „Piorun Wawrzeńczyce”.
- Nie hardcoduj nazw w komponentach — używaj danych z `clubs`, `league_teams`, CMS.

## mPZPN / token

- Token z F12 wygasa w sekundach — **nie** obiecuj auto-sync z API bez planu.
- Workflow: `discover-lnp-setup.mjs`, `IMPORT-MPZPN.cmd`, JSON import.
- Nie wklejaj tokenów w chat ani w commity.

## Wydajność public (znane P1)

- Nie dodawaj kolejnych RPC na homepage bez usunięcia starych.
- Plan: `get_public_home_bundle()` — jeden RPC.
- Middleware: public już **bez** `getUser()` (P0) — nie cofaj.

## Liga (znane po P0)

- Ingest meczów: **tylko GLKS** — nie przywracaj zapisu 200 meczów bez uzasadnienia.
- Batch upsert — nie wracaj do pętli SELECT+upsert per mecz.

## DO NOT REPEAT (skrót)

Pełna lista: `project-handoff-current.md` §9.

- Ponowny audyt „czy public ma getUser” — naprawione.
- Ponowna propozycja P0 middleware/ISR — wdrożone `aee9d4f`.
- Public Website 2.0/3.0/4.0 od zera.
- Dashboard redesign 15.10C.
- Layout PublicFacebookHome na `/`.

## Kiedy aktualizować dokumentację

Po sprincie zaktualizuj:

1. `docs/architecture/project-handoff-current.md`
2. Odpowiedni `docs/ai/*.md`
3. `docs/modules/stage-15b-live-sync.md` jeśli zmiana syncu

## Eskalacja — kiedy zapytać użytkownika

- Zmiana harmonogramu crona (3 dni vs codziennie)
- Commit niezacommitowanych plików (regiowyniki, vercel.json, LNP)
- Force push, migracje destrukcyjne na prod
- Nowy moduł biznesowy lub zmiana layoutu public

## Szybkie ścieżki debug

| Problem | Gdzie patrzeć |
|---------|----------------|
| 0 bramek na /druzyna | `get_public_players`, `league_player_registry.notes`, sync log |
| Stara tabela | `league_table_entries`, ostatni `league_sync_jobs` |
| Wolne `/` | `public-data.ts`, liczba RPC, ISR 300 |
| Cron fail | Vercel logs, `maxDuration`, `CRON_SECRET`, czas sync ~28s |
| 401 mPZPN | Brak/wygasły `LNP_ACCESS_TOKEN` — oczekiwane |

## Kontakt z repozytorium

| Potrzeba | Plik |
|----------|------|
| Wszystkie trasy | `03-routing-map.md` |
| Moduły panelu | `05-dashboard-modules.md` |
| Strona publiczna | `04-public-website.md` |
| Liga | `07-league-hub-sync.md` |
| DB / RPC | `06-database-and-api.md` |
