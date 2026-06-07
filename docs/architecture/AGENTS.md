# Platform — dokumentacja dla agentów AI

**Checkpoint:** **20.5C.2C PASS** · **Prod feature:** `3eac96f` · **Branch:** `main` · **Deploy:** LIVE  
**URL:** https://pilka-mu.vercel.app

## Status produkcji (`3eac96f`)

| Obszar | Status |
|--------|--------|
| Production | **PASS** |
| Club Management (`/members`) | **PASS** — CRUD + bulk remove/role/suspend/reactivate + CSV |
| Invitations | **PASS** |
| League Sync | **PASS** |
| Platform (18.5A→20.1, 20.3) | **PASS** |
| Navigation v2 | **PASS** |

**Następny sprint Club Management:** **20.5C.3 — CSV import**

## Czytaj najpierw (kolejność)

| # | Plik | Opis |
|---|------|------|
| 1 | [project-handoff-current.md](./project-handoff-current.md) | **START HERE** — prod commit, moduły, sprint 20.5 |
| 2 | [project-handoff-20.5-club-management.md](./project-handoff-20.5-club-management.md) | **Club Management** — pełny handoff 20.5A→20.5C.2C |
| 3 | [sprint-20.5c.2c-bulk-remove.md](./sprint-20.5c.2c-bulk-remove.md) | Ostatni bulk (2C) — smoke, rollback, pułapki |
| 4 | [../../CHANGELOG.md](../../CHANGELOG.md) | `[post-20-5c2c-bulk-remove]` |
| 5 | [../audit/club-management-post-release-20.5B.2.md](../audit/club-management-post-release-20.5B.2.md) | Audyt post-release + backlog P1–P3 |
| 6 | [project-handoff-20.1.md](./project-handoff-20.1.md) | Platform 18.5A→20.1 |
| 7 | [sprint-201a-deploy-recovery-rca.md](./sprint-201a-deploy-recovery-rca.md) | **P0:** `health-types.ts` client vs server |

## Sprint 20.5C — Bulk (zamknięty)

| Etap | Commit | Walidator | Smoke |
|------|--------|-----------|-------|
| 20.5C.1 CSV export | `d644b5a` | `validate-205c1-*` | — |
| 20.5C.2A suspend/reactivate | `107f421` | `validate-205c2a-*` | `_smoke-205c2a-manual.mjs` |
| 20.5C.2B role change | `8efa710` | `validate-205c2b-*` | `_smoke-205c2b-manual.mjs` |
| **20.5C.2C remove** | **`3eac96f`** | **`validate-205c2c-*`** | **`_smoke-205c2c-manual.mjs`** |

**Kluczowe trasy:** `/members` · `src/features/members/` · core `src/lib/members/member-mutation.ts`

## Production-linked dev (obowiązkowe)

- `.env.local` → Supabase prod `pwkqnwqvrdiaycveacxa`
- Smoke mutacyjny → rollback: `_rollback-205c2c-memberships.mjs`, `_rollback-205c2b-roles.mjs`
- Lokalny smoke bulk → `SMOKE_BASE_URL=http://localhost:3000` + `next start`

## Kontekst szerszy

| Plik | Opis |
|------|------|
| [../../AGENTS.md](../../AGENTS.md) | Wejście repo (root) |
| [../ai/README.md](../ai/README.md) | Dokumentacja produktu FC OS |

## Archiwum

**[../archive/](../archive/)** — sprinty historyczne, audyty PRE 18.5+
