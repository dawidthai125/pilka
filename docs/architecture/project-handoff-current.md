# PROJECT HANDOFF — FC OS (Football Club OS)

**Klub referencyjny:** Piorun Wawrzeńczyce / GLKS Mietków  
**Repozytorium:** `dawidthai125/pilka`  
**Dokument:** zaktualizowano 2026-06-06 · dla nowego agenta  
**Produkcja:** https://pilka-mu.vercel.app  
**Supabase project:** `pwkqnwqvrdiaycveacxa`

---

## 0. START HERE — STAN NA DZIŚ (2026-06-06)

> **Club Management (20.5):** czytaj **[`project-handoff-20.5-club-management.md`](./project-handoff-20.5-club-management.md)** — members, invitations, smoke, backlog.  
> **Platform Admin (18.5A → 20.1):** czytaj **[`project-handoff-20.1.md`](./project-handoff-20.1.md)** — pełny handoff sprintów, hotfixy SQL, skala, deploy recovery.

| Pole | Wartość |
|------|---------|
| **Production commit** | `b41d049` — **Sprint 20.5B.3/20.5B.4** Club Management Stabilization **LIVE** |
| **Branch** | `main` |
| **origin/main** | `b41d049` |
| **Produkcja** | **PASS** · https://pilka-mu.vercel.app |
| **Deploy** | **LIVE** (Vercel auto-deploy z `main`) |
| **Tag checkpointu (20.3)** | `post-20-3-navigation-ux` → `af3a485` |
| **Tag checkpointu Platform** | `pre-20-2-platform-roadmap` → `ed324b7` |
| **Faza Platform** | ✅ 18.5A → **20.1** zamknięta · ✅ **20.3** UX/navigation zamknięta |
| **Sprint 20.5 (Club Management)** | ✅ **Completed** — **PASS**, production **GO** |
| **Production Readiness** | **GO** (20 / 50 / 100 klubów) |
| **Następny sprint (rekomendacja)** | **20.5C.1 — CSV Export + Multi Select** |
| **Hotfixy SQL na prod** | `192b` ✅ · `193b` ✅ · `201a` ✅ |

### Status modułów (prod `b41d049`)

| Obszar | Status |
|--------|--------|
| **Production** | **PASS** |
| **Club Management** | **PASS** (`/members` — CRUD członków, RBAC) |
| **Invitations** | **PASS** (invite / resend / revoke, filtry statusów) |
| **League Sync** | **PASS** (20.4C pipeline — bez regresji) |
| **Platform** | **PASS** (18.5A→20.1 + 20.3 UX) |
| **Navigation** | **PASS** (nav v2; `/members` = **Członkowie**) |

### Sprint 20.5 Completed (wdrożone `b41d049`)

| Pod-sprint | Commit | Zakres | Status |
|------------|--------|--------|--------|
| **20.5A** | `8b50069` | Members Foundation — CRUD, invited→active, guards | **PASS** |
| **20.5B** | `bd3525b` | Invitations & Roles — formularz, tab Zaproszenia, resend/revoke | **PASS** |
| **20.5B.1** | `bd3525b` | Release + smoke prod 20.5B | **PASS** |
| **20.5B.2** | — | Post-release audit (bez kodu) | **PASS** — [`club-management-post-release-20.5B.2.md`](../audit/club-management-post-release-20.5B.2.md) |
| **20.5B.3** | `b41d049` | Stabilization — existing user flow, nav Członkowie, filtry, auth guard | **PASS** |
| **20.5B.4** | `b41d049` | Release verification — smoke + CI + prod | **PASS** |

**Walidacja 20.5:** typecheck + build + walidatory `validate-205a`, `validate-205b`, `validate-205b3` + regresja 18.5–20.4C — **PASS**  
**Smoke prod:** `_smoke-prod-205b3.mjs` — **8/8 PASS**  
**Changelog:** [`CHANGELOG.md`](../../CHANGELOG.md) · **Audyt baseline:** [`club-management-20.5-audit.md`](../audit/club-management-20.5-audit.md)

**Kluczowe pliki Club Management:**

| Obszar | Plik |
|--------|------|
| Page | `src/app/(dashboard)/members/page.tsx` |
| Dashboard UI | `src/features/members/components/members-dashboard.tsx` |
| Zaproszenia | `src/features/members/components/invitations-panel.tsx` |
| Server actions | `src/features/members/actions.ts` |
| Invite service | `src/lib/members/invite-service.ts` |
| Auth guard (20.5C prep) | `src/lib/members/auth-invite-guard.ts` |
| Walidatory | `scripts/validate-205a-*.mjs`, `validate-205b-*.mjs`, `validate-205b3-*.mjs` |

**Nie rób ponownie:** ponowny audyt 20.5B.2 (zamknięty), re-implementacja 20.5A/20.5B (LIVE), deploy recovery Platform (naprawione w `eb29e7a`).

### Sprint 20.3 Completed (wdrożone `af3a485`)

