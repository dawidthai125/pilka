# Raport audytu — ETAP 10 (Integracje)

**Data:** 2026-05-31  
**Zakres:** bezpieczeństwo integracji, mapowanie klubów/drużyn, logi synchronizacji, obsługa błędów, wydajność importów, TypeScript, mobile  
**Status po audycie:** poprawki wdrożone

---

## Podsumowanie

| Obszar | Ocena przed | Ocena po | Naprawione |
|--------|-------------|----------|------------|
| Bezpieczeństwo integracji (RLS/GRANT) | 🔴 Krytyczne | ✅ Dobre | 5 |
| Mapowanie klubów | ⚠️ Średnie | ✅ Dobre | 4 |
| Mapowanie drużyn | ⚠️ Średnie | ✅ Dobre | 3 |
| Logi synchronizacji | ⚠️ Średnie | ✅ Dobre | 3 |
| Obsługa błędów | ⚠️ Średnie | ✅ Dobre | 6 |
| Wydajność importów | ⚠️ Średnie | ✅ Dobre | 4 |
| TypeScript | ✅ Dobre | ✅ Dobre | 1 |
| Mobile (panel integracji) | ⚠️ Średnie | ✅ Dobre | 4 |

**Weryfikacja:** `npm run typecheck` — ✅ | `npm run build` — ✅ (79 tras)  
**Migracje:** `20260604100000_integrations_module.sql`, `20260604101000_seed_integrations.sql`, `20260604102000_integrations_audit_hardening.sql`  
**Skrypty:** `npm run setup:stage10` | `npm run db:migrate:integrations-audit`

---

## 1. Bezpieczeństwo integracji

### Znalezione problemy

1. **P0** — Brak `GRANT` na tabele i funkcje RLS (`actor_can_*_integrations`) — moduł mógł nie działać dla roli `authenticated`.
2. **P1** — Brak triggerów spójności `club_id` między powiązanymi tabelami (cross-table FK defense-in-depth).
3. **P1** — Brak walidacji `integrationId` vs `provider`/`club_id` w akcjach synchronizacji.
4. **P1** — Brak walidacji `teamId` ∈ klub przy mapowaniu drużyn.
5. **P2** — `base_url` bez walidacji protokołu.

### Wdrożone poprawki

- Migracja `20260604102000_integrations_audit_hardening.sql`:
  - `GRANT SELECT/INSERT/UPDATE/DELETE` na 10 tabel integracji dla `authenticated`.
  - `GRANT EXECUTE` na funkcje `actor_can_read/manage/sync_integrations`.
  - Triggery spójności: `integration_sources`, `external_teams`, `external_matches`, `sync_logs`.
  - Indeksy: `idx_sync_logs_club_status`, `idx_external_matches_unsynced`.
- `runIntegrationSync` — weryfikacja `integrationId` przed startem zadania.
- `upsertExternalTeamMappingAction` — `assertTeamBelongsToClub`.
- `updateIntegrationConfigAction` — `isValidIntegrationBaseUrl`.
- Walidacja enumów w akcjach: `isIntegrationProvider`, `isSyncJobType`, `isIntegrationImportType`, `isSyncConflictStatus`.

---

## 2. Mapowanie klubów

### Znalezione problemy

1. **P0** — Import tabeli ligowej używał hardcoded `"mietków"/"piorun"` zamiast mapowań z bazy.
2. **P1** — Sync używał `mappings[0]` zamiast mapowania z `isPrimary`.
3. **P2** — `isOwnClubTeamName` używało `includes()` — fałszywe dopasowania substringów.

### Wdrożone poprawki

- Import tabeli: `is_own_club` z `integration_club_mappings` przez `isOwnClubTeamName`.
- Sync meczów: `getPrimaryClubMapping`, `resolvePublicTeamName` dla nazw publicznych.
- `isOwnClubTeamName` — tylko dopasowanie dokładne (`leagueName` / `publicName`).
- Sync wymaga mapowania klubu — komunikat błędu gdy brak `isPrimary`/pierwszego wpisu.

---

## 3. Mapowanie drużyn

### Znalezione problemy

1. **P1** — Sync ignorował tabelę `external_teams` — zawsze brał drużynę seniorów.
2. **P1** — Brak walidacji przynależności `teamId` do klubu.

### Wdrożone poprawki

- `resolveTeamIdForMatch` — najpierw `external_teams`, fallback na seniorów.
- `loadExternalTeams` w silniku synchronizacji.
- Walidacja `teamId` w `upsertExternalTeamMappingAction`.

---

## 4. Logi synchronizacji

### Znalezione problemy

1. **P2** — UI wyświetlało błędny format liczników: `(processed/failed)` zamiast jawnych etykiet.
2. **P3** — `getIntegrationSyncErrors` pobierało 50 logów i filtrowało w pamięci.

### Wdrożone poprawki

- `SyncHistoryPanel` — `(przetworzono: X, błędy: Y)`.
- `getIntegrationSyncErrors` — zapytanie SQL z `.in("status", ["error", "partial"]).limit(20)`.
- `capQualityIssues` — limit 50 problemów w logach/importach.

