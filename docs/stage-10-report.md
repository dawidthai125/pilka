# Raport wykonanych prac — ETAP 10

**Data:** 2026-05-31  
**Klub testowy:** Piorun Wawrzeńczyce / GLKS Mietków  
**Status:** zaimplementowano

---

## 1. Podsumowanie

Zbudowano moduł integracji rozgrywkowych: niezależne adaptery, staging w bazie, synchronizacja ręczna/automatyczna (flaga), import CSV/JSON, mapowania nazw, logi, konflikty, panel administratora i integracja z AI. Istniejące moduły meczów i tabeli **nie zostały przebudowane**.

**Weryfikacja:** `npm run typecheck` ✅ | `npm run build` ✅ (79 tras)

---

## 2. Nowe tabele

| Tabela | Opis |
|--------|------|
| `integrations` | Konfiguracja providera × klub |
| `integration_sources` | Wieloźródłowość (API, CSV, JSON, …) |
| `integration_club_mappings` | Nazwa publiczna ↔ ligowa |
| `external_leagues` | Zewnętrzne rozgrywki |
| `external_teams` | Mapowanie drużyn wiekowych |
| `external_matches` | Staging meczów |
| `sync_jobs` | Zadania synchronizacji |
| `sync_logs` | Historia (źródło, użytkownik, rezultat) |
| `sync_conflicts` | Rozstrzyganie konfliktów |
| `integration_imports` | Historia importów plików |

---

## 3. Relacje

- Wszystkie tabele → `clubs.id` (CASCADE)
- `integration_sources` → `integrations.id`
- `external_matches` → `external_leagues.id`, opcjonalnie `matches.id`
- `external_teams` → opcjonalnie `teams.id`
- `sync_logs` → `sync_jobs`, `integrations`, `integration_sources`
- `sync_conflicts` → `sync_logs`

---

## 4. Polityki bezpieczeństwa (RLS)

- **Odczyt:** owner, president, sports_director, coach
- **Zarządzanie / sync / import:** owner, sports_director
- **Prezes:** tylko odczyt (brak `integration:manage` w app permissions)
- Logi: insert przez uprawnionych sync; brak anon access

---

## 5. Dane testowe (seed)

- Integracje: PZPN (not_configured), DZPN (ready), Extranet (disabled), manual (ready)
- Mapowanie: **Piorun Wawrzeńczyce** ↔ **GLKS Mietków**
- Drużyny zewn.: Seniorzy, Juniorzy, Trampkarze, Młodziki
- Liga B Klasa 2025/2026, 3 mecze staging
- 3 logi sync (success, partial, error) + 1 konflikt pending
- 2 rekordy importów

---

## 6. Pliki kluczowe

| Obszar | Ścieżki |
|--------|---------|
| SQL | `supabase/migrations/20260604100000_integrations_module.sql`, `20260604101000_seed_integrations.sql` |
| Adaptery | `src/integrations/{pzpn,dzpn,extranet,manual,imports}/` |
| Silnik | `src/lib/integrations/sync-engine.ts`, `import-parsers.ts`, `quality.ts` |
| UI | `src/features/integrations/`, `src/app/(dashboard)/integrations/` |
| Setup | `npm run setup:stage10` |

---

## 7. Uwagi API

PZPN nie udostępnia publicznego API terminarzy dla klubów amatorskich — adapter oczekuje opcjonalnych zmiennych `PZPN_API_URL` / `PZPN_API_KEY`. Do czasu ich skonfigurowania zalecany import CSV/JSON lub synchronizacja ze stagingu (`external_matches`).

---

## 8. Następne kroki (poza ETAP 10)

- Podłączenie live API gdy dostępne (env + implementacja w adapterach)
- Cron Vercel dla `auto_sync_enabled`
- Parser XML/RSS (enum i architektura gotowe)
