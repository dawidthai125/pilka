# PROJECT HANDOFF — Sprint 20.5 Club Management

**Klub referencyjny:** Piorun Wawrzeńczyce  
**Repozytorium:** `dawidthai125/pilka`  
**Dokument:** 2026-06-07 · handoff po zamknięciu 20.5A → 20.5C.2C  
**Produkcja:** https://pilka-mu.vercel.app  
**Production commit:** `3eac96f` · **Branch:** `main` · **Status:** PASS · **Deploy:** LIVE

---

## 0. START HERE (Club Management)

| Pole | Wartość |
|------|---------|
| **Moduł** | `/members` — **Członkowie** (nav v2, Administracja) |
| **Stan** | **PASS** — Club Management + Invitations LIVE |
| **Dojrzałość modułu** | ~78% (audyt 20.5B.2); score 6.6/10 |
| **Następny sprint** | **20.5C.3** CSV import |
| **Nie implementuj ponownie** | 20.5A foundation, 20.5B invitations, 20.5B.3 stabilization, **20.5C.1 export**, **20.5C.2A bulk suspend/reactivate**, **20.5C.2B bulk role change**, **20.5C.2C bulk remove** |

**Skrót globalny:** [`project-handoff-current.md`](./project-handoff-current.md)  
**Changelog:** [`CHANGELOG.md`](../../CHANGELOG.md) — sekcja `[post-20-5c2c-bulk-remove]`

### Production-linked development

- `.env.local` korzysta z **produkcyjnego Supabase** (`pwkqnwqvrdiaycveacxa`)
- Smoke mutacyjny (localhost lub prod URL) **wymaga rollbacku** ról/statusów seed lub izolowanego klubu testowego
- Rollback referencyjny: `scripts/_rollback-205c2c-memberships.mjs`, `scripts/_rollback-205c2b-roles.mjs` (Piorun seed)

---

## 1. Timeline sprintów

| Sprint | Commit | Status | Zakres |
|--------|--------|--------|--------|
| **20.5A** Members Foundation | `8b50069` | PASS | Members v2 UI, CRUD server actions, `invited→active`, RBAC guards |
| **20.5B** Invitations & Roles | `bd3525b` | PASS | Formularz zaproszenia, tab Zaproszenia, resend/revoke, liczniki |
| **20.5B.1** Release | `bd3525b` | PASS | Smoke prod, fix client/server split (`invitation-utils.ts`) |
| **20.5B.2** Post-Release Audit | — | PASS | [`club-management-post-release-20.5B.2.md`](../audit/club-management-post-release-20.5B.2.md) |
| **20.5B.3** Stabilization | `b41d049` | PASS | Existing user flow, nav Członkowie, filtry zaproszeń, auth guard |
| **20.5B.4** Release Verification | `b41d049` | PASS | Smoke 8/8, CI PASS, prod LIVE |
| **20.5B.5** Handoff Update | — | docs | CHANGELOG, handoff, AGENTS.md |
| **20.5C.1** CSV Export + Multi Select | `d644b5a` | PASS | Checkbox multi-select, eksport CSV członków (client-side) |
| **20.5C.2A** Bulk Suspend + Reactivate | `107f421` | PASS | Bulk Zawieś/Przywróć, owner protection, eligible-only semantics |
| **20.5C.2B** Bulk Role Change | `8efa710` | PASS | Bulk Zmień rolę, no-op skip, `changeMembershipRoleById` core |
| **20.5C.2C** Bulk Remove | `3eac96f` | PASS | Bulk Usuń, danger dialog + checkbox, `removeMembershipById` core |

---

## 2. Co zostało zbudowane

### 2.1 Route `/members`

- **Page:** `src/app/(dashboard)/members/page.tsx`
- **Dashboard:** `MembersDashboard` — zakładki Członkowie / Zaproszenia
- **KPI:** aktywni, zawieszeni, oczekujące, wymaga działania
- **Macierz RBAC:** read-only (osobna karta pod dashboardem)

### 2.2 Server actions (`src/features/members/actions.ts`)

| Action | Uprawnienie | Opis |
|--------|-------------|------|
| `changeMemberRole` | leadership + `member:manage` | Zmiana roli (via `changeMembershipRoleById`) |
| `bulkChangeMemberRoles` | leadership | Bulk zmiana roli (Variant A, owner excluded) |
| `bulkRemoveMembers` | leadership | Bulk usunięcie (Variant A, danger dialog + checkbox) |
| `bulkSuspendMembers` | leadership | Bulk zawieszenie |
| `bulkReactivateMembers` | leadership | Bulk przywrócenie |
| `suspendMember` | leadership | Zawieszenie aktywnego |
| `reactivateMember` | leadership | Przywrócenie zawieszonego |
| `removeMember` | leadership | DELETE membership (via `removeMembershipById`) |
| `inviteMember` | leadership + invite | Nowy lub istniejący użytkownik |
| `resendInvite` | leadership | Email lub login_required |
| `revokeInvite` | leadership | status → `archived` |

