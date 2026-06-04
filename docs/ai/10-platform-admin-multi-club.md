# 10 — Platform Admin & Multi-Club (Sprint 18.x)

Dokument dla agentów AI: **operator platformy FC OS** (SaaS), osobny od panelu klubu (`/dashboard`).

---

## Kto jest kim

| Rola | Identyfikacja | Dostęp |
|------|---------------|--------|
| **Platform admin** | Email na liście `PLATFORM_ADMIN_EMAILS` | `/platform/*` |
| **Club owner / staff** | `club_memberships` + RBAC | `/{slug}` nie; panel `/dashboard` w kontekście klubu |
| **Public** | anon | `/{slug}/*` tylko `clubs.status = active` |

Platform admin **nie** jest w `club_memberships` jako rola platformy — tylko ENV.

---

## Architektura katalogów

```
src/app/(platform)/
  layout.tsx                    → requirePlatformAdmin()
  platform/
    page.tsx                    → Dashboard (18.4a)
    clubs/
      page.tsx                  → Lista + filtry status
      new/page.tsx              → Create Club wizard (18.2)
      [clubId]/page.tsx         → Onboarding grid + Activation card (18.4a)
      [clubId]/league/
        page.tsx                → League status panel (18.3)
        setup/page.tsx          → League Setup wizard (18.3)

src/lib/platform/
  admin.ts                      → PLATFORM_ADMIN_EMAILS, requirePlatformAdmin
  club-bootstrap.ts             → createClub() — INSERT, status=onboarding
  club-activation.ts            → gates + activateClub() (18.4a)
  club-db-writes.ts               → RPC wrappers (18.4a-db)
  dashboard.ts                  → loadPlatformDashboard (18.4a)
  league-setup.ts               → save/validate/activateLeagueSync
  league-config-validation.ts
  league-providers.ts           → mirror_live | manual_import
  onboarding-status.ts          → computed checklist (≠ clubs.status)
  audit.ts                      → platformAudit w clubs.settings
  slug.ts

src/features/platform/
  actions.ts                    → createClubAction, activateClubAction
  league-actions.ts             → league wizard actions
  components/                   → wizards, tables, dashboard, activation card
```

---

## Dwa modele „postępu” klubu

| Model | Gdzie | Co oznacza |
|-------|-------|------------|
| **`clubs.status`** | DB column | `onboarding` \| `active` \| `archived` — **blokuje public + cron** |
| **Onboarding checklist** | `computeClubOnboardingStatus()` | branding, website, league, owner, media — **tylko UI** |

**Aktywacja klubu (18.4a)** zmienia `clubs.status` na `active`. Checklist może być complete wcześniej, ale bez aktywacji public site = 404.

---

## `clubs.status = active` — gdzie ma znaczenie

| System | Plik / logika |
|--------|----------------|
| Public routing | `src/lib/tenant/public-club.ts` — `resolvePublicClubBySlug` |
| Homepage `/` | `src/middleware.ts` — 1 active → 301; 2+ → directory |
| Cron league | `scripts/lib/league-club-config.mjs` — tylko `active` |
| RPC public home | SQL `WHERE c.status = 'active'` |

---

## Zapis do chronionych kolumn `clubs` (18.4a-db)

Trigger `protect_club_columns` (security_hardening) blokuje bezpośredni UPDATE `status` / `settings` dla leadership API.

**Platform ops** muszą używać RPC (przez `connectServerDb`):

```sql
SELECT platform_append_club_audit($club_id, $entry_jsonb);
SELECT * FROM platform_set_club_status($club_id, 'active', $audit_jsonb);
```

TypeScript: `src/lib/platform/club-db-writes.ts`

**Nie** wracać do surowego `UPDATE clubs SET status=...` w kodzie platformy.

---

## ENV wymagane (Platform Admin)

| Zmienna | Użycie |
|---------|--------|
| `PLATFORM_ADMIN_EMAILS` | Allowlist operatora |
| `SUPABASE_DB_PASSWORD` | `connectServerDb()` — createClub, league save, activate |
| `NEXT_PUBLIC_SUPABASE_*` | Auth session |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client reads (onboarding list) |

---

## Flow operatora (bez SQL)

1. **Create Club** — `/platform/clubs/new` → `createClub()` → redirect detail
2. **League Setup** — wizard → save → validate → activate sync
3. **Activate Club** — karta na detail → `activateClubAction` gdy gate PASS
4. **Weryfikacja** — link public `/{slug}`, opcjonalnie live sync (mirror_live)

---

## League providers

| ID | Sync zewnętrzny | Cron |
|----|------------------|------|
| `mirror_live` | 90minut + RF + regiowyniki | Tak (06:00 UTC) jeśli active club |
| `manual_import` | Panel klubu import CSV/JSON | Nie |

---

## Multi-club public (18.1)

- `listActivePublicClubs()` — tylko `status = active`
- `/` — directory gdy ≥2 active
- Sitemap — `/` + wszystkie `/{slug}/...`

---

## Znane kluby na prod (stan 2026-06-04)

| slug | status | Uwagi |
|------|--------|-------|
| `piorun-wawrzenczyce` | active | Produkcja referencyjna |
| `pilot-club-test` | active | Klub testowy smoke 18.4a |
| `release-184a-*` | onboarding | Do usunięcia/archiwizacji |

---

## Powiązane dokumenty

- `docs/architecture/sprint-181-final-report.md` — routing
- `docs/architecture/sprint-182-final-report.md` — Create Club
- `docs/architecture/sprint-183-final-report.md` — League Setup
- `docs/architecture/sprint-184a-final-report.md` — ten sprint + 18.4a-db
