# Sprint 18.1 — Multi-Club Public Routing

**Status:** COMPLETE (implementation)  
**Production deploy:** NOT executed (per sprint rules)  
**Date:** 2026-06-03

---

## Executive summary

Sprint 18.1 removes the **`PUBLIC_CLUB_SLUG` single-tenant blocker** from the public website layer. Multiple clubs now share one FC OS deployment with path-based URLs:

| Club | Public home |
|------|-------------|
| Piorun | `/piorun-wawrzenczyce` |
| Pilot Club | `/pilot-club` |

Club resolution is **URL-driven** (path slug or optional subdomain). No club-specific ENV is required for public pages.

---

## FAZA 1 — Public routing audit

### ENV slug usage (before → after)

| Symbol | File | Lines (approx.) | Impact | After 18.1 |
|--------|------|-----------------|--------|------------|
| `PUBLIC_CLUB_SLUG` | `src/lib/tenant/resolve.ts` | 10–21 | Public + dashboard hint | **Removed from public path** — deprecated fallback only |
| `NEXT_PUBLIC_DEFAULT_CLUB_SLUG` | `src/config/site.ts`, `resolve.ts` | 16, 45–47 | Default tenant | **Dashboard/auth branding hint only** |
| `ACTIVE_CLUB_SLUG` | `src/lib/tenant/resolve.ts` | 45–47 | Dashboard session hint | Unchanged (dashboard only) |
| `DEFAULT_PUBLIC_CLUB_SLUG` | `src/lib/website/public-data.ts` | (removed) | All public loaders default | **Removed** — slug required per request |
| `resolvePublicClubSlug()` | `home-bundle.ts`, `public-data.ts` | — | Implicit tenant | **Removed from public loaders** |
| Scripts | `probe-home-bundle-payload.mjs`, `audit-public-home-performance.mjs` | — | Dev probes | Unchanged (optional env) |

### Middleware (before)

- Flat public routes: `/`, `/druzyna`, `/tabela`, …
- Skipped Supabase auth for `PUBLIC_WEBSITE_PREFIXES`
- **No club slug in URL**

### App router (before)

```
src/app/(public)/
  page.tsx          → home (ENV slug)
  druzyna/page.tsx
  aktualnosci/...
  ...
```

### After 18.1

```
src/app/(public)/
  page.tsx                    → club directory (multi-club) or 301 (single club)
  [clubSlug]/
    layout.tsx                → resolvePublicClubBySlug + shell
    page.tsx                  → home
    druzyna|tabela|mecze|...
```

### Loaders / metadata / SEO

| Layer | Before | After |
|-------|--------|-------|
| `getPublicWebsiteHome()` | default ENV slug | `getPublicWebsiteHome(clubSlug)` |
| `loadHydratedPublicHomePage()` | ENV fallback | `loadHydratedPublicHomePage(clubSlug)` |
| `buildPublicPageMetadata()` | flat path `/druzyna` | `(clubSlug, subpath)` → canonical `/{slug}/druzyna` |
| `sitemap.ts` | single club flat URLs | all active clubs × subpages |
| `robots.ts` | flat allow list | `/*/{segment}` + legacy flat (301) |

---

## FAZA 2 — Routing design

### Option A — Path prefix `/{clubSlug}`

| Pros | Cons |
|------|------|
| Single Vercel deployment, no DNS | URLs longer |
| Works on `pilka-mu.vercel.app` today | Legacy bookmarks need 301 |
| Simple ISR/cache per path | |
| Easy club directory at `/` | |

### Option B — Subdomain `{slug}.domain.pl`

| Pros | Cons |
|------|------|
| Clean brand URLs | Wildcard DNS + SSL per platform |
| Feels “dedicated site” | Vercel domain config per tenant tier |
| | Harder local dev |

### Recommendation: **Option A (primary)** + **Option B (optional layer)**

- **Primary:** `https://domain.pl/pilot-club`
- **Optional:** `NEXT_PUBLIC_PLATFORM_HOST=fcos.pl` → `{slug}.fcos.pl` 301 → `/{slug}` (implemented in middleware)
- **Rationale:** Ships on current infra; subdomain is additive without blocking multi-club.

---

## FAZA 3 — Club resolution layer

### New module: `src/lib/tenant/public-club.ts`

| Export | Role |
|--------|------|
| `resolvePublicClub({ routeClubSlug, host })` | Main entry — DB lookup, no ENV |
| `resolvePublicClubBySlug(slug)` | Cached validation |
| `listActivePublicClubs()` | Directory + sitemap |
| `clubPublicPath(slug, path)` | URL builder |
| `extractRouteClubSlug(pathname)` | First segment if not reserved |
| `isLegacyFlatPublicPath(pathname)` | Pre-18.1 URLs |
| `resolveClubSlugFromHost(host)` | Subdomain variant B |
| `getLegacyRedirectClubSlug()` | Oldest active club for 301 |

### Supporting

- `src/lib/website/public-paths.ts` — `buildPublicClubPaths()`, `getPublicNavLinks()`
- `src/features/website/public-club-context.tsx` — client nav context

**No `PUBLIC_CLUB_SLUG` in public resolution path.**

---

## FAZA 4 — Public data loaders

All slug-parameterized loaders now require explicit `clubSlug` at the page boundary:

