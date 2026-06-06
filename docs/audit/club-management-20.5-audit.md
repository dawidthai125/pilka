# FC OS — Sprint 20.5 Club Management Audit

**Data:** 2026-06-06  
**Baseline produkcji:** `1c33a71` (Sprint 20.4C.4 — League Sync GO)  
**Metoda:** audyt statyczny kodu, schema DB, RBAC, RLS, nawigacja 20.3, porównanie z `feature-verification-20.4A.md`  
**Zakres:** Club Management — `/members`, zaproszenia, role, onboarding  
**Bez implementacji** — wyłącznie diagnoza i roadmapa.

---

## Executive summary

| Metryka | Wartość |
|---------|---------|
| **Poziom Club Management** | **~32%** |
| **Migracja DB wymagana (P0)** | **Nie** — core `club_memberships` + `profiles` + Supabase Auth wystarczą na 20.5A/20.5B |
| **Migracja DB zalecana (P1)** | Opcjonalna — metadane zaproszeń (`invited_at`, `invited_by`, `accepted_at`) |
| **GO dla Sprint 20.5A** | **TAK** — niskie ryzyko, backend RLS gotowy, brakuje UI + server actions |
| **Największa luka** | Brak jakichkolwiek akcji zarządzania członkami w panelu klubu (invite / role / remove) |

---

## Zadanie 1 — Audyt Members

### 1. Co już działa?

| Warstwa | Stan | Dowód |
|---------|------|-------|
| **Route `/members`** | Istnieje | `src/app/(dashboard)/members/page.tsx` |
| **Odczyt członków** | Działa | `getClubMembers()` → `club_memberships` + `profiles` + `teams` |
| **Macierz RBAC** | Działa | Tabela `ALL_PERMISSIONS` × `CLUB_ROLES` na stronie |
| **Własne role użytkownika** | Działa | Badge z `access.roles` |
| **Uprawnienia w kodzie** | Zdefiniowane | `member:read`, `member:manage`, `member:invite` w `permissions.ts` |
| **RLS memberships CRUD** | Działa (DB) | `memberships_insert/update/delete_leadership` + `actor_can_assign_role()` |
| **Platform: owner invite** | Działa | `club-bootstrap.ts` → `inviteUserByEmail` + `club_memberships` |
| **Platform: resend owner** | Działa | `resendOwnerInvite()` w `club-lifecycle.ts` + UI w `club-lifecycle-actions.tsx` |
| **Onboarding owner** | Częściowo | `computeClubOnboardingStatus()` śledzi `owner.status` |
| **Registry klubów** | Działa | `club-operations-registry.ts` — owner email/status per klub |
| **Aktywacja klubu** | Gate G1 | Wymaga `owner.status = active` przed aktywacją |

### 2. Co jest read-only?

| Element | Opis |
|---------|------|
| **Lista członków** | Wyświetla imię, email, drużynę, rolę, status — **bez akcji** |
| **Macierz uprawnień** | Dokumentacja statyczna — nie edytowalna (zamierzone) |
| **Cała strona `/members`** | Brak formularzy, przycisków, server actions klubowych |

### 3. Co jest niedokończone?

| Luka | Priorytet |
|------|-----------|
| Brak UI **Invite Member** w panelu klubu | P0 |
| Brak **Resend / Revoke Invite** (poza Platform owner) | P0 |
| Brak **Change Role** | P0 |
| Brak **Activate / Deactivate / Remove Member** | P0 |
| Brak sekcji **Zaproszenia** (pending / accepted / expired) | P1 |
| Brak automatycznego **invited → active** po akceptacji Auth | P0 |
| Brak `requireMemberManageAccess()` — tylko `requireMemberReadAccess()` | P1 |
| Brak modułu `src/features/members/` | P0 |
| Nav etykieta „Role” zamiast „Członkowie” | P2 |
| Treasurer ma `member:read` w RBAC, ale **RLS SELECT** nie obejmuje treasurer | P2 |
| Brak audytu akcji członkowskich (club-level) | P2 |

### 4. Jakie endpointy istnieją?

| Endpoint | Metoda | Auth | Zarządzanie członkami |
|----------|--------|------|---------------------|
| `/members` | SSR page | `member:read` | Tylko odczyt |
| **Brak** `/api/members/*` | — | — | — |
| Platform `/platform/clubs/[clubId]` | SSR + actions | Platform Admin | Owner lifecycle only |

**Server actions klubowe:** **0** — brak `members-actions.ts` lub równoważnego.

**Server actions platformowe (powiązane):**

