# Platform — dokumentacja dla agentów AI

**Checkpoint:** **20.5B.4 PASS** · **Prod:** `b41d049` · **Branch:** `main` · **Deploy:** LIVE  
**URL:** https://pilka-mu.vercel.app

## Status produkcji (`b41d049`)

| Obszar | Status |
|--------|--------|
| Production | **PASS** |
| Club Management (`/members`) | **PASS** |
| Invitations | **PASS** |
| League Sync | **PASS** |
| Platform (18.5A→20.1, 20.3) | **PASS** |
| Navigation v2 | **PASS** |

**Następny sprint:** **20.5C.1 — CSV Export + Multi Select**

## Czytaj najpierw (kolejność)

| # | Plik | Opis |
|---|------|------|
| 1 | [project-handoff-current.md](./project-handoff-current.md) | **START HERE** — 20.5 LIVE, status modułów |
| 2 | [project-handoff-20.5-club-management.md](./project-handoff-20.5-club-management.md) | **Club Management** — pełny handoff 20.5A→20.5B.4 |
| 3 | [../../CHANGELOG.md](../../CHANGELOG.md) | Sprint 20.5A→20.5B.4 Completed |
| 4 | [../audit/club-management-post-release-20.5B.2.md](../audit/club-management-post-release-20.5B.2.md) | Audyt post-release Club Management |
| 5 | [../audit/club-management-20.5-audit.md](../audit/club-management-20.5-audit.md) | Baseline audyt 20.5 (pre-implementation) |
| 6 | [navigation-v2-proposal.md](./navigation-v2-proposal.md) | Propozycja / audyt nav 20.3A |
| 7 | [project-handoff-20.1.md](./project-handoff-20.1.md) | Pełny handoff Platform 18.5A→20.1 |
| 8 | [sprint-201a-deploy-recovery-rca.md](./sprint-201a-deploy-recovery-rca.md) | **P0:** `health-types.ts` — client vs server |

## Sprint 20.5 — Club Management (zamknięty)

| Etap | Commit | Walidator / smoke |
|------|--------|-------------------|
| 20.5A Members Foundation | `8b50069` | `validate-205a-members-management-foundation.mjs` |
| 20.5B Invitations & Roles | `bd3525b` | `validate-205b-invitations-and-roles.mjs` |
| 20.5B.3 Stabilization | `b41d049` | `validate-205b3-club-management-stabilization.mjs` |
| 20.5B.4 Release | `b41d049` | `_smoke-prod-205b3.mjs` — 8/8 PASS |

**Kluczowe trasy:** `/members` (Członkowie) · moduł `src/features/members/` · guard `src/lib/members/auth-invite-guard.ts`

## Kontekst szerszy (poza tym katalogiem)

| Plik | Opis |
|------|------|
| [../../AGENTS.md](../../AGENTS.md) | Wejście repo (root) |
| [../ai/README.md](../ai/README.md) | Dokumentacja produktu FC OS |
| [../ai/10-platform-admin-multi-club.md](../ai/10-platform-admin-multi-club.md) | Platform Admin multi-club |

## Archiwum sprintów

Historyczne raporty (implementation, validation, audit, sprint 17x–20.3):

**[../archive/](../archive/)** — m.in. `18-5-health/`, `18-6-alerts/`, `19-0-operations/`, `19-3-scale/`, `20-1-performance/`, `audit/`

Indeks cleanup: [../archive/20-2a-documentation-cleanup-report.md](../archive/20-2a-documentation-cleanup-report.md)
