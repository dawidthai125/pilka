# Sprint 20.5C.2A — Bulk Suspend + Bulk Reactivate

**Status:** implemented · stabilization pass (owner protection + semantics)  
**Baseline:** 20.5C.1 (`d644b5a`)  
**Scope:** bulk suspend, bulk reactivate · single-row actions unchanged

---

## Architecture

```
member-bulk-eligibility.ts  → eligible counts, owner exclusion, target IDs
member-mutation.ts          → single + bulk suspend/reactivate core
actions.ts                  → server action wrappers
members-panel.tsx           → toolbar, dialogs, result panel
```

`BulkMemberActionResult`: `{ total, succeeded, skipped, failed, items[] }`

---

## Owner Protection (P0)

Właściciel klubu (`role === "owner"`) jest **wykluczony** z operacji zbiorczych:

| Warstwa | Zachowanie |
|---------|------------|
| **Eligibility** | `isExcludedFromBulkMemberStatusChange` → owner nie jest eligible |
| **Toolbar** | Licznik `Zawieś (N)` / `Przywróć (N)` nie uwzględnia ownera |
| **Payload** | `getBulkSuspendTargetIds` / `getBulkReactivateTargetIds` — owner nigdy w `membershipIds` |
| **Server (defense in depth)** | `runBulkMemberStatusMutation` → `skipped` + `OWNER_BULK_EXCLUSION_MESSAGE` |
| **UI** | Przy zaznaczeniu ownera: *„Właściciel wykluczony z operacji zbiorczych”* |

**Single-row** Zawieś / Przywróć — bez zmian (20.5A regression).

---

## Partial Success — Variant A (P1)

Toolbar operuje **wyłącznie na eligible members**.

Przykład: zaznaczono **2** (1 active + 1 suspended):

| Pole | Wartość |
|------|---------|
| Wysłane `membershipIds` | 1 (tylko active eligible) |
| `total` | 1 |
| `succeeded` | 1 |
| `skipped` | 0 |
| `failed` | 0 |
| UI wynik | pełny sukces: „Zawieszono 1 członka.” (bez panelu partial) |

Partial success (amber + „Pokaż szczegóły”) występuje gdy **wśród wysłanych eligible** część się nie powiedzie (RBAC, DB error) — nie gdy zaznaczono nieeligible obok eligible.

---

## Smoke (`scripts/_smoke-205c2a-manual.mjs`)

Uruchamiać na **`next start`** (np. `SMOKE_BASE_URL=http://localhost:3003`).  
`next dev` + Fast Refresh może psuć `useActionState` dla bulk.

Testy kluczowe:

- **P0-owner-protection** — owner + 1 active → hint + `Zawieś (1)`
- **T3-eligible-only** — active + suspended → `total=1, succeeded=1, skipped=0`
- **T1/T2** — 2× non-owner bulk suspend/reactivate

---

## Walidacja

```bash
npm run typecheck
node scripts/validate-205c2a-bulk-suspend-reactivate.mjs
SMOKE_BASE_URL=http://localhost:3003 node scripts/_smoke-205c2a-manual.mjs
```

---

## Out of scope (20.5C.2A)

- bulk role change, bulk remove (→ 20.5C.2B)
- CSV import (→ 20.5C.3)
- bulk invite, Zaproszenia bulk
