# ETAP 10 — Warstwa integracji rozgrywkowych

## Cel

Przygotowanie Football Club OS do podłączenia zewnętrznych systemów (PZPN, DZPN, Extranet, inne związki) **bez przebudowy** modułów meczowych, tabeli i strony publicznej. System działa w pełni **bez live API** — przez staging w bazie, import plików i ręczną synchronizację.

## Architektura

```
src/integrations/          — niezależne adaptery (pzpn, dzpn, extranet, manual, imports)
src/lib/integrations/      — silnik sync, parsery, jakość danych, mapowania, AI context
src/features/integrations/ — server actions + panel UI
src/app/(dashboard)/integrations/ — widoki administratora
supabase/migrations/       — tabele, RLS, seed
```

### Przepływ danych

1. **Źródło** — API (przygotowane), CSV, JSON, XML/RSS (enum), plik, ręczne wpisy.
2. **Staging** — tabele `external_*` przechowują dane zewnętrzne przed merge.
3. **Mapowanie** — `integration_club_mappings` (Piorun Wawrzeńczyce ↔ GLKS Mietków), `external_teams` (Seniorzy, Juniorzy, …).
4. **Synchronizacja** — `runIntegrationSync()` → `sync_jobs` + `sync_logs` (sukces / częściowy / błąd).
5. **Konflikty** — `sync_conflicts` — administrator wybiera `keep_local` / `keep_external`.
6. **Produkcja** — upsert do istniejących `league_table_entries` i `matches` (bez zmian schematu modułu meczowego).

### API zewnętrzne

| System | Publiczne API | Status w projekcie |
|--------|---------------|-------------------|
| PZPN | Brak dla klubów amatorskich (PDF, wewnętrzna szyna) | Adapter + env `PZPN_API_*` |
| DZPN | Brak standardowego publicznego API | Adapter + import CSV/JSON + staging |
| Extranet | Zależne od związku | Adapter push raportów + env `EXTRANET_API_*` |

## Panel `/integrations`

| Ścieżka | Opis |
|---------|------|
| `/integrations` | Przegląd, statystyki, ręczna sync |
| `/integrations/pzpn` | Konfiguracja PZPN |
| `/integrations/dzpn` | Konfiguracja DZPN |
| `/integrations/extranet` | Extranet |
| `/integrations/manual` | Ręczne wprowadzanie |
| `/integrations/imports` | Import CSV/JSON |
| `/integrations/mappings` | Mapowania klubu i drużyn |
| `/integrations/sync` | Historia i błędy |

## Uprawnienia

| Rola | Dostęp |
|------|--------|
| Właściciel | Pełny (`integration:manage`, `integration:sync`) |
| Prezes | Odczyt (`integration:read`) |
| Dyrektor sportowy | Zarządzanie i synchronizacja |
| Trener | Odczyt |
| Pozostali | Brak |

RLS: `actor_can_read_integrations`, `actor_can_manage_integrations`, `actor_can_sync_integrations`.

## AI

Kategoria raportów `integrations` w Club AI Assistant. Kontekst: ostatnie logi, importy, błędy, konflikty (`buildIntegrationsAiContext`).

## Wdrożenie bazy

```bash
npm run setup:stage10
```

Migracje:
- `20260604100000_integrations_module.sql`
- `20260604101000_seed_integrations.sql`

## Zgodność z Vercel

Server Components + Server Actions, brak długich workerów — synchronizacja synchroniczna w request (odpowiednie dla ręcznego triggera i importów plików).