---

## 5. Obsługa błędów

### Znalezione problemy

1. **P0** — Status meczów: import `"scheduled"` → insert do `matches` z nieprawidłowym enumem `match_status` (fail).
2. **P1** — `resolveSyncConflictAction` nie aktualizował tabeli `matches`.
3. **P1** — Sync nie tworzył konfliktów przy rozbieżności wyników.
4. **P2** — Import mógł zostać w `processing` przy crashu (obsługa `catch` była, brak limitów powodował OOM).
5. **P2** — Duplikaty meczów po usunięciu `matches` (`match_id` → null, brak re-linku).

### Wdrożone poprawki

- `mapExternalMatchStatus` / `mapExternalMatchStatusForStaging` — mapowanie `scheduled` → `planned`, `finished` → `completed` itd.
- `syncFixturesFromStaging`:
  - Detekcja konfliktów wyników → `sync_conflicts`.
  - Re-link po usunięciu meczu (deduplikacja po dacie + drużynach).
  - Aktualizacja wyników istniejących meczów bez konfliktu.
- `resolveSyncConflictAction` — aktualizacja `matches` przy `keep_external`.
- Limity importu: 2 MB plik, 1000 wierszy — wcześniejszy fail z komunikatem.

---

## 6. Wydajność importów

### Znalezione problemy

1. **P1** — Sekwencyjne upserty w pętli (N zapytań).
2. **P1** — Brak limitu rozmiaru pliku/wierszy.
3. **P3** — Niestabilne `externalId` w CSV (`CSV-1`, `CSV-2`…) — duplikaty przy ponownym imporcie.

### Wdrożone poprawki

- Batch upsert co `IMPORT_BATCH_SIZE` (50) dla tabeli i meczów stagingowych.
- `MAX_IMPORT_FILE_BYTES`, `MAX_IMPORT_ROWS` w `validation.ts`.
- `stableFixtureExternalId` — deterministyczny ID z daty, kolejki i nazw drużyn.

---

## 7. TypeScript

### Znalezione problemy

1. **P2** — `resolveSyncConflictAction`: `status` jako `string` zamiast `MatchStatus` przy update `matches`.

### Wdrożone poprawki

- Import `mapExternalMatchStatus` z poprawnym typem `MatchStatus`.
- `npm run typecheck` — ✅ bez błędów.

---

## 8. Mobile (panel integracji)

### Znalezione problemy

1. **P2** — Tabele historii sync/import/mapowań drużyn bez widoku kart — poziomy scroll na telefonie.
2. **P3** — Input pliku importu bez minimalnego touch target (44px).

### Wdrożone poprawki

- `SyncHistoryPanel`, `ImportsHistoryPanel`, `TeamMappingsPanel` — widok kart `md:hidden` + tabela `hidden md:block`.
- Input pliku: `min-h-[44px]`, stylowany `file:` picker.
- Formularze sync/konfiguracji — już miały `min-h-[44px]` (zachowane).

---

## Pliki zmienione w audycie

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/20260604102000_integrations_audit_hardening.sql` | **NOWY** — GRANTs, triggery, indeksy |
| `src/lib/integrations/validation.ts` | **NOWY** — limity, mapowanie statusów, walidacja enumów |
| `src/lib/integrations/sync-engine.ts` | Sync meczów, konflikty, external_teams, statusy |
| `src/features/integrations/actions.ts` | Batch import, walidacja, mapowania klubu |
| `src/lib/integrations/mappers.ts` | `getPrimaryClubMapping`, poprawione `isOwnClubTeamName` |
| `src/lib/integrations/quality.ts` | `detectEmptyTeamNames` |
| `src/lib/integrations/import-parsers.ts` | Stabilne external ID |
| `src/lib/auth/session.ts` | Efektywne `getIntegrationSyncErrors` |
| `src/features/integrations/components/integrations-panels.tsx` | Mobile cards, ratio logów, touch target |
| `scripts/setup-stage10.mjs` | Migracja audytu w setup |
| `package.json` | `db:migrate:integrations-audit` |

---

## Pozostałe uwagi (bez zmian — poza zakresem audytu)

- **PZPN/DZPN live API** — adaptery nadal stub; synchronizacja opiera się na stagingu/importach CSV/JSON (zgodnie z projektem ETAP 10).
- **Pełna synchronizacja tabeli ligowej z API** — wymagałaby nowego źródła danych (poza zakresem „bez nowych funkcji”).
- Lokalnie moduł wymaga `npm run setup:stage10` na bazie z ETAP 1–9.

---

## Checklist wdrożenia

- [ ] `npm run setup:stage10` (świeża baza) lub `npm run db:migrate:integrations-audit` (istniejąca baza ETAP 10)
- [ ] Zweryfikuj mapowanie klubu: Piorun Wawrzeńczyce ↔ GLKS Mietków
- [ ] Import CSV terminarza → sync → mecze w `/matches`
- [ ] Panel `/integrations/sync` — logi z poprawnymi licznikami
- [ ] Test na telefonie: `/integrations/imports`, `/integrations/mappings`
