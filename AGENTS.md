# Instrukcje dla agentów AI

Przed rozpoczęciem pracy w tym repozytorium przeczytaj:

1. **[docs/ai/README.md](docs/ai/README.md)** — pełna dokumentacja produktu (architektura, strony, moduły, liga, DB).
2. **[docs/architecture/project-handoff-current.md](docs/architecture/project-handoff-current.md)** — skrót START HERE (prod, sprint, otwarte zadania).
3. **[docs/architecture/project-handoff-20.5-club-management.md](docs/architecture/project-handoff-20.5-club-management.md)** — **Club Management 20.5:** members, invitations, bulk, walidatory, smoke, rollback.
4. **[docs/architecture/sprint-20.5c.2c-bulk-remove.md](docs/architecture/sprint-20.5c.2c-bulk-remove.md)** — **20.5C.2C:** bulk remove, danger dialog, smoke prod, pułapki `SMOKE_BASE_URL`.
5. **[CHANGELOG.md](CHANGELOG.md)** — ostatnie wdrożenia (sekcja `[post-20-5c2c-bulk-remove]`).
6. **[docs/architecture/project-handoff-20.1.md](docs/architecture/project-handoff-20.1.md)** — **Platform 18.5A→20.1:** skala, hotfixy SQL, deploy, `health-types` reguła.
7. **[docs/architecture/AGENTS.md](docs/architecture/AGENTS.md)** — indeks aktywnej dokumentacji Platform + 20.5C.
8. **[docs/archive/audit/pre-18-5-backup-handoff.md](docs/archive/audit/pre-18-5-backup-handoff.md)** — checkpoint PRE 18.5 (archiwum).
9. **Platform Admin / multi-club:** [docs/ai/10-platform-admin-multi-club.md](docs/ai/10-platform-admin-multi-club.md) · [sprint-201a-deploy-recovery-rca.md](docs/architecture/sprint-201a-deploy-recovery-rca.md). Archiwum: [docs/archive/](docs/archive/).

**Checkpointy LIVE:**

| Sprint | Commit | Status |
|--------|--------|--------|
| **20.5C.2C** Bulk Remove | `3eac96f` | **PASS** · production **GO** |
| **20.5C.2B** Bulk Role Change | `8efa710` | **PASS** |
| **20.5C.2A** Bulk Suspend + Reactivate | `107f421` | **PASS** |
| **20.5C.1** CSV Export + Multi Select | `d644b5a` | **PASS** |
| **20.5B.4** Club Management | `b41d049` | **PASS** |
| **20.3** Navigation + Platform UX | `af3a485` | **PASS** · tag `post-20-3-navigation-ux` |

**Produkcja:** https://pilka-mu.vercel.app · **Branch:** `main` · **Feature commit:** `3eac96f` · **Docs:** `d35e18f`+  
**Klub referencyjny:** **Piorun Wawrzeńczyce** · `club_id = a1b2c3d4-e5f6-7890-abcd-ef1234567890`

**Status modułów (prod):** Production **PASS** · Club Management **PASS** (bulk **kompletny**: remove/role/suspend/reactivate + CSV) · Invitations **PASS** · League Sync **PASS** · Platform **PASS** · Navigation **PASS**

**Następny sprint (rekomendacja):** **20.5C.3** — CSV import

### Smoke i rollback (agent AI — czytaj przed mutacją prod DB)

| Akcja | Komenda / plik |
|-------|----------------|
| Snapshot przed smoke | `node scripts/_snapshot-piorun-members.mjs` |
| Smoke lokalny 2C | `SMOKE_BASE_URL=http://localhost:3000 node scripts/_smoke-205c2c-manual.mjs` (wymaga `next start`) |
| Smoke prod regresja | `_smoke-205c2a` → `_smoke-205c2b` → `_smoke-205c2c` z `SMOKE_BASE_URL=https://pilka-mu.vercel.app` |
| Rollback remove | `node scripts/_rollback-205c2c-memberships.mjs` |
| Rollback role | `node scripts/_rollback-205c2b-roles.mjs` |

**Uwaga:** `.env.local` często ma `SMOKE_BASE_URL` → prod. Lokalny smoke **musi** nadpisać na `localhost:3000`.

**Production-linked development:** `.env.local` → produkcyjny Supabase (`pwkqnwqvrdiaycveacxa`). Smoke mutacyjny wymaga **rollbacku** lub izolowanego klubu testowego.

**Nie commituj, nie pushuj i nie deployuj** bez wyraźnej prośby użytkownika.
