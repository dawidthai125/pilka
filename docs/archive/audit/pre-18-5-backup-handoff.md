# PRE 18.5 BACKUP — Handoff dla agentów AI

**Status:** ✅ **BACKUP COMPLETE** (2026-06-04)  
**Cel:** Checkpoint przed Sprint 18.5 · Platform Phase (18.1–18.4b) zamknięta  
**Produkcja:** https://pilka-mu.vercel.app  
**Supabase:** `pwkqnwqvrdiaycveacxa`

---

## 1. CO ZOSTAŁO ZROBIONE

| Faza | Status | Artefakt |
|------|--------|----------|
| Git tag | ✅ | `pre-18-5-platform-complete` → commit `ef7873e` (local + origin) |
| Full DB dump | ✅ | `backups/pre-18-5/db/fcos-pre-18-5-20260604.dump` |
| ENV export | ✅ | `backups/pre-18-5/env/.env.production.backup` |
| Manifest | ✅ | `backups/pre-18-5/manifest.txt` |
| Offsite archive | ✅ | `backups/pre-18-5/fcos-pre-18-5-offsite.7z` (zaszyfrowany) |

**Nie wykonano:** deploy, migracje, commit kodu aplikacji, GitHub Release assets.

---

## 2. GIT SNAPSHOT

| Pole | Wartość |
|------|---------|
| **HEAD** | `ef7873e909e2961e0c789ce6aa37f944530f437f` |
| **origin/main** | `ef7873e909e2961e0c789ce6aa37f944530f437f` |
| **Tag** | `pre-18-5-platform-complete` |
| **Tag message** | Pre Sprint 18.5 — Platform Phase complete (18.4b live) |
| **Commit message** | `feat(platform): monitoring, audit center, and health dashboard (18.4b)` |

Weryfikacja:

```bash
git rev-parse HEAD origin/main
git rev-list -n 1 pre-18-5-platform-complete
git ls-remote origin refs/tags/pre-18-5-platform-complete
```

---

## 3. DATABASE BACKUP

| Pole | Wartość |
|------|---------|
| Plik | `backups/pre-18-5/db/fcos-pre-18-5-20260604.dump` |
| Format | custom (`pg_dump -Fc`) |
| Rozmiar | **1 452 854 B** (~1.39 MiB) |
| Timestamp UTC | `2026-06-04T08:56:05Z` |
| SHA256 | `A5D3F243D5A575CECF8629407611DE3C2B47AF716143749F4BED186686AC33A9` |
| pg_dump | 17.5 (portable, `%LOCALAPPDATA%\fcos-pg-tools\pgsql\bin\pg_dump.exe`) |
| PostgreSQL server | 17.6 |
| Host dumpu | `db.pwkqnwqvrdiaycveacxa.supabase.co:5432` |

### Stan prod w momencie backupu

| Metryka | Wartość |
|---------|---------|
| Tabele `public` | 148 |
| Auth users | 7 |
| Kluby | 3 (2 active, 1 onboarding) |
| `schema_migrations` (prod) | **5** wpisów (≠ 106 plików w git!) |
| Storage objects | 0 |
| DB size | ~25 MB |

**Kluby:** `piorun-wawrzenczyce` (active), `pilot-club-test` (active), `release-184a-mpz313we` (onboarding).

### Restore (tylko w incydencie)

```bash
# NIGDY blind restore na prod bez okna maintenance
pg_restore -h db.pwkqnwqvrdiaycveacxa.supabase.co -p 5432 -U postgres -d postgres \
  --clean --if-exists backups/pre-18-5/db/fcos-pre-18-5-20260604.dump
```

Alternatywa: Supabase Dashboard → Database → Backups → **PITR** (zalecane przy awarii).

---

## 4. ENV BACKUP

| Pole | Wartość |
|------|---------|
| Plik | `backups/pre-18-5/env/.env.production.backup` |
| Źródło | `vercel env pull --environment=production` |
| Łącznie zmiennych | **30** |

### 9 zmiennych skonfigurowanych operatora (Vercel Production)

`ALLOW_PUBLIC_REGISTRATION`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `OPENAI_API_KEY`, `PLATFORM_ADMIN_EMAILS`, `SUPABASE_DB_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`

### 21 zmiennych wstrzykniętych przez Vercel CLI (runtime)

`VERCEL_*`, `TURBO_*`, `NX_DAEMON` — generowane przy `env pull`, niekoniecznie ustawione ręcznie w Dashboard.

**⚠️ Plik zawiera sekrety — NIE commitować.**

---

## 5. OFFSITE ARCHIVE

| Pole | Wartość |
|------|---------|
| Plik | `backups/pre-18-5/fcos-pre-18-5-offsite.7z` |
| Rozmiar | **316 784 B** |
| SHA256 | `E946E704A927A386F6F8EB7941661486A1CAE3CFE7ECF9C90D56EADF9BAA061F` |
| Szyfrowanie | AES-256 (`-mhe=on`) |
| Hasło | `backups/pre-18-5/.offsite-password.local` — **lokalnie, nie w git, nie w raportach** |

