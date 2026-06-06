# Sprint 20.1 — Platform Performance P1 (implementacja)

**Po audycie:** [sprint-200a-platform-scale-review.md](./sprint-200a-platform-scale-review.md)  
**Baseline:** tag `pre-20-platform-scale-review` (`351b424`)  
**Bez commita** · bez nowych modułów produktowych · bez zmian UX · bez migracji w `supabase/migrations/`

## Cel

Zrealizować wszystkie P1 z Sprint 20.0A: zmniejszyć koszt zapytań, usunąć duplikację fetchy, przybliżyć FC OS do pełnego **GO** dla 100 klubów.

---

## Zmiany

### P1-1 — `React.cache` dla Health Context

`loadHealthMetricsContext()` owinięte w `cache()` z `react`:

- Implementacja w `loadHealthMetricsContextImpl()`
- Eksport: `export const loadHealthMetricsContext = cache(loadHealthMetricsContextImpl)`
- W obrębie jednego requestu RSC (Dashboard, Monitoring bundle, Registry, Attention, Alerts) — **maksymalnie 1×** wykonanie ~6 round-tripów

**Konsumenci (bez zmian API):** `dashboard.ts`, `health.ts` (monitoring bundle, `computeClubHealthRows`), `club-operations-registry.ts`, `evaluatePlatformAlerts` (via przekazany `ctx`).

### P1-2 — Dashboard Fetch Deduplication

| Before | After |
|--------|-------|
| `loadHealthMetricsContext` + `loadSyncMonitoring` (2× clubs) + `clubsAuditRes` (3× clubs) + `leaguesRes` count + 2× `league_sync_jobs` | `loadHealthMetricsContext` (1× clubs) + 1× `league_sync_jobs` (limit 50) + health compute in-memory |

- Audit recent actions: `ctx.clubs` zamiast osobnego SELECT `clubs`
- Active leagues KPI: `countActiveLeagues(ctx)` z `sourcesByClubId` zamiast `league_sources` count
- Sync monitoring + recent syncs: jeden fetch jobów → `buildSyncMonitoringData()` + slice 10 dla recent

### P1-3 — Owner Lookup (create owner)

`ensureOwnerViaAuth()` — usunięto `listUsers({ perPage: 1000 })`.

- Lookup: `profiles` po email (`ilike`) — O(1), zgodne z rekomendacją audytu (SDK `@supabase/supabase-js` ^2.106 nie eksponuje `getUserByEmail` w typach)
- Transakcja bootstrap nadal sprawdza `profiles` przez SQL przed wywołaniem `ensureOwnerViaAuth`
- **Resend invite** (`club-lifecycle.ts`) — bez zmian; już używa `membership.user_id` → `profiles.email`

### P1-4 — Deprecation Cleanup

Usunięto legacy ścieżki N+1:

| Usunięte | Powód |
|----------|-------|
| `listPlatformClubs()` | ~6N zapytań; brak call sites w UI po 19.3B Registry |
| `fetchPlatformClubs()` | Jedyny konsument `listPlatformClubs`; zero importów w `src/` |

**Zastępnik:** `loadClubOperationsRegistryPage()` (Registry) · `getPlatformClubDetail()` (detail).

### P1-5 — Sync Jobs Retention

SQL hotfix (ręczny apply, bez nowej tabeli):

- `scripts/sql/hotfix-201a-sync-jobs-retention.sql`
- Funkcja `platform_prune_league_sync_jobs(p_retention_days DEFAULT 90)` → `DELETE` z `league_sync_jobs` starszych niż cutoff
- Monitoring UI: ostatnie 50–100 jobów; RPC `platform_sync_metrics`: okno 7 dni — retencja 90 dni zachowuje pełną funkcjonalność

---

## Lista plików