- `resendOwnerInviteAction` — tylko owner, tylko Platform Admin
- `archiveClubAction` / `restoreClubAction` — lifecycle klubu, nie członków

### 5. Jakie akcje są ukryte lub niepodłączone?

| Akcja | Uprawnienie w RBAC | UI | Backend |
|-------|-------------------|-----|---------|
| Invite Member | `member:invite` (owner, president, sports_director) | ❌ | Częściowo (wzorzec w `club-bootstrap`) |
| Change Role | `member:manage` | ❌ | ✅ RLS UPDATE |
| Remove Member | `member:manage` | ❌ | ✅ RLS DELETE |
| Deactivate (suspended) | `member:manage` | ❌ | ✅ status enum |
| Resend Invite | — | ❌ (tylko Platform owner) | Częściowo |
| Revoke Invite | — | ❌ | DELETE membership możliwe |
| Bulk / CSV | — | ❌ | ❌ |

**Nawigacja:** `/members` w sekcji „Administracja” (`navigation.ts`) — **bez `audience`**, więc pozycja jest widoczna szeroko, ale dostęp do strony wymaga `member:read` (redirect do `/dashboard`).

---

## Zadanie 2 — Gap Analysis

Porównanie z typowym systemem klubowym (TeamSnap / SportEasy / klubowy CRM):

| Funkcja | FC OS dziś | Priorytet | Uwagi |
|---------|------------|-----------|-------|
| **Invite Member** | Platform owner only | **P0** | Wzorzec `inviteUserByEmail` istnieje |
| **Resend Invite** | Platform owner only | **P0** | Znane ograniczenia Supabase Auth (TD-11) |
| **Revoke Invite** | Brak | **P1** | DELETE membership + opcjonalnie usuń auth user |
| **Change Role** | RLS only | **P0** | `actor_can_assign_role` blokuje przypisanie `owner` |
| **Activate User** | Brak flow | **P0** | `invited` nie przechodzi auto na `active` |
| **Deactivate User** | Enum `suspended` | **P1** | Brak UI; `user_club_ids()` wyklucza non-active |
| **Remove Member** | RLS only | **P0** | Owner delete tylko przez owner; inne role przez president/SD |
| **Bulk Actions** | Brak | **P2** | Multi-select + batch status/role |
| **CSV Import** | Brak | **P2** | Wymaga walidacji + service role / edge function |
| **Zaproszenia — widok** | Brak | **P1** | Filtr `status = invited` na memberships |
| **Audit log akcji** | Platform only | **P2** | `club.settings.audit` lub nowa tabela |
| **Owner pending >7d** | Dashboard hint | **P1** | Backlog 20.2 — częściowo w Platform dashboard |

---

## Zadanie 3 — Data Model Verification

### Tabele istniejące

#### `club_memberships`

```sql
id, club_id, user_id, role, status, team_id, created_at, updated_at
UNIQUE (club_id, user_id, role)
```

| `membership_status` | `active`, `invited`, `suspended`, `archived` |
| `club_role` | `owner`, `president`, `sports_director`, `treasurer`, `coach`, `player`, `parent`, `sponsor`, `website_admin`, `scout` |

#### `profiles`

`id` (= auth.users), `email`, `full_name`, `avatar_url`, `phone`, `locale`

#### Zaproszenia

**Brak dedykowanej tabeli `club_invitations`.**  
Flow opiera się na:

1. `supabase.auth.admin.inviteUserByEmail()`
2. Wiersz `club_memberships` ze `status = invited`

### Czy model jest gotowy bez migracji?

| Operacja 20.5A/B | Gotowe bez migracji? |
|------------------|----------------------|
| Lista członków + filtry status | ✅ |
| Invite (email + role + team) | ✅ |
| Change role | ✅ |
| Suspend / archive status | ✅ |
| Remove membership | ✅ |
| Resend invite | ✅ (z ograniczeniami Auth) |
| Historia zaproszeń (sent_at, kto zaprosił) | ⚠️ Tylko `created_at` |
| Invite przed utworzeniem konta (email-only queue) | ⚠️ Auth tworzy user od razu |
| Expired invites | ⚠️ Brak `expires_at` — derived z Auth / heurystyka |

### Brakujące pola (zalecane P1, nie blokujące 20.5A)

| Pole | Tabela | Cel |
|------|--------|-----|
| `invited_at` | `club_memberships` | Raporty pending |
| `invited_by` | `club_memberships` | Audyt |
| `accepted_at` | `club_memberships` | SLA zaproszeń |
| `notes` | `club_memberships` | Opcjonalnie — kontekst roli |

