# HOME BUNDLE IMPLEMENTATION REPORT — Sprint 16.2 Etap B

**Data:** 2026-06-03  
**Zakres:** warstwa danych `/` — bez zmian UI/layoutu wizualnego

---

## Cel

Jeden RPC `get_public_home_bundle(p_club_slug)` zamiast wielu osobnych zapytań na stronie głównej.

---

## Dostarczone pliki

| Plik | Rola |
|------|------|
| `supabase/migrations/20260703140000_public_home_bundle_162.sql` | RPC + indeksy `matches` |
| `src/lib/website/home-bundle.ts` | `getPublicHomeBundle`, `hydratePublicHomeBundle`, `loadHydratedPublicHomePage` |
| `src/app/(public)/page.tsx` | Homepage korzysta wyłącznie z bundle |
| `src/lib/website/cover-image.ts` | `resolvePublicCoverImageUrl` opakowane w `React.cache()` (dedup z layoutem) |
| `src/types/database.ts` | Typ RPC `get_public_home_bundle` |
| `scripts/audit-public-home-performance.mjs` | Audyt statyczny PRZED/PO + opcjonalny live probe |

---

## RPC `get_public_home_bundle`

**Sygnatura:** `get_public_home_bundle(p_club_slug TEXT) RETURNS JSONB`

**Guard:** `clubs.status = active` + `website_is_public(club_id)` — jak pozostałe public RPC.

**Payload JSON (klucze):**

| Klucz | Zawartość |
|-------|-----------|
| `club` | id, slug, publicName, officialName, competitionLevel, voivodeship |
| `branding` | logo/hero paths, kolory, hero copy, kontakt |
| `news` | do 6 wpisów (slug, title, excerpt, featuredImagePath, category, authorName, publishedAt) |
| `teams` | jak `get_public_teams` |
| `academy` | media section `academy` (paths + demo keys) |
| `stats.club` | jak `get_public_club_stats` |
| `stats.team` | jak `get_public_team_stats` |
| `nextMatch` / `lastMatch` | pojedyncze mecze |
| `recentResults` | 8 ostatnich wyników |
| `league` | entries + ownTeamName + competition + season |
| `players` | pełna kadra aktywna (statystyki sezonu) |
| `topScorers` | top 5 po bramkach (precomputed w SQL) |
| `sponsors` | jak `get_public_sponsors` |
| `media` | aktywne `website_media` (do batch signed URL w TS) |
| `newsCount` / `sponsorCount` | metadane |

**Indeksy dodane w migracji:**

- `idx_matches_public_home_results` — `(club_id, status, match_date DESC, …)` WHERE completed
- `idx_matches_public_home_upcoming` — `(club_id, status, match_date ASC, …)` WHERE planned/in_progress

---

## Warstwa TypeScript

1. **`getPublicHomeBundle`** — 1× `supabase.rpc`, wynik cache’owany (`React.cache`).
2. **`hydratePublicHomeBundle`** — mapowanie JSON → typy aplikacji + **jeden batch** `buildPublicWebsiteMediaBundle` (signed URLs storage).
3. **`loadHydratedPublicHomePage`** — RPC + hydrate dla `page.tsx`.

**Nie zmieniono:** `ClubSitePageWrapper`, komponentów UI, layoutu wizualnego.

**Nadal poza bundle (layout shell):** `get_public_website_home`, social links, logo signed URL — świadomie pozostawione (Etap B dotyczy tylko homepage content).

---

## Wdrożenie migracji (wymagane przed deploy)

```bash
npx supabase db push
# lub ręcznie SQL z pliku migracji na prod
```

Bez migracji homepage zwróci `null` (RPC nie istnieje) — **live probe lokalnie: FAIL** (schema cache).

---

## Weryfikacja lokalna

| Check | Wynik |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm run build` | PASS (151 stron) |
| Smoke prod (stary kod) | `/`, `/aktualnosci`, `/mecze`, `/tabela`, `/galeria` → 200 |

---

## Następny krok (opcjonalny, poza 16.2)

- Bundle shell layout: `get_public_site_shell` — usunięcie duplikatu `get_public_website_home` między layout a treścią.
- Edge cache dla `/` po stabilizacji bundle na prod.
