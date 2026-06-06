# PROJECT HANDOFF — Sprint 20.5 Club Management

**Klub referencyjny:** Piorun Wawrzeńczyce  
**Repozytorium:** `dawidthai125/pilka`  
**Dokument:** 2026-06-06 · handoff po zamknięciu 20.5A → 20.5C.2A  
**Produkcja:** https://pilka-mu.vercel.app  
**Production commit:** `107f421` · **Branch:** `main` · **Status:** PASS · **Deploy:** LIVE

---

## 0. START HERE (Club Management)

| Pole | Wartość |
|------|---------|
| **Moduł** | `/members` — **Członkowie** (nav v2, Administracja) |
| **Stan** | **PASS** — Club Management + Invitations LIVE |
| **Dojrzałość modułu** | ~78% (audyt 20.5B.2); score 6.6/10 |
| **Następny sprint** | **20.5C.2B** bulk role/remove · **20.5C.3** CSV import |
| **Nie implementuj ponownie** | 20.5A foundation, 20.5B invitations, 20.5B.3 stabilization, **20.5C.1 export**, **20.5C.2A bulk suspend/reactivate** |

**Skrót globalny:** [`project-handoff-current.md`](./project-handoff-current.md)  
**Changelog:** [`CHANGELOG.md`](../../CHANGELOG.md) — sekcja `[post-20-5c2a-bulk-suspend-reactivate]`

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
| `changeMemberRole` | leadership + `member:manage` | Zmiana roli (owner chroniony) |
| `suspendMember` | leadership | Zawieszenie aktywnego |
| `reactivateMember` | leadership | Przywrócenie zawieszonego |
| `removeMember` | leadership | DELETE membership |
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

### 2.4 Status zaproszeń (bez migracji DB)

| UI | Warunek |
|----|---------|
| Oczekujące | `invited` + &lt; 7 dni od `updated_at` |
| Wygasłe | `invited` + ≥ 7 dni |
| Anulowane | `archived` |
| Zaakceptowane | `active` + heurystyka `updated_at > created_at + 60s` |

### 2.5 RBAC (aplikacja)

| Rola | Invite | Manage | Lista |
|------|--------|--------|-------|
| owner | ✅ | ✅ | ✅ |
| president | ✅ | ✅ | ✅ |
| sports_director | ✅ | ✅ | ✅ |
| coach | ❌ | ❌ | read-only (RLS: własny wiersz) |
| treasurer | ❌ | ❌ | `member:read` app, RLS gap |

---

## 3. Walidacja i smoke

### Walidatory

```bash
node scripts/validate-205a-members-management-foundation.mjs
node scripts/validate-205b-invitations-and-roles.mjs
node scripts/validate-205b3-club-management-stabilization.mjs
```

### Smoke

```bash
node scripts/_smoke-205b3-stabilization.mjs    # pre-release
node scripts/_smoke-prod-205b3.mjs             # post-deploy prod
```

### Release gate (20.5B.4)

- `npm run typecheck` — PASS
- `npm run build` — PASS
- Walidatory 18.5A–20.5B.3 — PASS (brak regresji)
- CI GitHub Actions run — PASS (`b41d049`)
- Prod smoke — 8/8 PASS

---

## 4. Otwarty backlog (po 20.5C.1)

| Priorytet | Temat | Uwagi |
|-----------|-------|-------|
| P1 | RLS SELECT — coach/treasurer vs `member:read` | App vs DB niespójność |
| P2 | Filtry/wyszukiwarka członków, kolumna Drużyna | Dane w `getClubMembers`, brak w UI |
| P2 | Heurystyka Accepted bez `accepted_at` | Opcjonalna migracja |
| — | ~~**20.5C.1** CSV Export + multi-select~~ | ✅ **LIVE** `d644b5a` |
| — | ~~**20.5C.2A** bulk suspend/reactivate~~ | ✅ **LIVE** `107f421` |
| — | **20.5C.2B** bulk role/remove | Następny sprint |
| — | **20.5C.3** CSV import | Backlog |

Szczegóły: audyt 20.5B.2 § Backlog Cleanup.

---

## 5. Reguły dla agentów

1. **Nie** reimplementuj 20.5A/B — moduł jest LIVE.
2. **Nie** dodawaj bulk invite w 20.5C bez `auth-invite-guard.ts` throttling.
3. Komponenty klienckie **nie** importują `src/lib/members/invitations.ts` (server) — używaj `invitation-utils.ts`.
4. Owner **nie** jest w `INVITABLE_CLUB_ROLES`.
5. Commit/push/deploy — tylko na prośbę użytkownika.

---

## 6. Referencje

| Dokument | Opis |
|----------|------|
| [`club-management-20.5-audit.md`](../audit/club-management-20.5-audit.md) | Baseline pre-implementation (~32%) |
| [`club-management-post-release-20.5B.2.md`](../audit/club-management-post-release-20.5B.2.md) | Audyt post-release + backlog P0–P3 |
| [`navigation-v2-proposal.md`](./navigation-v2-proposal.md) | Propozycja nav (Członkowie wdrożone w 20.5B.3) |
| [`docs/ai/05-dashboard-modules.md`](../ai/05-dashboard-modules.md) | Moduł w kontekście panelu |