| Pod-sprint | Zakres |
|------------|--------|
| **20.3B** | Club Navigation v2 — grouped sidebar, AI hub, PL labels, RBAC filter |
| **20.3C** | Platform UX Cleanup — dashboard 3 sekcje, lifecycle na detail, Platforma CTA |
| **20.3C.1** | UX Stabilization — fix academy images duplicate React keys |
| **20.3C.2** | Release Gate Cleanup — walidatory `193b` + doc-links PASS |

**Walidacja:** typecheck + walidatory 18.5–20.3C — **PASS** · **Smoke prod:** GO  
**Changelog:** [`CHANGELOG.md`](../../CHANGELOG.md) · **Propozycja nav (audyt):** [`navigation-v2-proposal.md`](./navigation-v2-proposal.md)

**Kluczowe trasy Platform:** `/platform`, `/platform/clubs`, `/platform/monitoring`, `/platform/audit`

**Kluczowe trasy Club (nav v2):** `/dashboard`, `/players` (Kadra), `/ai` (hub), `/members` (**Członkowie**, Administracja zwinięta)

**Reguła architektury (P0):** komponenty `"use client"` w Platform **nie** importują value z `health.ts` — używaj `health-types.ts` / `club-operations-registry-types.ts`. Patrz [deploy-recovery RCA](./sprint-201a-deploy-recovery-rca.md).

**Archiwum dokumentacji (Sprint 20.2A):** historyczne raporty sprintów i audytów → **[`../archive/`](../archive/)** (np. `18-5-health/`, `19-3-scale/`, `audit/`). Audyt nawigacji 20.3A: [`../archive/audit/`](../archive/audit/). Aktywne pliki Platform: ten katalog [`docs/architecture/`](./AGENTS.md).

**Nie rób ponownie:** deploy recovery (naprawione w `eb29e7a`), re-apply hotfixów SQL bez potrzeby, ponowny release gate 20.3C.2 (zamknięty).

> **Historia sprzed 18.5:** sekcje poniżej (backup PRE 18.5, sprinty 15.x–18.4b) — kontekst archiwalny.

---

## 0b. ARCHIWUM — stan 2026-06-04 (PRE 18.5)

> **Pełny checkpoint backupu:** [`pre-18-5-backup-handoff.md`](../archive/audit/pre-18-5-backup-handoff.md)

| Pole | Wartość |
|------|---------|
| **Produkcja commit (wtedy)** | `ef7873e` — Sprint **18.4b** |
| **Tag backupu** | `pre-18-5-platform-complete` → `ef7873e` |
| **Backup PRE 18.5** | ✅ `backups/pre-18-5/` (lokalnie, **w .gitignore**) |

---

## 1. PROJECT STATUS

### Obecny etap

- **ETAP 15.x** — platforma modułowa (League Hub, Content, CRM, PWA) — **wdrożona**.
- **Strona publiczna** — Public Website 4.0 + dark matchday; **multi-club** `/{slug}/*` (Sprint 18.1).
- **Platform Admin** — Create Club (18.2), League Setup (18.3), Dashboard + Activation (18.4a), Monitoring + Audit Center (18.4b) — **LIVE na prod** (`ef7873e`).
- **Dane ligowe** — mirror live sync (90minut + RF + regiowyniki kadra); mPZPN tylko ręczny import.

### Ostatni commit (prod + origin/main)

**Sprint 18.4b — Platform Monitoring & Audit Center**  
Commit: `ef7873e909e2961e0c789ce6aa37f944530f437f`  
**Vercel:** Ready (`pilka-ix912e4fc` → `pilka-mu.vercel.app`)  
**Tag checkpointu:** `pre-18-5-platform-complete`

### Wdrożone wcześniej (referencja)

**Performance & League Stabilization 16.0 — P0** — commit `aee9d4f` (middleware bypass, ISR 300, ingest GLKS-only).

### Status produkcji

| Obszar | Status |
|--------|--------|
| Aplikacja Next.js | ✅ Działa (`pilka-mu.vercel.app`) |
| GitHub Actions CI | ✅ Build + typecheck na `main` |
| Panel klubu (dashboard) | ✅ Dla zalogowanych ról |
| Strona publiczna | ✅ PASS smoke (/, /druzyna, /tabela, /mecze, …) |
| League sync cron | ⚠️ Endpoint chroniony; pełny E2E cron nie zweryfikowany agentem bez `CRON_SECRET` |
| Treść „prawdziwego klubu” | ⚠️ Część pracy P1 (FB import) **lokalna / migracje** — patrz Real Content Sprint |

---

## 2. RECENT COMPLETED SPRINTS

### Sprint 20.5 — Club Management (2026-06-06)

**Commit prod:** `b41d049` · **Status:** PASS · **Production:** GO · **Deploy:** LIVE

