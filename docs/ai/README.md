# Dokumentacja dla agentów AI — FC OS

Ten katalog jest **źródłem prawdy dla nowych agentów** (Cursor, Claude, itd.). Przeczytaj go **zanim** zaczniesz grzebać w całym repozytorium.

## Kolejność czytania (≈ 30–45 min)

| # | Plik | Co z niego wyniesiesz |
|---|------|------------------------|
| 0 | [`../architecture/project-handoff-current.md`](../architecture/project-handoff-current.md) | **Skrót START HERE:** prod `b41d049`, Sprint 20.5 PASS, następny 20.5C.1 |
| 0a | [`../architecture/project-handoff-20.5-club-management.md`](../architecture/project-handoff-20.5-club-management.md) | **Club Management 20.5:** members, invitations, smoke, backlog |
| 0b | [`../architecture/project-handoff-20.1.md`](../architecture/project-handoff-20.1.md) | **Platform 20.1:** P1 perf, hotfixy SQL, skala GO/NO-GO, deploy recovery |
| 0c | [`../architecture/sprint-201a-deploy-recovery-rca.md`](../architecture/sprint-201a-deploy-recovery-rca.md) | **P0:** `health-types.ts` — nie importuj `health.ts` w `"use client"` |
| 0d | [`../archive/`](../archive/) | **Archiwum** sprintów 17x–20.1 i audytów historycznych |
| 0e | [`../archive/audit/pre-18-5-backup-handoff.md`](../archive/audit/pre-18-5-backup-handoff.md) | **Archiwum PRE 18.5:** tag, dump, restore |
| 1 | [01-product-overview.md](./01-product-overview.md) | Czym jest FC OS, dla kogo, Piorun vs GLKS |
| 2 | [02-tech-architecture.md](./02-tech-architecture.md) | Stack, warstwy, multi-tenant, bezpieczeństwo |
| 3 | [03-routing-map.md](./03-routing-map.md) | Wszystkie trasy: public, auth, dashboard, API |
| 4 | [04-public-website.md](./04-public-website.md) | Strona klubowa — sekcje, dane, wydajność |
| 5 | [05-dashboard-modules.md](./05-dashboard-modules.md) | Panel klubu — moduły i funkcje |
| 6 | [06-database-and-api.md](./06-database-and-api.md) | Tabele, RPC, RLS, Supabase |
| 7 | [07-league-hub-sync.md](./07-league-hub-sync.md) | Liga, sync, cron, ograniczenia |
| 8 | [08-scripts-env-deploy.md](./08-scripts-env-deploy.md) | Skrypty, env, CI, Vercel |
| 9 | [09-agent-rules.md](./09-agent-rules.md) | Zasady pracy — czego nie robić |
| 10 | [10-platform-admin-multi-club.md](./10-platform-admin-multi-club.md) | **Platform Admin**, onboarding, aktywacja klubu (Sprint 18.x) |

## Szybkie fakty

| Pole | Wartość |
|------|---------|
| Produkt | **Football Club OS** — SaaS dla klubów piłkarskich |
| Instancja referencyjna | **Piorun Wawrzeńczyce** / **GLKS Mietków** |
| Slug klubu | `piorun-wawrzenczyce` |
| Produkcja | https://pilka-mu.vercel.app |
| Prod commit | `b41d049` — Sprint 20.5B.4 Club Management (2026-06-06) |
| Club Management | **PASS** — `/members` (Członkowie + Zaproszenia) |
| Repo | `dawidthai125/pilka` |
| Stack | Next.js 15 · React 19 · Supabase · Vercel |

## Gdzie szukać szczegółów modułowych

- `docs/modules/stage-*.md` — dokumentacja etapów (historyczna, głęboka)
- `docs/archive/audit/*.md` — raporty audytów historycznych (stage, public website)
- `src/features/<moduł>/` — kod danego modułu

## Aktualizacja

Po każdym większym sprincie zaktualizuj:

1. `docs/architecture/project-handoff-current.md`
2. `docs/archive/` — raporty sprintów (np. `18-early-platform/sprint-184a-final-report.md`)
3. Odpowiedni plik w `docs/ai/` (np. `10-platform-admin-multi-club.md`, `07-league-hub-sync.md`)
