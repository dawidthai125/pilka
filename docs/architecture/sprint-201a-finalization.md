# Sprint 20.1 — Finalizacja (SQL + deploy + recovery)

**Data:** 2026-06-06  
**Produkcja (Vercel):** `eb29e7a`  
**Tag checkpointu:** `pre-20-2-platform-roadmap` → `ed324b7` (20.1 bez deploy fix; prod = `eb29e7a`)

---

## 1. Hotfix SQL — `hotfix-201a-sync-jobs-retention.sql`

| Check | Status |
|-------|--------|
| Apply na Supabase FC OS | **PASS** |
| `platform_prune_league_sync_jobs` istnieje | **PASS** |
| Domyślny parametr **90 dni** | **PASS** |
| Smoke (TX + ROLLBACK, recent 90d niezmienione) | **PASS** |

**Ops:** okresowe `SELECT public.platform_prune_league_sync_jobs(90);` (pg_cron / cron zewnętrzny).

---

## 2. Deploy — pierwszy push (`ed324b7`)

| Check | Status |
|-------|--------|
| Vercel deploy uruchomiony | TAK |
| Build | **FAIL** (`net`/`tls` — `pg` w client bundle) |
| Prod po deploy | Nadal `4311404` |

---

## 3. Deploy Recovery (`eb29e7a`)

| Check | Status |
|-------|--------|
| Fix: `health-types.ts` + `club-operations-registry-types.ts` | wdrożony |
| `npm run build` lokalnie | **PASS** |
| Vercel build | **Ready** (~2 min) |
| GitHub deployment | **success** |
| Prod commit | **`eb29e7a`** |
| https://pilka-mu.vercel.app | **200** |
| `/platform/monitoring` | **200** |

**DEPLOY: PASS**

---

## 4. Walidatory (po recovery)

Wszystkie PASS: `typecheck`, `validate-201a`, `validate-193b`, `validate-192b`, `validate-191a`, `validate-190b`, `validate-186b`, `validate-185b`, `validate-185c`.

---

## 5. Powiązane dokumenty

| Dokument | Opis |
|----------|------|
| [sprint-201a-platform-performance-p1-implementation.md](./sprint-201a-platform-performance-p1-implementation.md) | P1 kod |
| [sprint-201a-platform-performance-p1-validation.md](./sprint-201a-platform-performance-p1-validation.md) | Walidacja lokalna |
| [sprint-201a-deploy-recovery-rca.md](./sprint-201a-deploy-recovery-rca.md) | RCA build Vercel |
| [project-handoff-20.1.md](./project-handoff-20.1.md) | Handoff dla agentów |