| Etap | Commit | Opis |
|------|--------|------|
| **20.5A** | `8b50069` | Members v2, server actions CRUD, `invited → active` |
| **20.5B** | `bd3525b` | Zaproszenia klubowe, resend/revoke, liczniki |
| **20.5B.2** | — | Audyt post-release (~78% dojrzałości modułu) |
| **20.5B.3** | `b41d049` | Stabilization: existing user UX, nav Członkowie, filtry zaproszeń, auth rate limit |
| **20.5B.4** | `b41d049` | Smoke + CI + prod verification |

Walidatory: `validate-205a-members-management-foundation.mjs`, `validate-205b-invitations-and-roles.mjs`, `validate-205b3-club-management-stabilization.mjs`  
Smoke: `_smoke-205b3-stabilization.mjs`, `_smoke-prod-205b3.mjs`  
**Następny krok:** **20.5C.1** — CSV Export + multi-select (bez bulk invite do stabilizacji Auth)

### Sprint 20.3 — Navigation & Platform UX (2026-06-06)

**Commit:** `af3a485` · **Tag:** `post-20-3-navigation-ux` · **Status:** PASS · **Production:** GO

- **20.3B Club Navigation v2** — `dashboardNavSections`, AI hub + sub-nav, PL naming, `filter-dashboard-nav.ts`.
- **20.3C Platform UX Cleanup** — platform dashboard reorder, `ClubLifecycleActionBar`, header **Platforma**.
- **20.3C.1 UX Stabilization** — `pickAcademySectionImages`, academy media `id` w public bundle.
- **20.3C.2 Release Gate Cleanup** — walidatory `193b`, `validate-doc-links-202a1` PASS.

Walidatory: `validate-203b-club-navigation-v2.mjs`, `validate-203c-platform-ux.mjs` · Smoke prod: `node scripts/_smoke-prod-203.mjs`

### Stabilization Sprint 15.10A

- Naprawa nawigacji RBAC (bottom nav, sponsor bez redirect loop).
- Portal urazów w nav dla rodzica/zawodnika.
- TOP 5 wydajności (League Hub, match detail).
- **Coach Day** na `/dashboard`.
- Usunięcie martwego kodu z auditu.
- Raport: `docs/archive/audit/stabilization-sprint-1510a-report.md`

### Club Identity 15.10B

- Spójna identyfikacja wizualna Pioruna: login, sidebar, dashboard chrome, PWA.
- Logo, kolory `#0B3D2E` / `#F4C430`, crest badges.
- Raport: `docs/archive/audit/club-identity-1510b-report.md`

### Layout Sprint 15.10C

- Redesign dashboardu (hero, visuals, Coach Day integration).
- Premium dark green + gold UI panelu.
- Raporty: `docs/archive/audit/layout-sprint-1510c-report.md`, `docs/archive/audit/layout-1510c-build-report.md`

### Public Website 2.0

- Przebudowa `/`: moduły meczowe, akademia, wiele drużyn, top strzelcy, tabela skrócona.
- Multi-club SaaS (bez hardcodu nazw w logice).
- Raport: `docs/archive/audit/public-website-2.0-report.md`

### Public Website 3.0

- Scenografia „klub piłkarski”: pełnoekranowy hero, matchday plakat, sponsor wall, ciemna scena `#062820`.
- Usunięto osobną sekcję „Klub w liczbach” (statystyki w hero).
- Skrócona nawigacja publiczna.
- Raport: `docs/archive/audit/public-website-3.0-implementation-report.md`

### Public Website 4.0

- Fotorealistyczne JPG w `/club-media/`, naprawa Matchday (`Invalid Date`).
- Lokalność z CMS, akademia wyżej, sponsorzy jako partnerzy.
- Raport: `docs/archive/audit/public-website-4.0-implementation-report.md`

### Piorun Real Content Sprint

- Audyt: 100% slotów demo, fake newsy, stock zdjęcia.
- P1 wykonane **lokalnie** (import FB Playwright, migracja newsów, ukrycie demo sponsorów) — raport mówi „bez commita na prod” w momencie pisania; **zweryfikuj** `git log` i stan `website_media` na Supabase prod.
- Raport: `docs/archive/audit/real-content-sprint-report.md`, `docs/archive/audit/p1-import-report.md`
- Przewodnik treści: `docs/archive/audit/piorun-brand-content-guide.md`

### Performance & League Stabilization 16.0 — P0 (wdrożone)

| Zmiana | Plik |
|--------|------|
| Bypass `auth.getUser()` na trasach publicznych | `src/middleware.ts` |
| ISR **300 s** (5 min) | `src/app/(public)/layout.tsx`, `src/lib/website/constants.ts` |
| `maxDuration = 300` na cron ligowy | `src/app/api/cron/league-sync/route.ts` |
| Ingest tylko mecze **GLKS Mietków** (~33 zamiast 200) | `scripts/lib/league-live-pipeline.mjs` |
| Batch upsert `league_matches` | `scripts/lib/league-live-pipeline.mjs` |

Metryki po P0 (lokalnie): sync **~79 s → ~28 s**; warm TTFB `/` prod **~0,95 s → ~0,83 s**.

---

## 3. CURRENT PRODUCTION

