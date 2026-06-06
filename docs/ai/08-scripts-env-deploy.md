# 08 — Skrypty, środowisko, deploy

## Zmienne środowiskowe

Szablon: `.env.example` · lokalnie: `.env.local`

| Zmienna | Wymagane | Gdzie |
|---------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Klient + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Klient + server |
| `NEXT_PUBLIC_SITE_URL` | ✅ prod | Linki, metadata |
| `SUPABASE_SERVICE_ROLE_KEY` | sync, cron, skrypty | **Secret** — nigdy w przeglądarce |
| `SUPABASE_DB_PASSWORD` | setup/migracje lokalne | Skrypty DB |
| `CRON_SECRET` / `LEAGUE_SYNC_CRON_SECRET` | cron Vercel | league-sync |
| `OPENAI_API_KEY` | moduł AI | Server only |
| `LNP_ACCESS_TOKEN` | opcjonalnie | mPZPN (krótkotrwały) |
| `LNP_TEAM_ID` | opcjonalnie | UUID drużyny GLKS |
| `PWA_CRON_SECRET` | push prod | opcjonalnie |
| `VAPID_*` | Web Push | opcjonalnie |

Walidacja: `npm run validate:env` → `scripts/validate-env.mjs`

## Komendy codzienne

```bash
npm run dev              # Turbopack, localhost:3000
npm run build            # validate + typecheck + next build
npm run typecheck
npm run lint

# Liga
npm run sync:league-live
npm run sync:league-live:dry-run

# Treść / media
npm run import:facebook
npm run fetch:club-media

# Weryfikacja kadry (lokalnie)
node scripts/verify-squad-registry.mjs
```

## Skrypty ligowe (kluczowe)

| Skrypt | Rola |
|--------|------|
| `scripts/sync-league-live.mjs` | Entry point syncu |
| `scripts/lib/league-live-sources.mjs` | Fetch + parse 90minut/RF |
| `scripts/lib/league-live-pipeline.mjs` | Zapis Supabase |
| `scripts/lib/league-squad-sources.mjs` | Kadra + merge statystyk |
| `scripts/lib/regiowyniki-match-goals.mjs` | Bramki z protokołów (**lokalnie**) |
| `scripts/import-league-fixture.mjs` | Import fixture JSON |
| `scripts/discover-lnp-setup.mjs` | Pomoc mPZPN token |

## Skrypty setup (seed środowiska)

`npm run setup:stage1` … `setup:stage15b` — kolejne etapy, wymagają DB.

Migracje SQL: `npm run db:migrate:stage*` lub `node scripts/run-sql.mjs`

## Skrypty probe

`scripts/probe-*.mjs` — **narzędzia deweloperskie**, nie produkcyjne. Nie commituj masowo bez potrzeby.

## Git i CI

| Element | Wartość |
|---------|---------|
| Branch produkcyjny | `main` |
| CI | GitHub Actions — `typecheck` + `build` |
| Ostatni deploy P0 | commit `aee9d4f` |

```bash
git push origin main
gh run list --branch main -L 3
```

## Vercel

| Element | Wartość |
|---------|---------|
| Projekt | `pilka` (dawidthai125s-projects) |
| URL | https://pilka-mu.vercel.app |
| Region | fra1 |
| `vercel.json` | build, crons |

```bash
vercel deploy --prod    # tylko gdy user prosi
vercel env ls production
```

## Supabase

- Migracje: `supabase/migrations/`
- Dashboard: Project Settings → API, Database
- Prod: migracje mogą wymagać ręcznego apply jeśli RPC się nie zgadza

## PowerShell (Windows)

- `npm` może być zablokowany — użyj `npm.cmd` lub `node scripts/...`
- Ścieżki z `(public)` w git add — **w cudzysłowie**

## Powiązane checklisty

- `docs/deployment/production-checklist.md`
- `docs/environment/setup.md`
- `docs/architecture/project-handoff-current.md`