**Werdykt migracji:** **Nie wymagana** na start 20.5A. Opcjonalna migracja w 20.5B dla metadanych zaproszeń.

---

## Zadanie 4 — RBAC Verification

### Kto ma uprawnienia w aplikacji (`permissions.ts`)

| Rola | `member:read` | `member:invite` | `member:manage` |
|------|---------------|-----------------|-----------------|
| **Owner** | ✅ | ✅ | ✅ |
| **President** | ✅ | ✅ | ✅ |
| **Sports Director** | ✅ | ✅ | ✅ |
| **Treasurer** | ✅ | ❌ | ❌ |
| **Coach** | ✅ | ❌ | ❌ |
| **Scout** | ❌ | ❌ | ❌ |
| **Website Admin** | ❌ | ❌ | ❌ |
| **Treasurer** | ✅ (app) | — | — |

### Kto ma uprawnienia w RLS (DB)

| Operacja | Dozwolone role |
|----------|----------------|
| **SELECT** memberships | Własny user; **owner, president, sports_director, coach** |
| **INSERT** | owner, president, sports_director + `actor_can_assign_role` |
| **UPDATE** | owner, president, sports_director + `actor_can_assign_role` |
| **DELETE** | **owner** (wszystkie role); president/SD (wszystkie oprócz owner) |

### `actor_can_assign_role` (DB guard)

- **Owner** — może przypisać dowolną rolę
- **President / Sports Director** — nie mogą przypisać `owner`
- Inne role — brak INSERT/UPDATE przez RLS

### Rekomendacja macierzy operacji (produkt)

| Akcja | Owner | President | Sports Director | Treasurer | Coach |
|-------|-------|-----------|-----------------|-----------|-------|
| Zapraszać | ✅ | ✅ | ✅ | ❌ | ❌ |
| Zmieniać rolę | ✅ | ✅ (nie → owner) | ✅ (nie → owner) | ❌ | ❌ |
| Usuwać członka | ✅ | ✅ (nie owner) | ✅ (nie owner) | ❌ | ❌ |
| Przeglądać listę | ✅ | ✅ | ✅ | ✅ | ✅ (read-only) |

**Coach:** zgodnie z RLS może **widzieć** listę, ale nie zarządzać — UI powinno ukryć akcje.

---

## Zadanie 5 — UX Proposal: Members v2

### Lokalizacja

- Route: `/members` (zachować — już w nav 20.3)
- Etykieta nav: **„Członkowie”** (zamiast „Role”)
- Sekcja: Administracja (zwinięta)

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Członkowie i role                    [+ Nowe zaproszenie] │
├─────────────────────────────────────────────────────────┤
│  [Członkowie] [Zaproszenia] [Macierz RBAC]              │
├─────────────────────────────────────────────────────────┤
```

#### Tab: Członkowie (aktywni)

- Tabela: Imię · Email · Rola · Drużyna · Status · Akcje
- Filtry: rola, status (`active`, `suspended`), drużyna, wyszukiwarka
- Akcje wiersza (tylko `member:manage`):
  - Zmień rolę (modal)
  - Zawieś / Aktywuj
  - Usuń (confirm)

#### Tab: Zaproszenia

| Podsekcja | Kryterium | Akcje |
|-----------|-----------|-------|
| **Oczekujące** | `status = invited` | Ponów · Anuluj |
| **Zaakceptowane** | `invited` → `active` (historia z `accepted_at` gdy migracja) | — |
| **Wygasłe** | heurystyka: invited + `created_at` > 7d | Ponów · Anuluj |

#### Tab: Macierz RBAC

- Obecna tabela (read-only) — bez zmian

#### Import (20.5C)

- Przycisk „Import CSV” w headerze
- Wizard: upload → preview → mapowanie kolumn → batch invite

### Stany puste

- Brak członków: CTA „Zaproś pierwszego członka”
- Brak pending: „Wszystkie zaproszenia zaakceptowane”

### Mobile

- Karty zamiast tabeli; akcje w menu ⋮

---

## Zadanie 6 — Roadmapa

### 20.5A — Members Management Foundation

| Zakres | Szczegóły |
|--------|-----------|
| Moduł `src/features/members/` | komponenty + server actions |
| Tab **Członkowie** | lista z filtrami, badge statusów |
| Akcje P0 | change role, suspend/activate, remove |
| `requireMemberManageAccess()` | guard + ukrywanie akcji |
| Hook **invited → active** | po pierwszym logowaniu / callback Auth |
| Service-layer invite | reuse wzorca `createAdminClient` + membership insert |
| Walidator `validate-205a-members-foundation.mjs` | |

| Ryzyko | Poziom | Mitigacja |
|--------|--------|-----------|
| Regresja RBAC | Średnie | Testy per rola; nie zmieniać RLS w 20.5A |
| Owner invite Auth limits | Średnie | Komunikaty jak w `resendOwnerInvite` |
| Brak migracji | Niskie | Użyć `created_at` jako proxy `invited_at` |

| Effort | **5–7 dni** (1 dev) |

---

### 20.5B — Invitations & Roles

| Zakres | Szczegóły |
|--------|-----------|
| Tab **Zaproszenia** | pending / accepted / expired |
| **Invite Member** form | email, rola, drużyna (opcjonalnie) |
| **Resend / Revoke** | klub-level (nie tylko Platform) |
| Migracja opcjonalna | `invited_at`, `invited_by`, `accepted_at` |
| Email template | Supabase invite template PL |
| Platform: stale invites >7d | sekcja na dashboard (backlog 20.2) |
| Treasurer RLS fix | dodać do SELECT policy lub świadomie wykluczyć z UI |

| Ryzyko | Poziom |
|--------|--------|
| Supabase Auth duplicate invite | Średnie |
| Migracja na prod | Niskie (additive columns) |

| Effort | **4–5 dni** |

---

### 20.5C — Bulk Actions & CSV

| Zakres | Szczegóły |
|--------|-----------|
| Multi-select + batch suspend/remove | |
| CSV import | email, role, team_slug |
| Raport błędów importu | |
| Export CSV członków | bonus |

| Ryzyko | Poziom |
|--------|--------|
| Rate limit Auth przy masowym invite | Wysokie |
| Duplikaty email | Średnie |

| Effort | **3–4 dni** |

---

## Mapa zależności (inwentaryzacja kodu)

```
/members (page.tsx) ──read──► getClubMembers() ──► club_memberships + profiles
                └──read──► permissions matrix (static)

