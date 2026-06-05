# Sprint 19.3B — SaaS Readiness P0 (implementacja)

**Po audycie:** [sprint-193a-saas-readiness-audit.md](./sprint-193a-saas-readiness-audit.md)  
**Bez commita** · bez nowych modułów produktowych · bez migracji w `supabase/migrations/`

## Cel

Usunięcie ryzyk P0 (R1–R3) przed skalowaniem do 100 klubów.

## Zmiany

### P0-1 — Club Detail N+1

`getPlatformClubDetail(clubId)` — pojedynczy SELECT klubu + równoległy onboarding (4 zapytania) + owner/profile (do 2).

**Usunięto:** `listPlatformClubs()` → `find()` dla wszystkich klubów.

### P0-2 — Paginacja Registry

- `loadClubOperationsRegistryPage({ page, pageSize, status, search, hideTest })`
- Domyślnie **25** wierszy; opcje **25 / 50 / 100**
- Filtry i wyszukiwanie po stronie serwera (`q`, `status`, `hideTest`)
- KPI summary nadal z pełnego zbioru (health context)

### P0-3 — Paginacja Monitoring

- `loadPlatformMonitoringBundle({ clubHealthPage, leagueHealthPage, healthPageSize })`
- Alerty liczone na **pełnym** health (bez regresji)
- Club/League Health w UI: domyślnie **50** wierszy, opcje **25 / 50 / 100**
- Sync History: bez zmian (**limit 100**)

### P0-4 — Audit growth

- `PLATFORM_AUDIT_MAX_ENTRIES = 100`
- `trimPlatformAuditEntries` / `parsePlatformAuditFromSettings` przy zapisie i odczycie
- SQL hotfix: `scripts/sql/hotfix-193b-platform-audit-prune.sql` (RPC prune + 19.2B restore)

## Lista plików

| Plik | Zmiana |
|------|--------|
| `src/lib/platform/onboarding-status.ts` | P0-1 single-club detail |
| `src/lib/platform/club-operations-registry.ts` | P0-2 paginacja |
| `src/app/(platform)/platform/clubs/page.tsx` | searchParams → page loader |
| `src/features/platform/components/club-operations-registry.tsx` | paginacja UI, GET search |
| `src/lib/platform/health.ts` | P0-3 monitoring pagination |
| `src/app/(platform)/platform/monitoring/page.tsx` | health page params |
| `src/features/platform/components/sync-monitoring-view.tsx` | pagination props |
| `src/features/platform/components/monitoring-interactive.tsx` | health pagination UI |
| `src/lib/platform/audit.ts` | P0-4 trim + parse |
| `src/lib/platform/audit-center.ts` | parse trimmed audit |
| `src/lib/platform/dashboard.ts` | parse trimmed audit |
| `scripts/sql/hotfix-193b-platform-audit-prune.sql` | RPC prune |
| `scripts/validate-193b-saas-readiness-p0.mjs` | walidator |
| `scripts/validate-190b-*.mjs`, `validate-192b-*.mjs` | aktualizacja asercji |

## Wydajność — Before / After

### Club Detail (`/platform/clubs/[id]`)

| Kluby (N) | Before (zapytań) | After (zapytań) |
|-----------|------------------|-----------------|
| 20 | 1 + 20×(2+4) ≈ **121** | **~6** |
| 50 | ≈ **301** | **~6** |
| 100 | ≈ **601** | **~6** |

### Registry (`/platform/clubs`) — payload HTML

| Kluby (N) | Before (wierszy DOM) | After (domyślnie) |
|-----------|----------------------|-------------------|
| 20 | 20 | **25** max |
| 50 | 50 | **25** |
| 100 | 100 | **25** |

*Koszt health context (~6 zapytań) bez zmian — świadomy kompromis P0.*

### Monitoring — payload health tables

| Kluby (N) | Before (club rows DOM) | After (domyślnie) |
|-----------|------------------------|-------------------|
| 20 | 20 | **20** (≤50) |
| 50 | 50 | **50** |
| 100 | 100 | **50** |

Alerty: nadal pełna ewaluacja server-side (bez regresji).

### Audit (`platformAudit`)

| | Before | After |
|---|--------|-------|
| Zapis | bez limitu | max **100** wpisów/klub |
| Odczyt Dashboard/Audit | pełna tablica | trim do 100 przy parse |

## Wpływ na SaaS Readiness

| Skala | 19.3A | Po 19.3B |
|-------|-------|----------|
| 20 | GREEN / GO | GREEN / GO |
| 50 | YELLOW / GO warunkowy | **YELLOW / GO** (detail naprawiony) |
| 100 | RED / NO-GO | **YELLOW / GO warunkowy** (P1: cache, listUsers) |

R1 (detail N+1) — **usunięte**.  
R2 (paginacja registry) — **usunięte** (payload).  
R3 (audit growth) — **ograniczone** (100/klub).

## Operacyjnie

Zastosuj na Supabase (jeśli jeszcze nie):

```bash
psql $DATABASE_URL -f scripts/sql/hotfix-193b-platform-audit-prune.sql
```
