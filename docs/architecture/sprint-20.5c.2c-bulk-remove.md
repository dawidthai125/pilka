# Sprint 20.5C.2C — Bulk Remove

**Status:** PASS · **Production:** GO · **Deploy:** LIVE  
**Feature commit:** `3eac96f` · **Docs commit (release):** `d35e18f` · **Baseline:** 20.5C.2B (`8efa710`)  
**Scope:** bulk remove · single-row `removeMember` refactored to shared core · **ostatnia operacja bulk w module Członkowie (20.5C)**

---

## Architecture

```
member-bulk-eligibility.ts  → isEligibleForBulkRemove, getBulkRemoveTargetIds
member-mutation.ts          → removeMembershipById, runBulkMemberRemoveMutation
actions.ts                  → bulkRemoveMembers, removeMember (core reuse)
members-panel.tsx           → toolbar „Usuń (N)”, danger dialog + checkbox
bulk-member-types.ts        → operation "remove", summary „Usunięto…”
```

`BulkMemberOperation`: `"suspend" | "reactivate" | "changeRole" | "remove"`

### Wzorzec (jak 2A / 2B)

| Reguła | Implementacja |
|--------|----------------|
| **Variant A** | Payload tylko eligible IDs (`getBulkRemoveTargetIds`) |
| **Owner P0** | `isExcludedFromBulkMemberMutation` — owner nigdy w bulk |
| **Uprawnienia** | `canManageMemberTarget(actorRoles, targetRole)` — single + bulk |
| **Partial success** | `BulkMemberActionResult` per-item (`success` / `skipped` / `failed`) |
| **RLS** | Istniejąca polityka `memberships_delete_leadership` (bez migracji) |

---

## Owner Protection

| Warstwa | Zachowanie |
|---------|------------|
| **Eligibility** | owner nie jest eligible |
| **Toolbar** | `Usuń (N)` bez ownera w N |
| **Payload** | owner ID nie trafia do `membershipIds` |
| **Server** | `skipped` + `OWNER_BULK_EXCLUSION_MESSAGE` gdy wymuszone w bulk |
| **UI** | hint „Właściciel wykluczony z operacji zbiorczych” |

---

## Danger Dialog (bulk only)

- Tytuł: **UWAGA**
- Copy: profil użytkownika pozostaje · operacja nieodwracalna
- Checkbox: **„Rozumiem, że operacja jest nieodwracalna”** — submit zablokowany bez zaznaczenia
- Single-row `removeMember` — **bez checkboxa** (kontrakt UI bez zmian)

---

## Self-remove audit (zachowanie zachowane)

| Scenariusz | Single-row | Bulk |
|------------|------------|------|
| Prezydent usuwa siebie | Dozwolone (`canManageMemberTarget`) | Dozwolone (ten sam guard) |
| Owner usuwa siebie | Dozwolone (single) | **Zablokowane** (owner excluded from bulk) |
| Prezydent usuwa ownera | Zablokowane | owner nie w payload |

Brak porównania `actor.user_id === membership.user_id` — zgodnie z 20.5A.

---

## Walidacja

```bash
npm run typecheck
npm run build
node scripts/validate-205a-members-management-foundation.mjs
node scripts/validate-205c1-members-export-multiselect.mjs
node scripts/validate-205c2a-bulk-suspend-reactivate.mjs
node scripts/validate-205c2b-bulk-role-change.mjs
node scripts/validate-205c2c-bulk-remove.mjs
```

---

## Smoke

### Lokalnie (dev smoke przed release)

```bash
npm run build
npm run start
# OSOBNY terminal — WAŻNE: wymuś localhost (patrz pułapki poniżej)
SMOKE_BASE_URL=http://localhost:3000 node scripts/_smoke-205c2c-manual.mjs
```

Skrypt: `scripts/_smoke-205c2c-manual.mjs`  
Testy: bulk remove 2×, owner exclusion, checkbox gate, single-row remove, CSV, zaproszenia, runtime.

### Produkcja (post-deploy)

```bash
node scripts/_snapshot-piorun-members.mjs
SMOKE_BASE_URL=https://pilka-mu.vercel.app node scripts/_smoke-205c2a-manual.mjs
SMOKE_BASE_URL=https://pilka-mu.vercel.app node scripts/_smoke-205c2b-manual.mjs
SMOKE_BASE_URL=https://pilka-mu.vercel.app node scripts/_smoke-205c2c-manual.mjs
node scripts/_rollback-205c2c-memberships.mjs
node scripts/_rollback-205c2b-roles.mjs
node scripts/_snapshot-piorun-members.mjs   # oczekiwane: COUNT 7
```

**Login smoke:** `wlasciciel@piorun.test` · hasło z `SETUP_TEST_PASSWORD` w `.env.local`

---

## Rollback (Piorun — klub referencyjny)

| Skrypt | Kiedy |
|--------|-------|
| `scripts/_snapshot-piorun-members.mjs` | Przed i po smoke mutacyjnym |
| `scripts/_rollback-205c2c-memberships.mjs` | Po bulk remove (INSERT brakujących `club_memberships`) |
| `scripts/_rollback-205c2b-roles.mjs` | Po bulk role change smoke |

`club_id`: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`  
Seed: sponsor, rodzic, trener, zawodnik, prezes, dyrektor (+ owner zawsze obecny).

---

## Pułapki (dla agentów AI)

| Problem | Przyczyna | Rozwiązanie |
|---------|-----------|-------------|
| Smoke bulk bez przycisku „Usuń” | `.env.local` ma `SMOKE_BASE_URL` → prod bez deployu 2C | `SMOKE_BASE_URL=http://localhost:3000` lokalnie |
| Stary bundle na `:3000` | Zombie `next start` / stary `.next` | Kill port 3000, `npm run build`, fresh `npm run start` |
| `useActionState` niestabilne | `next dev` | Smoke bulk tylko na `next start` |
| PWA / SW cache | Serwist cache | Playwright: `serviceWorkers: "block"` (w smoke 2C) |
| Mutacja prod DB | `.env.local` → prod Supabase | Zawsze rollback po smoke |

---

## Release (2026-06-07)

| Faza | Wynik |
|------|-------|
| Commit feature | `3eac96f` |
| CI | PASS (#27090239243) |
| Prod smoke 2A+2B+2C | GO |
| Rollback Piorun | COUNT 7 |

---

## Out of scope (20.5C.2C)

- CSV import → **20.5C.3** (następny sprint)
- Bulk invite
- Undo / soft-delete membership
