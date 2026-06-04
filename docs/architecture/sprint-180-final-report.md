# Sprint 18.0 — Club #2 Onboarding Pilot Final Report

**Date:** 2026-06-03  
**Scope:** Business validation only — **no production club created**, no schema changes, no deploy  
**Simulation:** embedded PostgreSQL + baseline + Piorun seed + `pilot-club` bootstrap  
**Artifact:** [`sprint-180-simulation-results.json`](./sprint-180-simulation-results.json)

---

## Executive Summary

| Question | Answer |
|----------|--------|
| Bootstrap creates isolated tenant skeleton? | **YES** (simulation PASS) |
| RLS isolates business data cross-club? | **YES** (players, memberships, manage blocked) |
| Non-developer can onboard alone? | **NO** |
| First real Club #2 with operator help? | **YES (conditional)** |
| Sprint 18.0 success criterion met? | **NO** |

---

## 1. Club #2 Readiness Report (FAZA 1)

### `bootstrap-club.mjs` — automated steps

| # | Step | Table / action |
|---|------|----------------|
| 1 | Club row (`gen_random_uuid`) | `clubs` |
| 2 | Default senior team | `teams` |
| 3 | Website branding colors + SEO | `website_settings` |
| 4 | Content channels (website, FB, IG) | `content_channels` |
| 5 | League season + competition + inactive source | `league_seasons`, `league_competitions`, `league_sources` |
| 6 | Availability reason catalog | `availability_reasons` (6 codes) |
| 7 | Owner membership OR Auth invite | `club_memberships` + Supabase Auth |

### NOT automated (manual / later)

| Item | Owner |
|------|--------|
| `PUBLIC_CLUB_SLUG` / Vercel ENV | Operator / DevOps |
| Supabase Auth redirect URLs | Operator |
| Owner invite (if email new) | Auth admin API |
| League source URLs + `is_active` | Operator / `discover-lnp-setup.mjs` |
| `npm run sync:league-live` | Operator |
| Logo / media upload | Operator (dashboard) |
| Demo players, coaches, sponsors | Operator |
| News / gallery content | Operator |

### Checklist: Nowy klub od zera (bez developera)

| Step | Tool | Non-dev? |
|------|------|----------|
| 1. Schema ready on Supabase | Already done (17.7 parity) | ✅ |
| 2. Run bootstrap CLI | `node scripts/bootstrap-club.mjs ...` | ❌ **Requires CLI** |
| 3. Invite owner email | Automatic via Auth API | ⚠️ Needs service role in env |
| 4. Set `PUBLIC_CLUB_SLUG` | Vercel / `.env.local` | ❌ **Requires DevOps** |
| 5. Redeploy or restart app | Vercel | ❌ |
| 6. Login → dashboard | Browser | ✅ |
| 7. Branding / logo | `/website/branding` | ✅ |
| 8. League URLs | Dashboard or script | ⚠️ Semi-technical |
| 9. Enable sync | Toggle source + cron | ⚠️ Semi-technical |
| 10. Public site live | Auto after slug ENV | Depends on step 4 |

**Verdict:** Full zero-dev onboarding **not ready**. Minimum technical role: **1 operator** with CLI + Vercel access.

---

## 2. Onboarding Simulation Report (FAZA 2)

**Environment:** embedded PG (NOT production)

```
slug:       pilot-club
name:       Pilot Club
short-name: PC
colors:     #1e3a5f, #f5c518, #ffffff
owner:      owner@pilot-club.local
```

### Generated artifacts (simulation)

| Artifact | Value |
|----------|--------|
| `clubs` | 1 new row (`pilot-club`) |
| `teams` | `PC Seniorzy` |
| `website_settings` | 1 row, `public_site_enabled=true` |
| `content_channels` | website, facebook, instagram |
| `league_seasons` | 2025/2026 |
| `league_competitions` | Liga test |
| `league_sources` | inactive, `Manual / pending sync setup` |
| `availability_reasons` | 6 |
| `club_memberships` | owner / active |
| `website_news` | **0** |
| `sponsors` | **0** |
| `website_gallery_albums` | **0** |
| `website_social_integrations` | **0** |

Run: `node scripts/club-onboarding-simulate-180.mjs`

---

## 3. Multi-Tenant Verification Report (FAZA 3)

| Test | Result |
|------|--------|
| Pilot owner memberships scoped to pilot only | **PASS** |
| Pilot cannot read Piorun players (RLS) | **PASS** |
| Piorun cannot manage pilot website (UPDATE blocked) | **PASS** |
| Unique slugs (`piorun-wawrzenczyce`, `pilot-club`) | **PASS** |
| Public RPC exists (`get_public_website_home`) | **PASS** |
| Public website_settings readable cross-auth when `public_site_enabled` | **PASS** (by design) |

