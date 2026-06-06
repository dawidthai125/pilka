# PROJECT HANDOFF — FC OS Platform (checkpoint 20.1)

**Data:** 2026-06-06 (zaktualizowano po deploy recovery)  
**Tag:** `pre-20-2-platform-roadmap` → `ed324b7`  
**Produkcja LIVE (Vercel):** `eb29e7a` (20.1 + deploy fix)  
**Baseline poprzedni:** `pre-20-platform-scale-review` (`351b424`)  
**Produkcja URL:** https://pilka-mu.vercel.app  
**Supabase:** `pwkqnwqvrdiaycveacxa`  
**Kluby referencyjne:** Piorun Wawrzeńczyce · GLKS Mietków

---

## 0. START HERE — STAN NA DZIŚ

| Pole | Wartość |
|------|---------|
| **Faza zamknięta** | 18.5A → **20.1** (Platform Performance P1 + deploy recovery) |
| **origin/main HEAD** | `eb29e7a` |
| **Production Readiness** | **GO** (20 / 50 / **100** klubów) |
| **Vercel deploy** | **PASS** (`eb29e7a`, 2026-06-06) |
| **500 klubów** | **NO-GO** (wymaga materialized KPI, audit table, edge cache) |
| **Następny sprint (rekomendacja)** | **20.2 — Club Management** |
| **Tag checkpointu** | `pre-20-2-platform-roadmap` (na `ed324b7`; prod = `eb29e7a`) |

**Nowy agent — kolejność:**
1. Ten dokument (Platform 20.1)
2. [project-handoff-current.md](../audit/project-handoff-current.md) (skrót START HERE)
3. [sprint-200a-platform-scale-review.md](./sprint-200a-platform-scale-review.md) (audyt skali)
4. [sprint-201a-deploy-recovery-rca.md](./sprint-201a-deploy-recovery-rca.md) (**obowiązkowe** przy pracy nad Platform UI)

---

## 1. Stan platformy

### Moduły Platform Admin

| Moduł | Status | Uwagi |
|-------|--------|-------|
| **Dashboard** (`/platform`) | **GREEN** | Dedup zapytań (20.1); Attention sections |
| **Registry** (`/platform/clubs`) | **GREEN** | Paginacja 25/50/100 (19.3B) |
| **Lifecycle** | **GREEN** | create · activate · archive · restore · resend invite (19.2B) |
| **Monitoring** (`/platform/monitoring`) | **GREEN** | Health v2 · Alerts · Sync History · paginacja health |
| **Health v2** | **GREEN** | `loadHealthMetricsContext` + `React.cache` (20.1) |
| **Alerts** (18.6B/C) | **GREEN** | Dedupe · test club filter |
| **Sync History** (18.5C) | **GREEN** | Limit 100 jobów |
| **Audit** (JSONB + Center) | **YELLOW** | Cap 100/klub (19.3B); full-club scan przy odczycie |

### Architektura rdzenia

- **`loadHealthMetricsContext`** — ~6 round-tripów (RPC `platform_sync_metrics` + clubs + sources + batch onboarding); **deduplikowany per request** przez `React.cache()`.
- **Registry / Monitoring** — współdzielą health context; paginacja ogranicza payload HTML, scan O(N) pozostaje świadomym kompromisem.
- **Brak nowych tabel** w 20.1; hotfixy SQL w `scripts/sql/` (ręczny apply na nowych env).

### Client vs server (deploy recovery `eb29e7a`)

| Moduł | Server (`pg` / Supabase admin) | Client-safe |
|-------|-------------------------------|-------------|
| Health loadery | `health.ts` | `health-types.ts` |
| Registry loadery | `club-operations-registry.ts` | `club-operations-registry-types.ts` |

Komponenty `"use client"` importują **wyłącznie** z kolumny client-safe. Value import z `health.ts` psuje build Vercel (`net`/`tls`).

---

## 2. Ukończone sprinty (18.5A → 20.1)