- `getPublicWebsiteHome(slug)`
- `getPublicPlayers(slug)`
- `getPublicSponsors(slug)`
- `getPublicTeams(slug)`
- `getPublicTeamStats(slug)`
- `getPublicClubStats(slug)`
- `getPublicWebsiteSitemap(slug)`
- `getPublicHomeBundle(slug)`
- `loadHydratedPublicHomePage(slug)`

Club-scoped loaders (`getPublicNews(clubId)`, etc.) require `clubId` from `getPublicClubId(clubSlug)`.

---

## FAZA 5 — SEO multi-club

| Concern | Implementation |
|---------|----------------|
| `<title>` | Per club from `getPublicWebsiteHome(clubSlug)` |
| Canonical | `https://site/{clubSlug}/…` via `buildPublicPageMetadata` |
| Open Graph | Club logo/hero + club name |
| Sitemap | One index: `/` + every `/{slug}/…` for active clubs |
| Robots | Allow `/*/{public-segment}` + legacy paths (redirected) |

Example:

```
/piorun-wawrzenczyce/tabela   → canonical Piorun
/pilot-club/tabela            → canonical Pilot
```

---

## FAZA 6 — Website isolation test

Simulation script: `scripts/multi-club-public-routing-181.mjs`

| Check | Expected |
|-------|----------|
| Piorun home bundle | `heroTitle = Piorun Hero` |
| Pilot home bundle | `heroTitle = Pilot Hero` |
| News titles | No cross-club leakage |
| RPC | `get_public_home_bundle(p_club_slug)` per slug |

Run (embedded PG):

```bash
node scripts/multi-club-public-routing-181.mjs
```

---

## FAZA 7 — Backward compatibility

### 301 redirect strategy

| Legacy URL | Redirect |
|------------|----------|
| `/` | Single club → `/{oldest-slug}`; multi club → directory |
| `/druzyna`, `/mecze`, … | `/{oldest-slug}{path}` |
| Subdomain `{slug}.platform.host/*` | `/{slug}/*` |

**Note:** With 2+ clubs, legacy flat URLs (e.g. `/druzyna`) redirect to the **oldest active club** (Piorun on prod). Bookmarks should migrate to `/{slug}/…`.

### Migration plan (production)

1. Deploy 18.1 (no ENV change required).
2. Verify 301: `/` → `/piorun-wawrzenczyce` (single club) or directory (multi).
3. Update external links / Google Search Console to prefixed URLs.
4. Remove `PUBLIC_CLUB_SLUG` from Vercel when convenient (optional cleanup).

---

## FAZA 8 — Multi-club scale test (projected)

| Clubs | Route patterns | Sitemap build queries | Home RPC/query |
|-------|----------------|----------------------|----------------|
| 1 | 9 | 2 | 1 |
| 5 | 45 | 6 | 1 |
| 20 | 180 | 21 | 1 |
| 100 | 900 | 101 | 1 |

**Routing:** O(1) segment parse + 1 DB slug validation (cached per request).  
**Bundle size:** No change — same components, slug is a route param.  
**Cache:** ISR `revalidate=300` per `/{clubSlug}` segment; independent cache keys per club.

---

## FAZA 9 — Implementation report

### Removed / deprecated public uses of `PUBLIC_CLUB_SLUG`

- `public-data.ts` — `DEFAULT_PUBLIC_CLUB_SLUG`, env fallback in `getPublicClubId()`
- `home-bundle.ts` — `resolvePublicClubSlug()` fallback
- `seo.ts` — implicit club from env
- Flat `(public)/*/page.tsx` — deleted (11 files)

### New entry points

| Path | Purpose |
|------|---------|
| `src/lib/tenant/public-club.ts` | Resolution layer |
| `src/lib/website/public-paths.ts` | Path builders |
| `src/features/website/public-club-context.tsx` | Client nav |
| `src/app/(public)/page.tsx` | Club directory |
| `src/app/(public)/[clubSlug]/**` | All public pages |

### Changed files (summary)

- `src/middleware.ts` — legacy 301, subdomain, public path detection
- `src/lib/website/public-data.ts`, `home-bundle.ts`, `seo.ts`
- `src/features/website/components/*` — club-prefixed links
- `src/app/sitemap.ts`, `src/app/robots.ts`
- `src/features/website/actions.ts` — revalidate `/{slug}/…`
- `src/app/(dashboard)/website/page.tsx` — preview link

---

## FAZA 10 — Final verdict

**Po Sprint 18.1, czy nowy klub może zostać uruchomiony bez nowego deploya, ENV i zmian kodu?**

### **TAK** — warunkowo

| Wymaganie | Status |
|-----------|--------|
| Nowy deploy | **NIE** — wystarczy istniejący deploy |
| Nowy ENV (`PUBLIC_CLUB_SLUG`) | **NIE** — usunięty z warstwy public |
| Zmiany kodu | **NIE** — `bootstrap-club.mjs` + rekord w DB |
| Bootstrap danych klubu | **TAK** — nadal wymagany (poza scope 18.1) |

Public URL po bootstrap: **`https://domain.pl/{slug}`** — automatycznie po aktywnym klubie w DB.

**NIE** dla pełnego self-service bez operatora technicznego — bootstrap nadal wymaga skryptu/operatora (Sprint 18.2).

---

## Verification

```bash
npm run typecheck   # PASS
node scripts/multi-club-public-routing-181.mjs   # embedded PG
```

---

## Related

- Sprint 18.0: `docs/architecture/sprint-180-final-report.md`
- Simulation output: `docs/architecture/sprint-181-simulation-results.json` (after script run)