**Business isolation verdict:** **PASS**

**Note:** Authenticated users may **read** public website branding of other clubs (intended for public site / CMS preview). **Mutations** remain club-scoped.

---

## 4. Website Readiness Report (FAZA 4)

| Feature | After bootstrap | Automatic? |
|---------|-----------------|------------|
| Homepage RPC (`get_public_website_home`) | Works if slug + settings | ⚠️ Needs ENV slug |
| Branding colors | ✅ in `website_settings` | **Automatic** |
| Hero title / SEO | ✅ default from club name | **Automatic** |
| Logo / crest | Empty | **Manual** upload |
| News | 0 rows | **Manual** CMS |
| Sponsors | 0 rows | **Manual** CRM |
| Gallery | 0 albums | **Manual** |
| Social links | 0 integrations | **Manual** `/website/social` |
| Facebook/IG channels | Placeholders (disabled) | **Manual** enable |

**Public URL today:** single-tenant — `PUBLIC_CLUB_SLUG` picks which club `/` shows. Second club on **same deployment** requires ENV change + redeploy **or** path/subdomain routing (not built).

---

## 5. League Readiness Report (FAZA 5)

| Capability | After bootstrap | Without code change? |
|------------|-----------------|----------------------|
| `league_sources` row | ✅ inactive skeleton | Yes |
| Configure URLs | Empty `config` JSON | Manual / `discover-lnp-setup.mjs` |
| Enable sync | Set `is_active=true`, rename to **Mirror live** pattern | Manual |
| `sync-league-live.mjs --club-id=` | Works per club | Yes (CLI) |
| Cron `/api/cron/league-sync` | Syncs **all** active mirror sources | Yes |
| Player matching (`league_player_registry`) | Empty until sync | After sync |
| LNP tokens (`LNP_*` ENV) | Global env, not per-club | ⚠️ One token set per deploy |

**Verdict:** League **ready structurally**; **operator configuration required** before first sync.

---

## 6. Operator Experience Report (FAZA 6)

Assumption: non-technical club administrator.

| Metric | Count |
|--------|-------|
| **CLI commands required** | **2–3** (bootstrap, optional sync, optional discover) |
| **SQL required** | **0** (if bootstrap used) |
| **ENV variables** | **4–6** (Supabase URL/keys, DB password, `PUBLIC_CLUB_SLUG`, optional `LNP_*`, cron secret) |
| **Vercel actions** | **1–2** (ENV + redeploy) |
| **Dashboard screens (happy path)** | **~8** (login, branding, website news, league, team, members, settings) |
| **Total onboarding steps (realistic)** | **~15–20** |

### Top UX problems

1. **Bootstrap is CLI-only** — no admin UI “Create club”
2. **Single `PUBLIC_CLUB_SLUG` per deployment** — switching public site = DevOps
3. **No club picker** in dashboard — multi-membership users pick first membership or ENV hint
4. **League setup** requires JSON config or probe scripts — not wizard
5. **Auth invite** depends on developer `.env.local` service role for bootstrap host

---

## 7. Gap Analysis (FAZA 7)

### P0 — blocks non-dev onboarding

| Problem | Impact | Recommendation |
|---------|--------|----------------|
| Bootstrap via CLI only | Non-dev cannot start | 18.1: Admin “Create club” wizard or hosted bootstrap API |
| `PUBLIC_CLUB_SLUG` single-tenant deploy | Club #2 public site needs redeploy | 18.1: Path routing `/c/{slug}` or subdomain `{slug}.fcos.pl` |
| No dashboard club switcher | Multi-club users confused | 18.1: Club picker after login |

### P1 — friction

| Problem | Impact | Recommendation |
|---------|--------|----------------|
| League config via JSON/scripts | Operator errors | 18.2: League setup wizard in dashboard |
| Empty news/sponsors/gallery | Blank public site | 18.2: Onboarding checklist in dashboard |
| LNP tokens global ENV | Multi-club same league API awkward | 18.3: Per-club integration secrets in DB |
| Bootstrap `availability_reasons` ON CONFLICT | May fail if unique index missing | Verify index on prod; document |

### P2 — scale

| Problem | Impact | Recommendation |
|---------|--------|----------------|
| Cron sync all clubs sequentially | Slow at 20+ clubs | 18.3: Per-club cron or queue |
| No platform_admin panel | No SaaS operator view | 18.x backlog |
| No billing / limits | Commercial risk | Future |

---

## 8. SaaS Readiness Report (FAZA 8)