| Sprint | Zakres | Tag / commit (orientacyjnie) |
|--------|--------|------------------------------|
| **18.5A** | League sync foundation, `platform_sync_metrics` RPC | migracja |
| **18.5B** | Health v2 | — |
| **18.5C** | Sync History v1 | — |
| **18.5D** | Monitoring UX, health-history linking | `6b291b1` |
| **18.6B** | Platform Alerts v1 | — |
| **18.6C** | Alerts polish, deduplication | `71f8c83` |
| **19.0B** | Club Operations Registry | — |
| **19.1** | Club Attention Dashboard | — |
| **19.2B** | Lifecycle hardening (restore, resend, isTest) | `4311404` · `pre-19-3-saas-readiness-audit` |
| **19.3A** | SaaS Readiness Audit (docs) | — |
| **19.3B** | SaaS Readiness P0 (detail N+1, paginacja, audit cap) | `351b424` · `pre-20-platform-scale-review` |
| **20.0A** | Platform Scale Review (audyt, docs) | — |
| **20.1** | Platform Performance P1 | `ed324b7` · tag `pre-20-2-platform-roadmap` |
| **20.1 deploy fix** | Client/server import split | `eb29e7a` · **prod LIVE** |

### Sprint 20.1 — zmiany kodu (P1)

1. **`React.cache(loadHealthMetricsContext)`** — max 1× na request RSC.
2. **Dashboard dedup** — 1× clubs (context), 1× jobs, KPI lig z context.
3. **Owner lookup** — `profiles` po email zamiast `listUsers(1000)`.
4. **Usunięto** `listPlatformClubs` / `fetchPlatformClubs` (legacy N+1).
5. **Sync jobs retention** — `platform_prune_league_sync_jobs(90)` (SQL hotfix).

### Deploy recovery (`eb29e7a`)

6. **`health-types.ts`** / **`club-operations-registry-types.ts`** — typy i stałe bez `pg` dla `"use client"`.

---

## 3. Wdrożone hotfixy SQL (Supabase FC OS)

| Hotfix | Sprint | Status prod | Opis |
|--------|--------|-------------|------|
| `hotfix-192b-platform-restore-club.sql` | 19.2B | ✅ PASS | `archived` → `onboarding` restore |
| `hotfix-193b-platform-audit-prune.sql` | 19.3B | ✅ PASS | Audit cap 100 via RPC |
| `hotfix-201a-sync-jobs-retention.sql` | 20.1 | ✅ PASS | `platform_prune_league_sync_jobs(90)` |

**Apply na nowym środowisku:**

```bash
psql $DATABASE_URL -f scripts/sql/hotfix-192b-platform-restore-club.sql
psql $DATABASE_URL -f scripts/sql/hotfix-193b-platform-audit-prune.sql
psql $DATABASE_URL -f scripts/sql/hotfix-201a-sync-jobs-retention.sql
```

**Ops (20.1):** zaplanuj okresowe `SELECT public.platform_prune_league_sync_jobs(90);` (pg_cron / external cron). Funkcja wdrożona; pierwszy produkcyjny prune — według harmonogramu ops (prod: 23 joby, wszystkie < 90 dni).

---

## 4. Ocena skali (aktualna)

| Skala | Werdykt | Uzasadnienie |
|-------|---------|--------------|
| **20 klubów** | **GO** | Pełny workflow operatora; ~7 zapytań dashboard |
| **50 klubów** | **GO** | Health context + paginacja; TTFB akceptowalny |
| **100 klubów** | **GO** | P0 + P1 zamknięte; retencja jobs na DB |
| **500 klubów** | **NO-GO** | O(N) health scan, Audit Center JSONB scan, brak materialized KPI |

### Szacunek zapytań (post-20.1)

| Strona | Zapytań/request |
|--------|-----------------|
| Club detail | ~6 |
| Registry (strona) | ~8 + context O(N) |
| Dashboard | **~7** |
| Monitoring | **~8** |

---

## 5. Otwarte P1 / P2 (backlog)

### Zamknięte w 20.1 (ex-P1)

- TD-1 `listPlatformClubs` N+1  
- TD-3 Dashboard 3× clubs, 2× jobs  
- TD-4 Brak `React.cache`  
- TD-5 `listUsers(1000)`  
- TD-7 Brak retencji `league_sync_jobs` (funkcja + ops cron)