| Pole | Wartość |
|------|---------|
| **Commit prod** | `b41d049` (20.5B.3 Club Management Stabilization) |
| **Branch** | `main` |
| **origin/main** | `b41d049` |
| **Production status** | **PASS** |
| **Tag checkpointu (20.3)** | `post-20-3-navigation-ux` → `af3a485` |
| **Checkpoint Club Management** | **20.5B.4 PASS** → `b41d049` |
| **Backup tag** | `pre-18-5-platform-complete` |
| **URL** | https://pilka-mu.vercel.app |
| **Region Vercel** | `fra1` |
| **Public multi-club** | ✅ `/` directory, `/piorun-wawrzenczyce`, `/pilot-club-test` |
| **Platform UI** | ✅ `/platform`, `/platform/monitoring`, `/platform/audit` |
| **Migracja 18.4a-db** | ✅ `20260604140000_hotfix_184adb_platform_club_writes.sql` na prod |

### Kluby w DB (2026-06-04)

| slug | status | Uwagi |
|------|--------|-------|
| `piorun-wawrzenczyce` | active | Klub produkcyjny |
| `pilot-club-test` | active | Smoke 18.4a (audit kompletny) |
| `release-184a-mpz313we` | onboarding | Klub testowy ze smoke 18.4a — **zarchiwizuj** przed 18.5 |

---

## 3b. SPRINT 18.x — PLATFORM & MULTI-CLUB (handoff)

| Sprint | Status | Dokumentacja |
|--------|--------|--------------|
| **18.1** Multi-Club Routing | ✅ prod | `docs/archive/18-early-platform/sprint-181-final-report.md` |
| **18.2** Create Club Wizard | ✅ kod | `docs/archive/18-early-platform/sprint-182-final-report.md` |
| **18.3** League Setup Wizard | ✅ kod | `docs/archive/18-early-platform/sprint-183-final-report.md` |
| **18.3d** availability_reasons hotfix | ✅ prod DB | `supabase/migrations/20260604120000_hotfix_183d_*.sql` |
| **18.4** Audyt operacyjny | 📋 tylko projekt | bez kodu |
| **18.4a** Dashboard + Activation | ✅ prod | `docs/archive/18-early-platform/sprint-184a-final-report.md` |
| **18.4a-db** RPC club writes | ✅ prod DB | `20260604140000_hotfix_184adb_platform_club_writes.sql` |
| **18.4b** Monitoring + Audit Center | ✅ prod | commit `ef7873e` |
| **PRE 18.5 backup** | ✅ complete | `docs/archive/audit/pre-18-5-backup-handoff.md` |

**Agent — czytaj obowiązkowo:** [`docs/ai/10-platform-admin-multi-club.md`](../ai/10-platform-admin-multi-club.md)

### Kluczowe pliki Platform (18.4a + 18.4b)

| Obszar | Plik |
|--------|------|
| Aktywacja | `src/lib/platform/club-activation.ts` |
| Dashboard | `src/lib/platform/dashboard.ts`, `platform-dashboard.tsx` |
| Monitoring | `src/lib/platform/monitoring.ts`, `health.ts` |
| Audit Center | `src/lib/platform/audit-center.ts`, `audit-center-view.tsx` |
| RPC writes | `src/lib/platform/club-db-writes.ts` |
| Actions | `src/features/platform/actions.ts` |
| Trasy | `src/app/(platform)/platform/monitoring/page.tsx`, `audit/page.tsx` |
| Migracja RPC | `supabase/migrations/20260604140000_hotfix_184adb_platform_club_writes.sql` |

### Następny krok operacyjny

1. **Sprint 18.5** — scope od użytkownika (backup już domknięty)
2. Archiwizacja klubu `release-184a-mpz313we`
3. Opcjonalnie: commit untracked `20260604120000_hotfix_183d_*.sql` jeśli brak na remote

---

## 4. LEAGUE HUB STATUS

### Źródła danych

| Źródło | Rola | Status |
|--------|------|--------|
| **90minut.pl** (`liga14526`) | Tabela + wyniki (primary) | ✅ Działa |
| **regionalnyfutbol.pl** | Terminarz + weryfikacja tabeli | ✅ Działa |
| **regiowyniki.pl** `/kadra/` | Nazwiska kadry (~29–30) | ✅ Działa |
| **regiowyniki.pl** protokoły `/mecz/` | Bramki per zawodnik | ⚠️ **Kod lokalny niezacommitowany** (`scripts/lib/regiowyniki-match-goals.mjs` + zmiany w `league-squad-sources.mjs`) |
| **mPZPN / competition-api-pro** | Pełne statystyki | ❌ Token JWT wygasa (~2 s); tylko ręczny import (`IMPORT-MPZPN.cmd`, JSON) |
| **90minut strzelcy/bilans** | B Klasa VII | ❌ 0 rekordów w HTML |

Konfiguracja: `scripts/lib/league-live-sources.mjs` → `LEAGUE_CONFIG`  
Mapowanie: **GLKS Mietków** (źródła) → **Piorun Wawrzeńczyce** (UI) via `league_teams`.