| Plik | Zmiana |
|------|--------|
| `src/lib/platform/health.ts` | P1-1 `React.cache`; P1-2 monitoring bundle przekazuje `clubLookup` |
| `src/lib/platform/dashboard.ts` | P1-2 dedup clubs/jobs/leagues |
| `src/lib/platform/monitoring.ts` | `buildSyncMonitoringData`, opcjonalny `clubLookup` w `loadSyncMonitoring` |
| `src/lib/platform/club-bootstrap.ts` | P1-3 profiles lookup zamiast `listUsers` |
| `src/lib/platform/onboarding-status.ts` | P1-4 usunięto `listPlatformClubs` |
| `src/features/platform/actions.ts` | P1-4 usunięto `fetchPlatformClubs` |
| `scripts/sql/hotfix-201a-sync-jobs-retention.sql` | P1-5 retention RPC |
| `scripts/validate-201a-platform-performance-p1.mjs` | walidator sprintu |
| `docs/architecture/sprint-201a-platform-performance-p1-implementation.md` | ten dokument |
| `docs/architecture/sprint-201a-platform-performance-p1-validation.md` | raport walidacji |

---

## Wydajność — Before / After

### Dashboard (`/platform`)

| Skala | Before (zapytań/request) | After (zapytań/request) | Uwagi |
|-------|--------------------------|-------------------------|-------|
| 20 klubów | ~10–11 (3× `clubs`, 2× jobs, 1× leagues count) | **~7** (1× context + 1× jobs + compute) | −3 duplikaty `clubs`, −1 leagues, −1 jobs |
| 50 klubów | ~10–11 | **~7** | Koszt stały względem N (context O(N) scan bez zmian) |
| 100 klubów | ~10–11 | **~7** | Idem |

### Monitoring (`/platform/monitoring`)

| Skala | Before | After | Uwagi |
|-------|--------|-------|-------|
| 20 / 50 / 100 | ~9 (context + sync + clubs w monitoring + history + alerts) | **~8** | −1 `clubs` w `loadSyncMonitoring` (reuse context) |
| Health context w request tree | 1× per loader call | **1×** dzięki `React.cache` | Gdy layout + page współdzielą drzewo — dodatkowa oszczędność |

### Registry (`/platform/clubs`)

| Skala | Before | After | Uwagi |
|-------|--------|-------|-------|
| 20 / 50 / 100 | ~8 (+ context O(N)) | **~8** | Bez zmian query count; `React.cache` chroni przed wielokrotnym context w tym samym request |

### Owner lookup (create club)

| Operacja | Before | After |
|----------|--------|-------|
| `ensureOwnerViaAuth` | `listUsers(1000)` + filter O(1000) | **1×** `profiles` SELECT |
| Masowy onboarding 50+ ownerów | Ryzyko limitu Auth API | **Skalowalne** (indeks na `profiles.email`) |

---

## Wpływ na SaaS Readiness

| Metryka (z 20.0A) | Przed 20.1 | Po 20.1 |
|-------------------|------------|---------|
| 20 klubów | GO | **GO** |
| 50 klubów | GO | **GO** (TTFB dashboard ↓) |
| 100 klubów | GO warunkowy | **GO** (P1 zamknięte; retencja jobs wymaga apply hotfixu na DB) |
| 500 klubów | NO-GO | **NO-GO** (bez materialized views / audit table) |

**Zamknięte TD z 20.0A:** TD-1, TD-3, TD-4, TD-5, TD-7 (kod + skrypt SQL).

**Pozostaje P2+:** TD-2 (pełny health scan O(N)), TD-6 (Audit Center full-club scan), TD-8 (hotfixy ręczne).

---

## Usunięte / zdeprecjonowane ścieżki

| Ścieżka | Status |
|---------|--------|
| `listPlatformClubs()` | **Usunięta** |
| `fetchPlatformClubs()` server action | **Usunięta** |
| Dashboard `clubsAuditRes` SELECT | **Usunięta** (→ `ctx.clubs`) |
| Dashboard `leaguesRes` count | **Usunięta** (→ `countActiveLeagues`) |
| Dashboard drugi fetch `league_sync_jobs` limit 10 | **Scalony** z monitoring jobs (50, slice 10) |
| `ensureOwnerViaAuth` → `listUsers(1000)` | **Usunięta** (→ `profiles` lookup) |

---

## Nie zmieniano

- Health v2 scoring / RPC `platform_sync_metrics`
- Alerts evaluator
- Lifecycle (activate / archive / restore / resend)
- Registry logika biznesowa i paginacja 19.3B
- Monitoring UX i paginacja health
