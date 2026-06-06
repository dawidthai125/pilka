# Changelog

All notable changes to FC OS (pilka) are documented in this file.

## [post-20-5-club-management] — 2026-06-06

### Sprint 20.5B.4 — Release Verification

**Status:** PASS · **Production:** GO · **Deploy:** LIVE  
**Commit:** `b41d049` · **Branch:** `main`  
**URL:** https://pilka-mu.vercel.app

- Pre-release smoke `_smoke-205b3-stabilization.mjs` — GO
- Production smoke `_smoke-prod-205b3.mjs` — 8/8 PASS
- CI GitHub Actions (typecheck + build) — PASS
- Walidatory 18.5A–20.5B.3 — PASS (brak regresji 20.5A/20.5B)

### Sprint 20.5B.3 — Club Management Stabilization

**Commit:** `b41d049`

- **Existing user invite flow** — `delivery: login_required`, komunikaty PL, brak duplikacji Auth
- **Navigation** — etykieta sidebar **Członkowie** (URL `/members` bez zmian)
- **Invitations UX** — filtry statusów, sekcje Pending/Expired/Accepted/Revoked, liczniki „Wymaga działania”
- **Auth hardening** — `auth-invite-guard.ts` (rate limit 25/h, retry, `inviteUserByEmailWithGuard`)
- **Members dashboard** — karty KPI, formularz zaproszenia na obu zakładkach
- Walidator: `validate-205b3-club-management-stabilization.mjs`
- Audyt post-release: `docs/audit/club-management-post-release-20.5B.2.md`

### Sprint 20.5B — Invitations & Roles

**Status:** PASS · **Commit:** `bd3525b`

- Tab **Zaproszenia** — pending / accepted / expired / revoked
- Formularz **Zaproś członka** (email, rola; owner wykluczony)
- Server actions: `inviteMember`, `resendInvite`, `revokeInvite`
- `invite-service.ts`, `invitation-utils.ts` (client-safe split)
- Liczniki dashboardu, RBAC guards (`canInviteMembers`, `canInviteClubRole`)
- Walidator: `validate-205b-invitations-and-roles.mjs`
- Smoke: `_smoke-205b1-invitations.mjs`, `_smoke-prod-205b1.mjs`

### Sprint 20.5A — Members Management Foundation

**Status:** PASS · **Commit:** `8b50069`

- Moduł `src/features/members/` — dashboard, panel członków, akcje wiersza
- Server actions: `changeMemberRole`, `suspendMember`, `reactivateMember`, `removeMember`
- Hook **invited → active** (`activate-invited-memberships.ts` — callback, sign-in, dashboard)
- RBAC guards: `canManageMemberTarget`, leadership-only manage
- Walidator: `validate-205a-members-management-foundation.mjs`
- Smoke: `_smoke-205a1-members.mjs`, `_smoke-prod-205a1.mjs`

### Sprint 20.5B.5 — Handoff & Documentation

- `docs/architecture/project-handoff-20.5-club-management.md` — pełny handoff 20.5
- Zaktualizowano: `project-handoff-current.md`, `AGENTS.md`, `docs/ai/README.md`, `03-routing-map.md`, `05-dashboard-modules.md`, `08-scripts-env-deploy.md`, `09-agent-rules.md`

### Validation (release gate 20.5)

- `npm run typecheck` — PASS
- `npm run build` — PASS
- Walidatory 18.5A–20.5B.3 — PASS
- Production smoke 20.5B.3 — PASS (`b41d049` live on Vercel)

---

## [post-20-3-navigation-ux] — 2026-06-06

### Sprint 20.3 Completed

**Status:** PASS · **Production:** GO  
**Commit:** `af3a485` · **Tag:** `post-20-3-navigation-ux`  
**URL:** https://pilka-mu.vercel.app

#### 20.3B — Club Navigation v2

- Grouped club panel sidebar: Pulpit · Sport · Rozgrywki · Klub · Narzędzia · Administracja (collapsed by default).
- Label fixes: Kadra, CRM, Sprzęt, Mój magazyn, Asystent AI, Role.
- Single AI sidebar entry with hub sub-nav (`/ai`, Manager, Zadania, Czat, Raporty).
- RBAC filter extracted to `src/lib/navigation/filter-dashboard-nav.ts`.
- Validators: `validate-203b-club-navigation-v2.mjs`, `validate-203b-rbac-runtime.ts`.

#### 20.3C — Platform UX Cleanup

- Platform dashboard: **Wymaga dzisiaj** → **Stan platformy** → **Monitoring i operacje**.
- Shared lifecycle actions (`ClubLifecycleActionBar`) on registry and club detail.
- Platform discoverability: **Platforma** CTA in club header; grouped platform shell nav.
- Validator: `validate-203c-platform-ux.mjs`.

#### 20.3C.1 — UX Stabilization

- Fix duplicate React keys in `PublicAcademySection` (academy images: dedupe + `id → slotKey → index`).
- `PublicAcademyMediaImage.id` propagated from `buildPublicWebsiteMediaBundle`.

#### 20.3C.2 — Release Gate Cleanup

- `validate-193b-saas-readiness-p0.mjs`: assert `REGISTRY_PAGE_SIZE_OPTIONS` / `REGISTRY_DEFAULT_PAGE_SIZE` (no literal `"25"` drift).
- Documentation links: navigation audit docs → `docs/archive/audit/`; doc-link gate PASS.

### Validation (release gate)

- `npm run typecheck` — PASS
- Validators 18.5A–20.3C — PASS (13/13 + typecheck)
- Production smoke — GO (`af3a485` live on Vercel)