### Tabela

- Sync do `league_tables` + publiczna `/tabela` (`league_table_entries`).
- Ostatni znany stan (dry-run): **11. miejsce, 14 pkt, 24:63**.
- Konflikty punktów (90minut vs RF): m.in. Polonia Jaksonów, Zachód Sobótka — log w `league_sync_jobs.metadata`.

### Terminarz

- Scalanie: RF + wyniki 90minut → `league_matches` → moduł **Mecze** (`matches`).
- Po P0: zapis ingestu **tylko mecze z udziałem GLKS** (~33), nie cała liga (200).

### Kadra

- `league_player_registry` + sync do `players` (FC OS).
- Publicznie: `/druzyna` via RPC `get_public_players` (statystyki z `player_stats` + fallback `league_player_registry.notes`).
- ~30 aktywnych zawodników powiązanych z rejestrem (lokalny `verify-squad-registry.mjs`).

### Gole

- Na **main (prod)**: bramki w rejestrze tylko jeśli wcześniej zapisane w `notes` przy syncu; **bez** modułu Regiowyniki match goals na produkcji (nie w commicie).
- **Lokalnie (niezacommitowane)**: agregacja z ~19 protokołów → ~16 strzelców, **~15 bramek** vs **24** w tabeli drużyny (luka pokrycia).

### Cron

| Element | Wartość |
|---------|---------|
| Endpoint | `GET/POST /api/cron/league-sync` |
| `maxDuration` | **300** (wdrożone w P0) |
| Secret | `CRON_SECRET` na Vercel (+ `SUPABASE_SERVICE_ROLE_KEY`) |
| Harmonogram w **git `main`** | `0 6 */3 * *` — **co 3 dni** 06:00 UTC |
| Harmonogram **lokalnie** (niezacommitowany `vercel.json`) | `0 6 * * *` — codziennie |

**Uwaga:** Zweryfikuj w Vercel Dashboard → Cron Jobs, który harmonogram jest aktywny.

### Ograniczenia

- Brak oficjalnego API PZPN — tylko mirrory HTML.
- mPZPN wymaga ręcznego tokenu lub importu JSON.
- Regiowyniki: nie wszystkie mecze mają linki na stronie drużyny.
- `matchClubPlayer()` — tylko exact match imię+nazwisko (brak UI dopasowania).
- Cron E2E na prod — wymaga testu z `CRON_SECRET`.

Dokumentacja sync: `docs/modules/stage-15b-live-sync.md`, `docs/modules/stage-15b-league-hub.md`

---

## 5. WEBSITE STATUS

### Co działa

| Obszar | Trasy / moduł |
|--------|----------------|
| Strona główna | `/` — `PublicLandingHome` + season hub, top strzelcy, tabela skrót |
| Kadra | `/druzyna` |
| Mecze | `/mecze` |
| Tabela | `/tabela` |
| Aktualności | `/aktualnosci`, `/aktualnosci/[slug]` |
| Galeria | `/galeria`, `/galeria/[slug]` |
| Kontakt, sponsorzy, kibic | `/kontakt`, `/sponsorzy`, `/kibic` |
| CMS | `/website/*` (panel) |
| ISR | **300 s** na segmencie `(public)` |
| Middleware | Public bypass auth (P0) |

### Co zostało usunięte / zastąpione

- Osobna sekcja **„Klub w liczbach”** na homepage (3.0) — scalone w hero.
- Stary layout **PublicFacebookHome** — komponent istnieje (`public-facebook-home.tsx`), **nie jest używany** na `/` (zastąpiony przez `PublicLandingHome`).
- Admin cards na dashboardzie (15.10C).
- Martwy kod z auditu 15.10A (m.in. notification-queue).
- Demo seed newsów (8 wpisów) — usunięte w P1 **lokalnie**; sprawdź prod.
- Hardcoded monogram „PW” — zastąpiony logo z CMS / crest.

### Znane problemy

| Problem | Priorytet |
|---------|-----------|
| Homepage: **~15–20 zapytań Supabase** + wiele `createSignedUrl` na request | P1 |
| Duplikat `resolvePublicCoverImageUrl` (layout + page) | P1 |
| `getPublicPlayers()` na `/` tylko dla top 5 strzelców — ciężkie RPC | P1 |
| Treść demo / stock w `website_media` na prod (jeśli P1 nie wdrożony) | P1 |
| Galeria albumowa: broken storage bez uploadu | P2 |
| Regiowyniki goals — kod poza `main` | P1 |
| mPZPN auto-sync niemożliwy | znane ograniczenie |
| `vercel.json` cron daily vs `main` co 3 dni — rozjazd | P2 |

---

## 6. CLUB IDENTITY

### Piorun Wawrzeńczyce