### 2.3 Invite flow

```
Leadership: formularz Zaproś członka
    ↓
Nowy email → inviteUserByEmailWithGuard → membership invited
Istniejący profil → membership invited (delivery: login_required, brak maila)
    ↓
Zaproszenia: Pending / Expired / Accepted / Revoked (filtry + sekcje)
    ↓
Użytkownik: email link LUB logowanie (existing user)
    ↓
activateInvitedMemberships() → status active
    ↓
Członkowie: wiersz w tabeli (active/suspended)
```

**Pliki kluczowe:**

- `src/lib/members/invite-service.ts` — invite / resend / revoke
- `src/lib/members/auth-invite-guard.ts` — rate limit 25/h, retry 3×, guarded Auth
- `src/lib/members/invitation-utils.ts` — statusy (client-safe)
- `src/lib/members/invitations.ts` — `getClubInvitations` (server)
- `src/lib/members/activate-invited-memberships.ts` — hook po logowaniu
- `src/lib/members/guards.ts` — `canInviteMembers`, `canManageMemberTarget`

### 2.4 Bulk operations — shared core (20.5C.2A → 2C)

**Wszystkie bulk operacje na `/members` są LIVE.** Nie reimplementuj.

| Operacja | Toolbar | Core |
|----------|---------|------|
| Zawieś | `Zawieś (N)` | `suspendMembershipById`, `runBulkMemberStatusMutation` |
| Przywróć | `Przywróć (N)` | `reactivateMembershipById`, `runBulkMemberStatusMutation` |
| Zmień rolę | `Zmień rolę (N)` | `changeMembershipRoleById`, `runBulkMemberRoleMutation` |
| Usuń | `Usuń (N)` | `removeMembershipById`, `runBulkMemberRemoveMutation` |

Pliki: `member-mutation.ts`, `member-bulk-eligibility.ts`, `bulk-member-types.ts`, `members-panel.tsx`  
Sprint docs: [`2A`](./sprint-20.5c.2a-bulk-suspend-reactivate.md) · [`2B`](./sprint-20.5c.2b-bulk-role-change.md) · [`2C`](./sprint-20.5c.2c-bulk-remove.md)

### 2.5 Status zaproszeń (bez migracji DB)

| UI | Warunek |
|----|---------|
| Oczekujące | `invited` + &lt; 7 dni od `updated_at` |
| Wygasłe | `invited` + ≥ 7 dni |
| Anulowane | `archived` |
| Zaakceptowane | `active` + heurystyka `updated_at > created_at + 60s` |

### 2.6 RBAC (aplikacja)

| Rola | Invite | Manage | Lista |
|------|--------|--------|-------|
| owner | ✅ | ✅ | ✅ |
| president | ✅ | ✅ | ✅ |
| sports_director | ✅ | ✅ | ✅ |
| coach | ❌ | ❌ | read-only (RLS: własny wiersz) |
| treasurer | ❌ | ❌ | `member:read` app, RLS gap |

---

## 3. Walidacja i smoke

### Walidatory (release gate Club Management — uruchom wszystkie przed release 20.5C+)

```bash
npm run typecheck
npm run build
node scripts/validate-205a-members-management-foundation.mjs
node scripts/validate-205b-invitations-and-roles.mjs
node scripts/validate-205b3-club-management-stabilization.mjs
node scripts/validate-205c1-members-export-multiselect.mjs
node scripts/validate-205c2a-bulk-suspend-reactivate.mjs
node scripts/validate-205c2b-bulk-role-change.mjs
node scripts/validate-205c2c-bulk-remove.mjs
```

### Smoke manualne (Playwright — wymaga `devDependencies` / `playwright`)

| Skrypt | Sprint | Mutuje DB? |
|--------|--------|------------|
| `_smoke-205c2a-manual.mjs` | Bulk suspend/reactivate | tak (status) |
| `_smoke-205c2b-manual.mjs` | Bulk role change | tak (role) |
| `_smoke-205c2c-manual.mjs` | Bulk remove | tak (DELETE membership) |

**Runtime:** zawsze `npm run build && npm run start` — **nie** `next dev` (bulk `useActionState`).

**SMOKE_BASE_URL — KRYTYCZNE dla agentów AI:**

| Cel | Wartość |
|-----|---------|
| Lokalny smoke (nowy kod) | `http://localhost:3000` |
| Prod smoke (post-deploy) | `https://pilka-mu.vercel.app` |

