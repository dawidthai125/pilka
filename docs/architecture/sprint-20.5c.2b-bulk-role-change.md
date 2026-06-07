# Sprint 20.5C.2B — Bulk Role Change

**Status:** PASS · **Production:** GO · **Deploy:** LIVE  
**Commit:** `8efa710` · **Baseline:** 20.5C.2A (`107f421`)  
**Scope:** bulk role change · single-row `changeMemberRole` refactored to shared core

---

## Architecture

```
member-bulk-eligibility.ts  → isExcludedFromBulkMemberMutation, role change eligibility
member-mutation.ts          → changeMembershipRoleById, runBulkMemberRoleMutation
actions.ts                  → bulkChangeMemberRoles, changeMemberRole (core reuse)
members-panel.tsx           → toolbar „Zmień rolę (N)”, dialog + select roli
```

`BulkMemberOperation`: `"suspend" | "reactivate" | "changeRole"`

---

## Owner Protection

Właściciel wykluczony ze **wszystkich** bulk mutacji (`isExcludedFromBulkMemberMutation`):

| Warstwa | Zachowanie |
|---------|------------|
| **Eligibility** | owner nie jest eligible |
| **Toolbar** | `Zmień rolę (N)` bez ownera |
| **Payload** | `getBulkRoleChangeTargetIds` — Variant A |
| **Server** | `skipped` + `OWNER_BULK_EXCLUSION_MESSAGE` |
| **UI** | hint przy zaznaczeniu ownera |

---

## No-op Skip

`member.role === targetRole` → `skipped`, reason: **„Rola bez zmian”** (nie liczone jako success).

---

## Smoke (`scripts/_smoke-205c2b-manual.mjs`)

Uruchamiać na **`next start`** lub produkcji (`SMOKE_BASE_URL=https://pilka-mu.vercel.app`).

**Po smoke mutacyjnym:** rollback ról seed (`sponsor`, `parent`, `coach`, `player`) — patrz reguła production-linked dev w handoff.

Testy kluczowe: bulk 2× coach, owner exclusion, same-role skip, single-row role, CSV, zaproszenia, runtime.

---

## Walidacja

```bash
npm run typecheck
node scripts/validate-205c2b-bulk-role-change.mjs
SMOKE_BASE_URL=http://localhost:3000 node scripts/_smoke-205c2b-manual.mjs
```

---

## Out of scope (20.5C.2B)

- ~~bulk remove~~ → **LIVE** 20.5C.2C (`3eac96f`)
- CSV import (→ 20.5C.3)