| Pole | Wartość |
|------|---------|
| **Nazwa publiczna** | Piorun Wawrzeńczyce |
| **Nazwa oficjalna / ligowa** | GLKS Mietków |
| **Slug** | `piorun-wawrzenczyce` |
| **Liga (seniorzy)** | B Klasa DZPN — Wrocław VII — sezon 2025/2026 |
| **Hasło** | *Od Skrzata do Seniora — jedna rodzina, jeden klub* |

### Kolory

| Token | Hex | Użycie |
|-------|-----|--------|
| Primary (zieleń klubu) | `#0B3D2E` | Nagłówki, sidebar, akcenty |
| Secondary (złoto) | `#F4C430` | CTA, podkreślenia |
| Scena ciemna public | `#062820` | Sekcje matchday / dark subpages |
| Accent | `#FFFFFF` | Tekst na ciemnym |

Źródło w kodzie: `src/lib/website/constants.ts` (`DEFAULT_WEBSITE_COLORS`), `website_settings` w Supabase.

### Źródło prawdy (Facebook)

- **Profil:** https://www.facebook.com/profile.php?id=61560486822886  
- Import zdjęć: `scripts/import-piorun-facebook.mjs` (`npm run import:facebook`) — Playwright, CDN FB blokuje fetch serwerowy.  
- DNA wizualne: `docs/archive/audit/piorun-visual-dna.md`

### Styl komunikacji

- Ciepły, lokalny, rodzinny, energiczny (tytuły mogą być CAPS jak plakat meczowy).
- „My”, „nasz klub” — nie korporacyjny ton.
- Telefon: **+48 663 595 991**
- Pełny przewodnik: `docs/archive/audit/piorun-brand-content-guide.md`

---

## 7. OPEN TASKS

### P0 (przed / na początku Sprint 18.5)

1. ~~Push + deploy 18.4b~~ — ✅ done (`ef7873e`)
2. ~~Backup PRE 18.5~~ — ✅ done — patrz `pre-18-5-backup-handoff.md`
3. **Offsite copy** archiwum `.7z` — operator (poza repo)
4. **Archiwizacja** klubu `release-184a-mpz313we`
5. **Visual smoke** Platform Admin (login manual ~30 s)

### P1 (następne po P0 — wydajność + dane)

1. **`get_public_home_bundle()`** — jeden RPC zamiast 6–7 na homepage (projekt w audycie 16.0, bez implementacji).
2. **`get_public_top_scorers(slug, 5)`** — nie ładować całej kadry na `/`.
3. **Commit + deploy** integracji `regiowyniki-match-goals.mjs` (bramki z protokołów).
4. **Ujednolicić `vercel.json` cron** — codziennie vs co 3 dni (decyzja produktowa).
5. **Real Content na prod** — jeśli P1 import tylko lokalny: logo, FB zdjęcia, newsy, sponsorzy.
6. **Usunąć duplikaty** cover/logo signed URL na homepage.

### P2

1. **League Player Matching 16.1** (projekt poniżej) — UI w `/league`, confidence %, ręczne zatwierdzenie.
2. Rozszerzyć listę ID meczów Regiowyniki (terminarz ligi) — domknięcie bramek 15→24.
3. Równoległe pobieranie protokołów Regiowyniki (limit 5) — krótszy sync.
4. Batch `createSignedUrls` w Storage API.
5. Cron E2E test + alert przy `league_sync_jobs.status = failed`.
6. `next/image` na hero (bez zmiany layoutu).

### P3

1. Edge/cache dla `/tabela`, `/druzyna` (dane zmieniają się raz dziennie).
2. Indeksy DB: `matches(club_id, status, match_date)`, `league_table_entries(...)`.
3. Odroczenie rejestracji Serwist SW.
4. Oficjalne API PZPN — gdy dostępne, zastąpić mirrory.

---

## 8. NEXT RECOMMENDED SPRINT

### LEAGUE PLAYER MATCHING 16.1

**Cel:** Spójność **FC OS `players`** ↔ **`league_player_registry`** bez ręcznego grzebania w ID.

**Zakres (projekt, bez kodu w tym dokumencie):**

| Element | Opis |
|---------|------|
| Algorytm | Exact → odwrócone imię/nazwisko → inicjał → Levenshtein nazwiska |
| Progi | ≥95% auto-link; 60–94% sugestia; &lt;60% unmatched |
| Schema | `match_status`, `match_confidence` na `league_player_registry`; opcjonalnie `league_player_match_suggestions` |
| UI | Panel `/league` — lista: Liga \| FC OS \| % \| Zatwierdź / Odrzuć / Wybierz |
| Bulk | „Zatwierdź wszystkie ≥95%” |

**Nie zmienia** layoutu strony publicznej.

**Po 16.1:** Etap B wydajności (`get_public_home_bundle`) lub domknięcie Regiowyniki goals na `main`.

---

## 9. DO NOT REPEAT

Kolejny agent **nie powinien ponownie proponować** (już zrobione lub odrzucone):

