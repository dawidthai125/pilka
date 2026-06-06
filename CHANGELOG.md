# Changelog

All notable changes to FC OS (pilka) are documented in this file.

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
