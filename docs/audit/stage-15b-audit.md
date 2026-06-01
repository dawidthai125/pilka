# Audyt ETAP 15B — League Hub (post-fix)

**Data:** 2026-05-31  
**Zakres:** importy, CSV injection, XLSX, duplikaty meczów, konflikty, RLS, integracja Matches / AI / Content Hub  
**Status po audycie:** ✅ wszystkie problemy P0–P2 naprawione

Powiązane: [moduł League Hub](../modules/stage-15b-league-hub.md), [raport ETAP 15B](../stage-15b-report.md)

---

## Podsumowanie wykonawcze

| Obszar | Przed audytem | Po naprawie |
|--------|---------------|-------------|
| Import cross-club | ⚠️ brak walidacji app competition/season/source | ✅ `assertLeagueImportContext` + triggery DB |
| CSV injection | ❌ brak sanityzacji formuł | ✅ `sanitizeLeagueImportText` (=,+,-,@) |
| XLSX | ⚠️ fallback CSV bez weryfikacji | ✅ magic bytes ZIP + rozszerzenie pliku |
| Duplikaty meczów | ⚠️ różne external_key (GLKS vs Piorun) | ✅ `canonicalLeagueTeamKeyName` |
| Konflikty | ⚠️ wielokrotne pending, ponowne resolve | ✅ unique index + `recordScoreConflict` + status check |
| Tabela ligowa | ⚠️ brak limitów statystyk / wierszy | ✅ `clampTableStat`, MAX 500 wierszy |
| RLS | ⚠️ brak GRANT EXECUTE, conflicts FOR ALL | ✅ GRANTs + INSERT/UPDATE split |
| Matches sync | ✅ match_id FK | ✅ + weryfikacja club_id w loadCompetitionMeta |
| AI | ✅ canReadLeague | ✅ bez zmian (PASS) |
| Content Hub | ✅ verifyContentReferences | ✅ match_id z sync należy do club_id |
| Testy statyczne | — | ✅ `npm run audit:stage15b` (17/17 PASS) |

---

## 1. Bezpieczeństwo importów

### Problem (P0) — LH-01: import z obcym competition_id / season_id

**Scenariusz penetracyjny:** administrator klubu A podstawia UUID rozgrywek klubu B w formularzu importu.

**Obrona przed audytem:** trigger na DB blokował INSERT, ale brak walidacji w app.

### Naprawa

- `assertLeagueImportContext()` w `importLeagueFileAction`
- Trigger `enforce_league_sync_job_consistency` na `league_sync_jobs`
- `loadCompetitionMeta(competitionId, expectedClubId)` w sync engine

---

## 2. CSV injection

### Problem (P1) — LH-02: formuły w nazwach drużyn

**Scenariusz:** plik CSV z `=cmd|'/c calc'!A0` w nazwie drużyny.

### Naprawa

`sanitizeLeagueImportText()` — usuwa wiodące `=`, `+`, `-`, `@`, `\t`, `\r`.

---

## 3. Import XLSX

### Problem (P1) — LH-03: fałszywy plik .xlsx

### Naprawa

- `isXlsxBinaryContent()` — magic bytes `PK\x03\x04`
- `isAllowedLeagueImportFileName()` — rozszerzenie vs adapter

---

## 4. Duplikaty meczów

### Problem (P1) — LH-04: GLKS Mietków vs Piorun Wawrzeńczyce

### Naprawa

`canonicalLeagueTeamKeyName()` — jeden `external_key` na mecz.

---

## 5. Konflikt danych

### Problem (P1) — LH-05: wielokrotne konflikty pending

### Naprawa

- `UNIQUE INDEX league_conflicts_pending_uniq`
- `recordScoreConflict()` — deduplikacja
- `resolveLeagueConflict()` — tylko `status = pending`
- Re-import zachowuje `sync_status: synced` gdy wynik bez zmian

---

## 6. RLS

Migracja `20260618123000_stage15b_audit_hardening.sql`:

- Rozszerzone triggery spójności `club_id`
- `GRANT EXECUTE` na funkcje RBAC
- Rozdzielone polityki `league_conflicts`

**Sponsor:** brak dostępu — PASS.

---

## 7–9. Integracje Matches / AI / Content Hub

- **Matches:** deduplikacja, konflikty wyników, FK `match_id`
- **AI:** `getLeagueInsights` + `league:read`
- **Content Hub:** `verifyContentReferences` dla `match_id`

---

## 10. Testy penetracyjne

| Test | Wynik |
|------|-------|
| Import danych innego klubu | ✅ Odrzucony |
| Duplikaty meczów (aliasy nazw) | ✅ Zdeduplikowany external_key |
| Psucie tabeli (ujemne/extreme stats) | ✅ Clamp 0–999 |
| Ponowny resolve konfliktu | ✅ Odrzucony |
| Coach import | ✅ Brak uprawnień |

---

## Werdykt

**ETAP 15B — audyt PASS.**