Platform Admin ──► club-bootstrap.ts ──► inviteUserByEmail + membership
                └──► club-lifecycle.ts ──► resendOwnerInvite (owner only)
                └──► club-operations-registry.ts (owner email/status)

Brak połączenia: /members ──X──► jakiekolwiek server actions
Brak: src/features/members/*
Brak: /api/* member routes

RBAC app: permissions.ts (member:read|manage|invite)
RBAC DB:  actor_can_assign_role, memberships_*_leadership policies
```

### `spawnSync` / child_process

Nie dotyczy Club Management — brak powiązań.

---

## Podsumowanie końcowe

### 1. Aktualny poziom Club Management

**~32%**

| Składnik | Waga | % |
|----------|------|---|
| Odczyt + RBAC docs | 25% | 90% |
| DB / RLS gotowość | 25% | 85% |
| Platform owner lifecycle | 20% | 70% |
| Klubowy UI + akcje | 30% | **5%** |

### 2. Największe luki

1. **Zero akcji zarządzania** na `/members` (P0)
2. **Brak flow invited → active** po akceptacji zaproszenia (P0)
3. **Zaproszenia tylko z Platform Admin** — nie z panelu klubu (P0)
4. Brak widoku Zaproszeń i raportu pending (P1)

### 3. Czy wymagana jest migracja DB?

**Nie** na 20.5A.  
**Opcjonalnie** na 20.5B (metadane zaproszeń).  
Pełny Club Management **bez** nowych tabel jest możliwy.

### 4. Rekomendowana kolejność wdrożenia

1. **20.5A** — foundation: UI listy + akcje CRUD + invited→active hook
2. **20.5B** — zaproszenia: formularz invite, resend/revoke, tab Zaproszenia
3. **20.5C** — bulk + CSV (po stabilizacji Auth rate limits)

### 5. GO / NO-GO dla Sprint 20.5A

| | |
|---|---|
| **Werdykt** | **GO** |
| **Uzasadnienie** | RLS i enumy gotowe; wzorzec invite w Platform; niskie ryzyko regresji modułów sportowych; najwyższa wartość operacyjna przy minimalnym scope DB |
| **Warunki startu** | Baseline `1c33a71` PASS; nie ruszać League Sync; testy RBAC per rola w walidatorze |

---

## Referencje

- `docs/architecture/project-handoff-current.md`
- `docs/architecture/project-handoff-20.1.md` (§20.2 Club Management)
- `docs/audit/feature-verification-20.4A.md` — `/members` = PARTIAL
- `docs/architecture/navigation-v2-proposal.md` — backlog stale invites
- `src/app/(dashboard)/members/page.tsx`
- `src/config/permissions.ts`
- `supabase/migrations/20260531140000_security_hardening.sql`