- [ ] Sprint 15.10A — RBAC bottom nav, Coach Day, injury portal nav, martwy kod
- [ ] Club Identity 15.10B — logo, kolory panelu, crest
- [ ] Layout 15.10C — dashboard redesign (hero, visuals)
- [ ] Public Website 2.0 / 3.0 / 4.0 — przebudowa layoutu homepage
- [ ] Ujednolicenie **dark matchday** na podstronach publicznych
- [ ] Live league sync pipeline (90minut + RF + regiowyniki kadra) — bazowy kanał
- [ ] Mapowanie GLKS Mietków → Piorun Wawrzeńczyce
- [ ] RPC `get_public_players` fix (statystyki z registry)
- [ ] Naprawa duplikatów dat meczów / encoding w wynikach
- [ ] **P0 Sprint 16.0** — middleware bypass, ISR 300, maxDuration 300, GLKS filter ingest, batch upsert
- [ ] Deploy P0 na prod (`aee9d4f`)
- [ ] Audyt „czy public wywołuje getUser” — potwierdzone i naprawione w P0
- [ ] Propozycja „dodaj cron co 3 dni” bez sprawdzenia `vercel.json` / Vercel Dashboard
- [ ] Propozycja „napraw 0 bramek” przez samo odświeżenie tokenu mPZPN bez Regiowyniki / importu JSON
- [ ] Przebudowa dashboardu lub nowe moduły „na szybko”
- [ ] Powrót do layoutu **PublicFacebookHome** na `/`
- [ ] Osobna sekcja „Klub w liczbach” na dole homepage
- [ ] Sprint **18.1** — multi-club routing, directory `/`, middleware
- [ ] Sprint **18.2** — Create Club wizard, `createClub()`
- [ ] Sprint **18.3** — League Setup wizard
- [ ] Hotfix **18.3d** — `availability_reasons` full unique index
- [ ] Sprint **18.4a** — platform dashboard, club activation gates, activation card
- [ ] Hotfix **18.4a-db** — RPC `platform_set_club_status` / `platform_append_club_audit`
- [ ] Sprint **18.4b** — monitoring, audit center, health dashboard (`ef7873e`)
- [ ] **PRE 18.5 backup** — tag, dump, ENV, manifest, offsite `.7z`
- [ ] Audyt **18.4** — mapa operatora (tylko dokumentacja, bez implementacji)
- [ ] Ponowne „dodaj aktywację klubu” — jest w 18.4a
- [ ] Ponowne „dodaj monitoring platform” — jest w 18.4b
- [ ] Surowy `UPDATE clubs SET status` z panelu — używaj RPC (`club-db-writes.ts`)

---

## 10. KNOWN DECISIONS

| Decyzja | Uzasadnienie |
|---------|--------------|
| **Multi-tenant SaaS** | Jeden kod, `siteConfig.defaultClubSlug` → Piorun jako tenant referencyjny |
| **Mirror sync zamiast API PZPN** | Brak stabilnego public API; 90minut + RF + Regiowyniki |
| **Tabela z 90minut (primary)** | Wyższa zgodność z mPZPN; RF do terminarza i weryfikacji |
| **Dwie nazwy drużyny** | GLKS w źródłach, Piorun na stronie — `league_teams.league_name` / `display_name` |
| **Statystyki zawodników w `league_player_registry.notes` (JSON)** | Tymczasowe przed pełnym API / matchingiem |
| **Service role tylko w skryptach sync + cron** | Nie w bundle klienta |
| **Public ISR 300 s** (po P0) | Cron ligowy ~1×/dobę; CMS `revalidatePath` przy publikacji newsów |
| **Public routes bez auth middleware** | Wydajność; ochrona tylko dashboard/API |
| **Ingest tylko mecze GLKS** (P0) | Mniej DB ops, szybszy sync, mniej szumu w `league_matches` |
| **Brak auto mPZPN w cron** | Token wygasa; ręczny import / JSON |
| **Treść z Facebooka jako źródło prawdy wizualnego** | Nie stock / nie SVG demo w docelowym stanie |
| **Bez ETAPU 15.11** | Zamrożone — tylko stabilizacja i treść |
| **Platform club writes przez RPC** | Trigger `protect_club_columns` — bypass tylko `fcos.platform_club_write` w RPC |
| **`clubs.status = active` wymagany na public** | Onboarding checklist ≠ aktywacja publiczna |
| **Create Club / League Setup bez przebudowy** | 18.4a tylko dashboard + activation; wizards z 18.2/18.3 |

---

## START HERE

Instrukcja dla **nowego agenta** po otwarciu repozytorium:

### Krok 0 — Baza wiedzy (obowiązkowe)

Przeczytaj **[`docs/ai/README.md`](../ai/README.md)** — pełna architektura, struktura strony, moduły, liga, DB, zasady.

Jeśli pracujesz nad **Platform Admin / multi-club / onboarding klubu**, przeczytaj też:

- **[`docs/ai/10-platform-admin-multi-club.md`](../ai/10-platform-admin-multi-club.md)**
- **[`docs/archive/18-early-platform/sprint-184a-final-report.md`](../archive/18-early-platform/sprint-184a-final-report.md)**