| Scale | Verdict | Rationale |
|-------|---------|-----------|
| **1 klub** | **PASS** | Production proves Piorun |
| **5 klubów** | **WARNING** | DB multi-tenant OK; app single-slug deploy; manual bootstrap ×5 |
| **20 klubów** | **WARNING** | Same + cron duration; no platform ops |
| **100 klubów** | **FAIL** | No billing, admin, rate limits, connection strategy, club picker |

---

## 9. Roadmap 18.x (FAZA 9)

### 18.1 — Onboarding MVP (P0)

- Dashboard **“Utwórz klub”** (wraps bootstrap logic server-side)
- **Club picker** for multi-membership users
- Public routing **`/{slug}`** or subdomain mapping (remove redeploy per club)

### 18.2 — Operator self-service (P1)

- **Onboarding checklist** UI (branding → league → first news → invite coaches)
- **League setup wizard** (URLs, team name, test sync button)
- Seed optional **welcome news** post on bootstrap

### 18.3 — Scale prep (P2)

- Per-club integration credentials storage
- Platform admin read-only tenant list
- Cron fan-out / queue for league sync

---

## 10. Final Answer

### Czy FC OS jest gotowy do uruchomienia pierwszego realnego Klubu #2?

## **TAK — warunkowo** (z operatorem technicznym)

## **NIE** — dla pełnego sukcesu sprintu (osoba nietechniczna, zero developera)

---

### Procedura startowa — Klub #2 na istniejącej produkcji (post-17.7)

**Nie stosuj `baseline.sql` na prod** — schema jest kompletna.

#### Krok 1 — Bootstrap (operator z CLI + `.env.local` prod credentials)

```bash
node scripts/bootstrap-club.mjs \
  --slug pilot-club \
  --name "Pilot Club" \
  --short-name "PC" \
  --colors "#1e3a5f,#f5c518,#ffffff" \
  --owner-email owner@pilot-club.pl \
  --official-name "Pilot Club Official" \
  --competition-level "B Klasa" \
  --voivodeship "dolnośląskie" \
  --league-name "Twoja liga"
```

Zapisz zwrócone: `clubId`, `teamId`, `seasonId`, `competitionId`.

#### Krok 2 — Auth

- Owner otrzymuje invite email (jeśli nowy user)
- Supabase Auth → Redirect URLs dla domeny produkcyjnej

#### Krok 3 — Public site (obecny model single-tenant)

**Opcja A — dedykowany deploy (zalecane dziś):**

- Nowy projekt Vercel **lub** branch z ENV:
  - `PUBLIC_CLUB_SLUG=pilot-club`
  - `NEXT_PUBLIC_SITE_NAME=Pilot Club`
- Redeploy

**Opcja B — wait for 18.1** path/subdomain routing

#### Krok 4 — Dashboard content

1. `/website/branding` — logo, kolory (override if needed)
2. `/website/news` — pierwszy artykuł
3. `/website/gallery` — album
4. `/teams` — verify senior team
5. `/settings/members` — invite coaches

#### Krok 5 — Liga

1. Dashboard → League → edytuj `league_sources.config` (URLs 90minut / RF / regiowyniki)
2. Lub: `node scripts/discover-lnp-setup.mjs`
3. Ustaw `is_active=true`, nazwa zgodna z **Mirror live** (dla cron)
4. Test: `npm run sync:league-live -- --club-id=<clubId> --dry-run`
5. Pełny sync po OK

#### Krok 6 — Weryfikacja

- [ ] Login owner → dashboard Pilot Club only
- [ ] Public `/` (na deploy z slug) — homepage
- [ ] `/finance`, `/inventory` — empty state (not 500)
- [ ] League data po sync

---

## Artefakty

| File | Role |
|------|------|
| [`sprint-180-final-report.md`](./sprint-180-final-report.md) | Ten raport |
| [`sprint-180-simulation-results.json`](./sprint-180-simulation-results.json) | Symulacja pilot-club |
| [`scripts/club-onboarding-simulate-180.mjs`](../../scripts/club-onboarding-simulate-180.mjs) | Re-run simulation |
| [`scripts/bootstrap-club.mjs`](../../scripts/bootstrap-club.mjs) | Production bootstrap |
| [`docs/architecture/sprint-173-bootstrap-design.md`](./sprint-173-bootstrap-design.md) | Design reference |
| [`docs/architecture/multi-tenant.md`](./multi-tenant.md) | Tenant model |

---

**Sprint 18.0 status: COMPLETE (validation)**  
**Production: untouched (simulation only)**  
**Next: Sprint 18.1 — Onboarding MVP (P0 gaps)**
