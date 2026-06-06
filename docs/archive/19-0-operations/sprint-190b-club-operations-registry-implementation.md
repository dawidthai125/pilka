# Sprint 19.0B — Club Operations Registry (implementacja)

**Baseline:** audyt 19.0A · tag `pre-19-multi-club-operations`  
**Ograniczenia:** brak nowych tabel, RPC, migracji, endpointów API · **bez commita**

## Cel

Operacyjny rejestr klubów na `/platform/clubs` — odpowiedzi na pytania operatora bez wchodzenia w Monitoring Center (health nadal z Health v2).

## Zmienione / nowe pliki

| Plik | Rola |
|------|------|
| `src/lib/platform/club-operations-registry.ts` | `loadClubOperationsRegistry()` — 1× health context + health rows + bulk owners |
| `src/lib/platform/club-lifecycle.ts` | `archiveClub()` → `platform_set_club_status('archived')` |
| `src/features/platform/components/club-operations-registry.tsx` | Tabela, filtry, search, Archive + confirm |
| `src/app/(platform)/platform/clubs/page.tsx` | Przełączenie na registry loader |
| `src/features/platform/actions.ts` | `archiveClubAction` |
| `src/lib/platform/platform-audit-actions.ts` | `club_archived` |
| `src/app/(platform)/platform/monitoring/page.tsx` | `?clubId=` deep link |
| `src/features/platform/components/sync-monitoring-view.tsx` | `initialClubId` prop |
| `src/features/platform/components/monitoring-interactive.tsx` | Początkowy filtr Sync History + scroll |
| `scripts/validate-190b-club-operations-registry.mjs` | Walidator |
| `docs/architecture/sprint-190b-club-operations-registry-implementation.md` | Ten dokument |
| `docs/architecture/sprint-190b-club-operations-registry-validation.md` | Walidacja |

**Legacy (niewykorzystywane na liście):** `club-directory-table.tsx`, `listPlatformClubs()` na `/platform/clubs` — detail klubu nadal używa `getPlatformClubDetail()`.

## Tabela — kolumny

| Kolumna | Źródło |
|---------|--------|
| Nazwa, slug, status, utworzono | `clubs` via `loadHealthMetricsContext` |
| Owner | bulk `club_memberships` + `profiles` |
| Health Score / Status | `computeClubHealthRows(ctx)` |
| Ostatni sync | `ClubHealthRow.lastSyncAt` |
| Liga | `league_sources` z kontekstu (provider · nazwa) |

## Filtry (`?status=`)

- `active` · `onboarding` · `archived`
- `attention` — `requiresAttention`: status ≠ archived AND level ∈ {WARNING, CRITICAL}

## Wyszukiwanie

Client-side: `publicName`, `slug` (case-insensitive).

## Archiwizacja

- Przycisk **Archive** tylko dla `status === active'`.
- Modal potwierdzenia → `archiveClubAction` → RPC + audit `club_archived`.

## Unarchive

**Nie zaimplementowano** — RPC `platform_set_club_status` nie pozwala na `archived` → `active` (tylko `onboarding` → `active`). Informacja w UI; plan 19.2.

## Monitoring

Klik **Health Score** lub **Monitoring** → `/platform/monitoring?clubId={uuid}` — prefiltr Sync History + podświetlenie Club Health.

## Analiza zapytań (strona `/platform/clubs`)

| Krok | Zapytania |
|------|-----------|
| `loadHealthMetricsContext()` | 1× `platform_sync_metrics` RPC + 3× PostgREST równolegle (`clubs`, `league_sources`, batch onboarding) |
| `computeClubHealthRows(ctx)` | 0 dodatkowych (in-memory) |
| `loadOwnerByClubId` | 2× PostgREST (`club_memberships` IN, `profiles` IN) |

**Razem:** ~6 zapytań niezależnie od liczby klubów (brak N+1 per klub na liście).

**Uwaga:** `buildOnboardingByClubId` w health context nadal wykonuje batch queries — to istniejąca logika Health v2, nie nowa.
