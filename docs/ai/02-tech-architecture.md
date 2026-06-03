# 02 — Architektura techniczna

## Stack

| Warstwa | Technologia |
|---------|-------------|
| Framework | **Next.js 15** (App Router) |
| UI | **React 19**, **TypeScript strict** |
| Style | **Tailwind CSS 4**, **Shadcn UI** |
| Baza / Auth | **Supabase** (PostgreSQL + RLS + Auth + Storage) |
| Hosting | **Vercel** (`fra1`) |
| PWA | **Serwist** (`src/sw.ts` → `public/sw.js`) |
| AI | **OpenAI** (server-only) |
| Walidacja env | **Zod** — `src/config/env.ts` |

## Warstwy aplikacji (Clean Architecture — uproszczona)

```
src/app/              → routing, layouty, strony (Presentation)
src/features/         → moduły biznesowe: actions, components (Application)
src/lib/              → supabase, rbac, mappers, utils (Infrastructure)
src/config/           → permissions, navigation, site (Domain config)
src/types/            → TypeScript + Database types
supabase/migrations/  → źródło prawdy schematu SQL
scripts/              → sync, setup, import, audyty (ops, nie runtime UI)
```

### Przepływ typowego requestu (panel)

1. `middleware.ts` — sesja Supabase (tylko trasy **niepubliczne** od P0)
2. Server Component / Server Action
3. `createClient()` z `@/lib/supabase/server` (cookies użytkownika)
4. Sprawdzenie RBAC — `src/config/permissions.ts` + `src/lib/rbac/`
5. Zapytanie SQL przez Supabase (RLS filtruje `club_id`)
6. Render HTML / redirect

### Przepływ strony publicznej

1. `middleware.ts` — **bypass** (bez `getUser`) dla `/`, `/druzyna`, …
2. `src/app/(public)/layout.tsx` — `revalidate = 300`
3. `src/lib/website/public-data.ts` — RPC + SELECT
4. Storage signed URLs dla mediów CMS

## Multi-tenant

| Element | Implementacja |
|---------|---------------|
| Tenant | Wiersz w `clubs` |
| Izolacja | `club_id` na tabelach + **RLS** |
| Członkostwo | `club_memberships` (user ↔ club ↔ role) |
| Kontekst sesji | Aktywny klub w profilu / sesji (`src/lib/auth/session.ts`) |
| Publiczny dostęp | `website_is_public(club_id)` + slug |

**Nigdy** nie używaj `SUPABASE_SERVICE_ROLE_KEY` w kodzie dostępnym w przeglądarce.

## Kluczowe klienty Supabase

| Plik | Użycie |
|------|--------|
| `src/lib/supabase/client.ts` | Komponenty klienckie (browser) |
| `src/lib/supabase/server.ts` | Server Components, Actions |
| `src/lib/supabase/admin.ts` | Service role — cron, skrypty, push dispatch |
| `src/middleware.ts` | Odświeżanie sesji auth (trasy chronione) |

## Server Actions vs Route Handlers

| Mechanizm | Kiedy |
|-----------|--------|
| **Server Actions** | Domyślnie — mutacje w `src/features/*/actions.ts` |
| **Route Handlers** | API: cron, PWA, OAuth callback, push |

Przykłady API:

- `src/app/api/cron/league-sync/route.ts` — sync ligowy (`maxDuration = 300`)
- `src/app/api/pwa/*` — offline, push, sync
- `src/app/auth/callback/route.ts` — Supabase OAuth

## Bezpieczeństwo (kolejność)

1. **RLS** w PostgreSQL
2. **RBAC** w Server Actions
3. **Walidacja Zod** na wejściu formularzy
4. **Secrets** tylko server / Vercel env
5. **Cron** — `CRON_SECRET` / `LEAGUE_SYNC_CRON_SECRET`

## Struktura `src/features/`

Każdy moduł zwykle:

```
features/<name>/
  actions.ts       # Server Actions
  components/      # UI panelu
  schemas/         # Zod (opcjonalnie)
  types.ts
```

Moduły strony publicznej: `src/features/website/`

## Build i jakość

```bash
npm run validate:env   # .env.local
npm run typecheck
npm run build          # validate + tsc + next build
```

CI (GitHub Actions): `typecheck` + `build` na push do `main`.

## Deployment

| Środowisko | URL / config |
|------------|----------------|
| Produkcja | https://pilka-mu.vercel.app |
| Region | `fra1` (`vercel.json`) |
| Cron | `/api/cron/league-sync` — harmonogram w `vercel.json` na `main` |

Więcej: [08-scripts-env-deploy.md](./08-scripts-env-deploy.md)