`.env.local` często ustawia prod URL — bez override lokalny smoke trafia na **stary deploy** bez nowej funkcji.

```bash
# Przykład prod (pełna regresja po 20.5C.2C release)
node scripts/_snapshot-piorun-members.mjs
SMOKE_BASE_URL=https://pilka-mu.vercel.app node scripts/_smoke-205c2a-manual.mjs
SMOKE_BASE_URL=https://pilka-mu.vercel.app node scripts/_smoke-205c2b-manual.mjs
SMOKE_BASE_URL=https://pilka-mu.vercel.app node scripts/_smoke-205c2c-manual.mjs
node scripts/_rollback-205c2c-memberships.mjs
node scripts/_rollback-205c2b-roles.mjs
node scripts/_snapshot-piorun-members.mjs
```

### Rollback Piorun (prod-linked Supabase)

| Skrypt | Opis |
|--------|------|
| `_snapshot-piorun-members.mjs` | Snapshot `club_memberships` (COUNT + email/role) |
| `_rollback-205c2c-memberships.mjs` | Przywraca usunięte membership po bulk remove |
| `_rollback-205c2b-roles.mjs` | Przywraca seed role po bulk role smoke |

**Klub testowy:** Piorun Wawrzeńczyce · `club_id = a1b2c3d4-e5f6-7890-abcd-ef1234567890`  
**Owner smoke:** `wlasciciel@piorun.test` · `SETUP_TEST_PASSWORD` w `.env.local`

### Release gate (20.5C.2C — ostatni PASS)

- Feature: `3eac96f` · CI #27090239243 — PASS
- Prod smoke 2A + 2B + 2C — GO
- Post-smoke rollback — COUNT 7

---

## 4. Otwarty backlog (po 20.5C.1)

| Priorytet | Temat | Uwagi |
|-----------|-------|-------|
| P1 | RLS SELECT — coach/treasurer vs `member:read` | App vs DB niespójność |
| P2 | Filtry/wyszukiwarka członków, kolumna Drużyna | Dane w `getClubMembers`, brak w UI |
| P2 | Heurystyka Accepted bez `accepted_at` | Opcjonalna migracja |
| — | ~~**20.5C.1** CSV Export + multi-select~~ | ✅ **LIVE** `d644b5a` |
| — | ~~**20.5C.2A** bulk suspend/reactivate~~ | ✅ **LIVE** `107f421` |
| — | ~~**20.5C.2B** bulk role change~~ | ✅ **LIVE** `8efa710` |
| — | ~~**20.5C.2C** bulk remove~~ | ✅ **LIVE** `3eac96f` |
| — | **20.5C.3** CSV import | Backlog |

Szczegóły: audyt 20.5B.2 § Backlog Cleanup.

---

## 5. Reguły dla agentów

1. **Nie** reimplementuj 20.5A–20.5C.2C — moduł bulk jest **kompletny** (2C = ostatnia operacja bulk).
2. **Nie** dodawaj bulk invite bez `auth-invite-guard.ts` throttling.
3. Komponenty klienckie **nie** importują `src/lib/members/invitations.ts` (server) — używaj `invitation-utils.ts`.
4. Owner **nie** jest w `INVITABLE_CLUB_ROLES` ani w bulk payload.
5. Commit/push/deploy — tylko na prośbę użytkownika.
6. Smoke mutacyjny na prod-linked DB → **zawsze rollback** (patrz §3).
7. Następny sprint Club Management: **20.5C.3 CSV import** — czytaj handoff przed implementacją.

---

## 6. Referencje

| Dokument | Opis |
|----------|------|
| [`club-management-20.5-audit.md`](../audit/club-management-20.5-audit.md) | Baseline pre-implementation (~32%) |
| [`club-management-post-release-20.5B.2.md`](../audit/club-management-post-release-20.5B.2.md) | Audyt post-release + backlog P0–P3 |
| [`navigation-v2-proposal.md`](./navigation-v2-proposal.md) | Propozycja nav (Członkowie wdrożone w 20.5B.3) |
| [`sprint-20.5c.2a-bulk-suspend-reactivate.md`](./sprint-20.5c.2a-bulk-suspend-reactivate.md) | Sprint 2A — bulk suspend/reactivate |
| [`sprint-20.5c.2b-bulk-role-change.md`](./sprint-20.5c.2b-bulk-role-change.md) | Sprint 2B — bulk role change |
| [`sprint-20.5c.2c-bulk-remove.md`](./sprint-20.5c.2c-bulk-remove.md) | Sprint 2C — bulk remove (ostatni bulk) |
| [`docs/ai/05-dashboard-modules.md`](../ai/05-dashboard-modules.md) | Moduł w kontekście panelu |