**Operator:** skopiuj `.7z` offsite (NAS / Drive / OneDrive). Hasło trzymaj osobno (menedżer haseł).

---

## 6. PITR

| Pole | Wartość |
|------|---------|
| Status | **ON** (precondition operator-confirmed przed backupem) |
| Dashboard | https://supabase.com/dashboard/project/pwkqnwqvrdiaycveacxa/database/backups |
| T0 backupu | `2026-06-04T08:56:05Z` |

Runbook rollback: `docs/architecture/sprint-176-rollback-runbook.md`

---

## 7. NARZĘDZIA LOKALNE (Windows)

| Narzędzie | Ścieżka / uwagi |
|-----------|-----------------|
| `pg_dump` | `%LOCALAPPDATA%\fcos-pg-tools\pgsql\bin\pg_dump.exe` (portable 17.5, pobrane bez admin) |
| `7zr` | `%LOCALAPPDATA%\fcos-7z-tools\7zr.exe` (portable) |
| Supabase CLI | zainstalowany (`2.102.0`) — **wymaga `supabase login`** do operacji API |
| Vercel CLI | zalogowany jako `dawidthai125` |

Instalacja systemowa PostgreSQL przez winget **nie powiodła się** (UAC anulowany). Portable binaries działają.

---

## 8. CZEGO NIE ROBIĆ (agent)

- **NIE** commituj folderu `backups/` — dump + ENV + hasło archiwum
- **NIE** ponawiaj backupu bez polecenia — checkpoint już istnieje
- **NIE** usuwaj tagu `pre-18-5-platform-complete`
- **NIE** deployuj / migracji bez wyraźnej prośby użytkownika
- **NIE** zakładaj że prod = git migrations 1:1 — prod ma **5** markerów vs **106** plików SQL

---

## 9. WORKING TREE (śmieci lokalne — nie commitować `git add .`)

Typowe untracked (2026-06-04):

- `scripts/probe-*`, `scripts/_hotfix-*`, `scripts/_audit-*`
- `docs/architecture/sprint-17*.md/json` (raporty lokalne)
- `supabase/migrations/20260604120000_hotfix_183d_*.sql` — **untracked** (hotfix na prod, brak w remote?)
- `supabase/prod-parity-patch.sql`, `supabase/baseline.sql`
- `.staging-pg-*`, `.deploy-184b-inspect.json`

Modified (fixtures league live): `fixtures/league/live/*.json` — nie wiązać z backupem platform.

---

## 10. SPRINT 18.4b — CO JEST NA PROD

Commit `ef7873e` wdrożony na Vercel (`pilka-ix912e4fc` Ready).

| Route | Opis |
|-------|------|
| `/platform` | Dashboard + Platform Health |
| `/platform/monitoring` | Cron card, sync table, Club/League Health |
| `/platform/audit` | Audit Center (filtry club/action/date) |

Kluczowe pliki:

- `src/lib/platform/monitoring.ts`, `health.ts`, `audit-center.ts`
- `src/features/platform/components/audit-center-view.tsx`, `sync-monitoring-view.tsx`
- `src/app/(platform)/platform/audit/page.tsx`, `monitoring/page.tsx`

---

## 11. OTWARTE PRZED SPRINT 18.5

| # | Zadanie | Priorytet |
|---|---------|-----------|
| 1 | **Offsite copy** `.7z` — operator (poza repo) | P0 operator |
| 2 | Archiwizacja klubu testowego `release-184a-mpz313we` | P1 |
| 3 | Commit untracked hotfix `20260604120000_hotfix_183d_*` jeśli na prod | P1 |
| 4 | Visual smoke Platform Admin (login) — ~30 s manual | P1 |
| 5 | Regiowyniki goals — kod lokalny nie na `main` | P1 |
| 6 | `get_public_home_bundle` — wydajność homepage | P1 |

**Sprint 18.5:** scope użytkownika — agent startuje od tego checkpointu; backup już domknięty.

---

## 12. SZYBKA WERYFIKACJA (nowy agent)

```bash
# Git
git rev-parse HEAD
git tag -l pre-18-5-platform-complete
git ls-remote origin refs/tags/pre-18-5-platform-complete

# Pliki backupu (lokalnie, poza git)
ls backups/pre-18-5/db/
ls backups/pre-18-5/env/
cat backups/pre-18-5/manifest.txt

# Checksum dumpu
# PowerShell:
Get-FileHash backups/pre-18-5/db/fcos-pre-18-5-20260604.dump -Algorithm SHA256
# Oczekiwany: A5D3F243D5A575CECF8629407611DE3C2B47AF716143749F4BED186686AC33A9
```

---

*Utworzono: 2026-06-04 · sesja backup PRE 18.5 · transkrypt: agent-transcripts/d63dea19-7220-4142-8322-78632c66448c.jsonl*
