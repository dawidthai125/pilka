# Sprint 19.3B — Finalizacja (hotfix audit + smoke)

**Środowisko:** Supabase FC OS (`.env.local`)  
**Data:** 2026-06-05  
**Bez commita**

---

## Krok 1 — Hotfix SQL

```bash
scripts/sql/hotfix-193b-platform-audit-prune.sql
```

| Wynik | Status |
|-------|--------|
| `HOTFIX_APPLY` | **PASS** |

Zaktualizowane funkcje:

- `platform_prune_platform_audit(JSONB)` — nowa
- `platform_append_club_audit` — prune przy zapisie
- `platform_set_club_status` — prune przy audit + reguły 19.2B restore

---

## Krok 2 — Smoke audit pruning

Klub testowy: `pilot-club-test` (`1a9885d9-…`), audit przed testem: **7** wpisów.

| Test | Wynik |
|------|--------|
| RPC istnieją (`prune`, `append`, `set_club_status`) | **PASS** |
| `platform_prune_platform_audit(105 entries)` → długość **100** | **PASS** |
| 94× `platform_append_club_audit` w TX → **100** wpisów (cap) | **PASS** |
| +1 append `smoke_prune_final` → nadal **100**, ostatni = `smoke_prune_final` | **PASS** |
| `ROLLBACK` → audit wraca do **7** (brak regresji danych) | **PASS** |

**SMOKE_AUDIT_PRUNE: PASS**

---

## Raport końcowy

| Obszar | Wynik |
|--------|--------|
| **SQL hotfix 193b** | **PASS** |
| **Audit prune (RPC)** | **PASS** |
| **Regresja danych** | **PASS** (ROLLBACK) |
| **Production Readiness (P0-4)** | **GO** |

---

## Uwagi operacyjne

- Pruning działa na **zapisie** przez RPC (`platform_append_club_audit`, `platform_set_club_status`).
- Warstwa TS (`trimPlatformAuditEntries`) dodatkowo obcina przy odczycie i `createClub` bootstrap.
- Istniejące kluby z >100 wpisami w JSONB: odczyt obcięty do 100 w aplikacji; pełny prune w DB nastąpi przy **następnym** zapisie audit przez RPC.

---

## Powiązane dokumenty

- [sprint-193b-saas-readiness-p0-implementation.md](./sprint-193b-saas-readiness-p0-implementation.md)
- [sprint-193b-saas-readiness-p0-validation.md](./sprint-193b-saas-readiness-p0-validation.md)
- [sprint-193a-saas-readiness-audit.md](./sprint-193a-saas-readiness-audit.md)