Ten handoff to **stan na dziś**; `docs/ai/` to **jak działa cały system**.

### Krok 1 — Kontekst (5 min)

1. Przeczytaj ten plik do końca.
2. Przeczytaj `docs/archive/audit/piorun-brand-content-guide.md` jeśli dotykasz treści publicznych.
3. Sprawdź `git status` — **dużo niezacommitowanego** (LNP, regiowyniki goals, probes, `vercel.json`) — **nie commituj bez polecenia użytkownika**.

### Krok 2 — Środowisko

```bash
npm install
cp .env.example .env.local   # uzupełnij Supabase
npm run validate:env
npm run typecheck
```

Wymagane w `.env.local`: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` (sync/cron lokalnie).

### Krok 3 — Zweryfikuj produkcję

- Otwórz https://pilka-mu.vercel.app — `/`, `/druzyna`, `/tabela`.
- GitHub: `gh run list --branch main -L 3`
- Vercel: ostatni deployment = commit `b41d049` (20.5B.3 Club Management Stabilization).

### Krok 4 — Zweryfikuj ligę

```bash
npm run sync:league-live:dry-run
node scripts/verify-squad-registry.mjs   # jeśli masz .env.local
```

Porównaj wynik z sekcją 4 tego dokumentu.

### Krok 5 — Zaplanuj sprint

- **Sprint 20.5C.1** — CSV Export + Multi Select (rekomendacja po 20.5B.4 PASS).
- **Club Management handoff:** [`project-handoff-20.5-club-management.md`](./project-handoff-20.5-club-management.md)
- **Rekomendacja produktowa (liga):** **League Player Matching 16.1** (sekcja 8).
- **Rekomendacja techniczna:** Regiowyniki goals + `get_public_home_bundle` — patrz P1.
- **Backup checkpoint:** `docs/archive/audit/pre-18-5-backup-handoff.md` — nie powtarzaj bez polecenia.

### Krok 6 — Zasady pracy z użytkownikiem

- **Nie** dodawaj funkcji / nie przebudowuj layoutu bez wyraźnej prośby.
- **Nie** commituj / pushuj / deployuj bez polecenia.
- PowerShell: używaj `npm.cmd` lub `node scripts/...` (unikaj blokady `npm.ps1`).
- mPZPN: `IMPORT-MPZPN.cmd` / `node scripts/discover-lnp-setup.mjs` — token krótkotrwały.

### Kluczowe pliki

| Obszar | Plik |
|--------|------|
| Sync ligowy | `scripts/sync-league-live.mjs`, `scripts/lib/league-live-pipeline.mjs` |
| Źródła | `scripts/lib/league-live-sources.mjs`, `scripts/lib/league-squad-sources.mjs` |
| Cron | `src/app/api/cron/league-sync/route.ts`, `vercel.json` |
| Public data | `src/lib/website/public-data.ts` |
| Homepage | `src/app/(public)/page.tsx`, `src/features/website/components/public-landing-home.tsx` |
| Middleware | `src/middleware.ts` |
| Konfig klubu | `src/config/site.ts`, `scripts/lib/league-live-sources.mjs` → `LEAGUE_CONFIG` |
| Platform admin | `src/lib/platform/`, `src/features/platform/`, `src/app/(platform)/` |
| Multi-club public | `src/lib/tenant/public-club.ts`, `src/middleware.ts` |

---

## 11. INDEKS DOKUMENTACJI DLA AGENTA (2026-06-06)

| Temat | Plik |
|-------|------|
| **START — stan na dziś** | Ten plik (sekcja 0) |
| **Changelog / 20.3** | `CHANGELOG.md` |
| **Platform handoff 20.1** | `docs/architecture/project-handoff-20.1.md` |
| **Navigation v2 (20.3)** | `docs/architecture/navigation-v2-proposal.md` |
| **Archiwum sprintów** | `docs/archive/` |
| **Backup PRE 18.5** | `docs/archive/audit/pre-18-5-backup-handoff.md` |
| Architektura produktu | `docs/ai/README.md` + `01`–`09` |
| Platform Admin 18.x | `docs/ai/10-platform-admin-multi-club.md` |
| Raport 18.4a | `docs/archive/18-early-platform/sprint-184a-final-report.md` |
| Rollback / PITR | `docs/archive/17x-infrastructure/sprint-176-rollback-runbook.md` |
| Raporty 18.1–18.3 | `docs/archive/18-early-platform/sprint-181` … `183-final-report.md` |
| Liga / sync | `docs/ai/07-league-hub-sync.md`, `docs/modules/stage-15b-live-sync.md` |
| Zasady agenta | `docs/ai/09-agent-rules.md`, `AGENTS.md` |
| Transkrypt sesji 18.4a | `.cursor/.../agent-transcripts/5d851b90-7784-4802-8f9b-c5f72e0a4bcb.jsonl` |

---

*Dokument wygenerowany w ramach przekazania projektu FC OS. Aktualizuj po każdym wdrożonym sprincie.*