### Pozostałe P1 (przy 100+)

| ID | Dług | Priorytet | Uwagi |
|----|------|-----------|-------|
| TD-2 | Pełny health context przed slice paginacji | P1 | CPU/DB scan O(N); cache nie usuwa cold scan |
| TD-6 | Audit Center: SELECT wszystkich klubów + flatMap JSONB | P1→P2 przy 100+ | Trim 100 pomaga przy zapisie |

### P2 (odłożone)

| ID | Dług |
|----|------|
| TD-8 | Hotfixy SQL poza `supabase/migrations/` — ręczny apply |
| TD-9 | `website_media` bulk bez agregacji SQL |
| TD-10 | Duplikacja `isTestClub` (validators vs TS) |
| TD-11 | Resend invite — limity Auth |
| TD-12 | Brak `clubs.status = suspended` |
| TD-13 | Materialized health KPI / dedykowana tabela audit |

### Luki produktowe (nie techniczne)

- Brak alertów poza UI (email/Slack)
- Brak raportu ownerów oczekujących (>7d invited)
- Brak bulk actions (mass archive, export CSV)

---

## 6. Rekomendacja — Sprint 20.2

### **20.2 — Club Management** (kandydat z 20.0A)

| Obszar | Propozycja scope |
|--------|------------------|
| **Owner lifecycle** | Raport ownerów `invited` >7d |
| **Lifecycle UX** | Archive z onboarding (UI zgodne z RPC) |
| **Registry ops** | Export CSV, ewentualnie bulk filter actions |
| **Status klubu** | Decyzja produktowa: `suspended` vs archive-only |

**Dlaczego nie Scale P2 od razu?** P1 domknął GO do 100 klubów; kolejny skok (500) wymaga większej architektury (materialized views, audit table). Club Management daje wartość operacyjną przy niskim ryzyku regresji.

**20.3+ (kandydat):** League Ecosystem · Alerts v2 (webhook/email) · Scale P2 (materialized KPI).

---

## 7. Walidacja (checkpoint)

```bash
npm run typecheck
node scripts/validate-201a-platform-performance-p1.mjs
node scripts/validate-193b-saas-readiness-p0.mjs
node scripts/validate-192b-lifecycle-hardening.mjs
node scripts/validate-191a-club-attention-dashboard.mjs
node scripts/validate-190b-club-operations-registry.mjs
node scripts/validate-186b-platform-alerts.mjs
node scripts/validate-185b-health-v2.mjs
node scripts/validate-185c-sync-history.mjs
```

**Stan:** wszystkie **PASS** (2026-06-06, po deploy recovery).

---

## 8. Dokumenty sprintu 20.x

| Dokument | Opis |
|----------|------|
| [sprint-200a-platform-scale-review.md](./sprint-200a-platform-scale-review.md) | Audyt skali (read-only) |
| [sprint-201a-platform-performance-p1-implementation.md](./sprint-201a-platform-performance-p1-implementation.md) | Implementacja P1 |
| [sprint-201a-platform-performance-p1-validation.md](./sprint-201a-platform-performance-p1-validation.md) | Walidacja lokalna |
| [sprint-201a-finalization.md](./sprint-201a-finalization.md) | SQL hotfix + deploy + recovery |
| [sprint-201a-deploy-recovery-rca.md](./sprint-201a-deploy-recovery-rca.md) | RCA Vercel build |
| [project-handoff-20.1.md](./project-handoff-20.1.md) | Ten dokument |

---

## 9. Werdykt handoff

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy platforma jest gotowa do ~100 klubów? | **TAK (GO)** |
| Czy hotfixy SQL są na prod? | **TAK** (192b, 193b, 201a) |
| Czy Vercel deploy 20.1 jest LIVE? | **TAK** (`eb29e7a`) |
| Co dalej? | **Sprint 20.2 — Club Management** |
| Commity | `ed324b7` (20.1) + `eb29e7a` (deploy fix) · tag `pre-20-2-platform-roadmap` |
