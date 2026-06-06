# Sprint 19.1 — Club Attention Dashboard (implementacja)

**Po:** 19.0B Club Operations Registry  
**Ograniczenia:** brak nowych tabel, RPC, migracji, endpointów, cronów · **bez commita**

## Cel

Na `/platform` operator od razu widzi kluby i alerty wymagające uwagi — bez Monitoring Center ani pełnego rejestru.

## Zmienione pliki

| Plik | Zmiana |
|------|--------|
| `src/lib/platform/dashboard.ts` | Jeden kontekst Health v2 + alerty + sekcje attention |
| `src/lib/platform/health.ts` | `platformHealthSummaryFromRows()` — summary bez ponownego fetch |
| `src/features/platform/components/platform-dashboard.tsx` | 4 sekcje UX + skrócone Platform Health |
| `src/app/(platform)/platform/page.tsx` | Subtitle |
| `scripts/validate-191a-club-attention-dashboard.mjs` | Walidator |
| `docs/architecture/sprint-191a-club-attention-dashboard-implementation.md` | Ten dokument |
| `docs/architecture/sprint-191a-club-attention-dashboard-validation.md` | Walidacja |

## Sekcje dashboardu

### 1. Kluby wymagające uwagi (max 10)

Sort: CRITICAL → WARNING → onboarding (checklist ≠ complete).  
Kolumny: klub, status, health, score, główny problem, Monitoring / Szczegóły.

### 2. Najważniejsze alerty (max 5)

Z `evaluatePlatformAlerts` (kolejność 18.6C). Klik → `/platform/monitoring?clubId=` lub Monitoring ogólny.

### 3. Onboarding wymagający działań (max 10)

`status = onboarding` + brakujące kroki z `ctx.onboardingByClubId` (batch Health context).

### 4. Szybkie akcje

Linki: Wszystkie kluby · Monitoring · Alerty krytyczne (badge) · `?status=attention`.

## Analiza zapytań (`loadPlatformDashboard`)

| Krok | Zapytania |
|------|-----------|
| `loadHealthMetricsContext()` | 1× RPC metrics + 3× PostgREST (clubs, sources, batch onboarding) |
| Równolegle | `loadSyncMonitoring`, league count, 10 sync jobs, clubs.settings (audit), `computeClubHealthRows`, `computeLeagueHealthRows` |
| Alerty | 0 dodatkowych (in-memory z health + cron) |

**Usunięte:** `computePlatformHealthSummary()` jako osobny load; pętla `computeClubOnboardingStatus` per klub (N+1).

**Razem:** ~8–9 zapytań stałych, niezależnie od liczby klubów na liście attention.
