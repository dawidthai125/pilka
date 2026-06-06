# Raport audytu architektury — ETAP 11.5

**Data:** 2026-05-31  
**Zakres:** Football Club OS po ETAPACH 1–11  
**Typ:** Analiza, optymalizacja, gotowość produkcyjna — **bez nowych funkcji**  
**Weryfikacja techniczna:** `npm run typecheck` ✅ · `npm run build` ✅ (85 tras)

---

## Streszczenie wykonawcze

Projekt ma **spójną architekturę multi-tenant** (87 tabel, `club_id` na 84/87, 40+ helperów RLS, Server Actions + RLS). Moduły 1–11 są funkcjonalnie kompletne dla klubu referencyjnego (Piorun Wawrzeńczyce).

**Najważniejsze ryzyka przed produkcją:**

1. **P0 — RLS modułu zawodników:** rodzic i zawodnik widzą **cały skład klubu** (nie tylko siebie/dziecko) — akademia i finanse są poprawnie odseparowane, ETAP 2 nie.
2. **P1 — Brak scope’u trenera na drużyny** — trener ma dostęp club-wide (RLS + aplikacja).
3. **P1 — Wydajność:** sync przypomnień treningów/sponsorów przy każdym ładowaniu layoutu; pełny kontekst AI przy każdej wiadomości.
4. **P2 — Niespójności danych:** `player_stats` vs `match_player_stats` bez automatycznego rollupu.

**Rekomendacja:** ETAP 12 powinien być wyłącznie **utwardzeniem bezpieczeństwa i wydajności** — bez nowych modułów biznesowych.

---

## 1. Audyt bazy danych

### 1.1 Inwentaryzacja (87 tabel)

| Moduł | Etap | Tabele | `club_id` |
|-------|------|--------|-----------|
| Fundament | 1 | 4 | 2/4 (profiles, clubs bez) |
| Zawodnicy | 2 | 6 | 6/6 |
| Treningi | 3 | 5 | 5/5 |
| Mecze | 4 | 7 | 7/7 |
| AI | 5 | 5 | 4/5 (kategorie globalne) |
| Sponsorzy | 6 | 10 | 10/10 |
| Finanse | 7 | 10 | 10/10 |
| Magazyn | 8 | 13 | 13/13 |
| Strona WWW | 9 | 5 | 5/5 |
| Integracje | 10 | 10 | 10/10 |
| Akademia | 11 | 12 | 12/12 |

Wzorzec: denormalizowany `club_id` na każdym wierszu dziecka + 50+ triggerów `enforce_*_club_consistency`.

### 1.2 Duplikujące się / nakładające się struktury

| Obszar | Tabele | Ocena | Ryzyko |
|--------|--------|-------|--------|
| Statystyki sezonowe | `player_stats` ↔ `match_player_stats` | Celowe, brak sync | **Rozjazd danych** |
| MVP meczu | `matches.mvp_player_id` + `match_mvp_history` | Duplikat faktu | Niski (akcje aktualizują oba) |
| Liga zewnętrzna | `external_*` ↔ `matches` / `league_table_entries` | Staging → canonical | Akceptowalne |
| Finanse sponsorów | `sponsor_financial_entries` ↔ `finance_income` | Równoległe księgi | Raportowanie podwójne |
| Publikacje | `sponsor_publications` ↔ `website_news` | Dwa kanały | UX confusion |
| Kluby zewnętrzne | `scouting_clubs` ↔ `integration_club_mappings` | Brak FK | Duplikacja nazw |
| Historia zawodnika | `player_club_history` ↔ `player_team_transitions` | Nakładające się timeline | Niski |
| Oceny / notatki | `player_coach_notes`, `training_session_notes`, `player_assessments`, `scouting_reports` | 4 systemy ocen/notatek | Złożoność UX |
| Grupy vs drużyny | `academy_groups` ↔ `teams` | Mirror + `academy_group_staff` | Staff niewykorzystany w UI |

**Nie ma literalnych duplikatów tabel** — są **konceptualne nakładania**, typowe dla szybkiego rozwoju modułowego.

### 1.3 Nieużywane / niedopięte elementy schematu

| Element | Dowód |
|---------|-------|
| `academy_group_staff` | Seed w migracji; **zero** odczytów/zapisów w `src/` |
| `sponsors.show_on_website`, `public_tier`, `public_description` | RPC publiczny + seed; brak UI edycji w panelu sponsorów |
| `clubs.settings` JSONB | Brak odczytu/zapisu w aplikacji |
| `scouting_players.linked_player_id` | Brak flow konwersji prospect → zawodnik |
| `profiles.locale` | Odczyt w sesji; brak i18n |

**Rekomendacja:** nie usuwać tabel (breaking); w ETAP 12–14 **podpiąć UI** lub oznaczyć jako deprecated w dokumentacji.

### 1.4 Brakujące indeksy (priorytet)

| Priorytet | Tabela / kolumny | Powód |
|-----------|------------------|-------|
| P1 | `integration_club_mappings (club_id)` | Sync na każdym imporcie |
| P1 | `sync_logs (sync_job_id)`, `(club_id, integration_id, started_at)` | Logi synchronizacji |
| P1 | `sync_conflicts (sync_log_id)` | FK cascade |
| P2 | `player_coach_notes (club_id, player_id, created_at)` | Profil zawodnika |
| P2 | `training_session_notes (club_id, training_id)` | Szczegóły treningu |
| P2 | `sponsor_publication_links (publication_id)`, `(sponsor_id)` | Detale sponsora |
| P2 | `club_notifications (club_id, user_id, scheduled_at)` | Powiadomienia |
| P2 | `club_memberships (club_id, team_id)` WHERE team_id NOT NULL | Scope trenera (przyszły) |
| P2 | `player_stats (club_id, season)` | RPC publiczne |

Dobrze pokryte: kalendarz meczów/treningów, finanse, magazyn, academy (post-audit).

### 1.5 Ciężkie zapytania

| Loader | Plik | Problem |
|--------|------|---------|
| `getTalentRanking` | `src/lib/academy/loaders.ts` | Full-club scan: players + development + assessments + history |
| `getMatchDetail` | `src/lib/auth/session.ts` | 7+ zapytań + `getAttendanceStats("season")` |
| `getCoachDashboard` | `src/lib/auth/session.ts` | Sezonowa frekwencja całego klubu |
| `buildAiClubContext` | `src/lib/ai/context.ts` | ~25 zapytań + nieograniczona historia academy |
| `getFinanceBudgets` | `src/lib/auth/session.ts` | Do 5000 wierszy expenses w JS |
| `syncTrainingReminders` | `src/lib/auth/session.ts` | Write-on-read przy każdym layout |

---

## 2. Audyt relacji

### 2.1 One-To-One

| Relacja | Implementacja | Uwagi |
|---------|---------------|-------|
| Klub ↔ `website_settings` | `website_settings.club_id` PK | Poprawny 1:1 |
| Klub ↔ zawodnik (profil rozwoju) | `player_development` UNIQUE `(club_id, player_id)` | OK |
| Klub ↔ zawodnik (strój) | `inventory_player_kits` UNIQUE `(club_id, player_id)` | OK |
| Mecz ↔ MVP history | `match_mvp_history.match_id` UNIQUE | OK |
| Klub ↔ integracja per provider | `integrations` UNIQUE `(club_id, provider)` | OK |

### 2.2 One-To-Many (dominujący wzorzec)

```
clubs ─┬─ teams ─┬─ players ─┬─ player_*
       │         ├─ trainings ─┬─ training_*
       │         └─ matches ───┬─ match_*
       ├─ sponsors ─── sponsor_*
       ├─ finance_*
       ├─ inventory_*
       ├─ academy_*
       └─ integrations ─── external_*, sync_*
```

Wszystkie relacje dziedziczą `club_id` — spójne z multi-tenant.

### 2.3 Many-To-Many (junction tables)

| Junction | Encje | UNIQUE constraint |
|----------|-------|-------------------|
| `match_squad` | match ↔ player | `(match_id, player_id)` |
| `training_attendance` | training ↔ player | `(training_id, player_id)` |
| `training_availability` | training ↔ player | `(training_id, player_id)` |
| `sponsor_publication_links` | publication ↔ sponsor | brak composite UNIQUE — **ryzyko duplikatów** |
| `player_guardians` | player ↔ profile (rodzic) | `(club_id, player_id, profile_id)` |
| `academy_group_staff` | group ↔ profile | `(group_id, profile_id, staff_role)` |
| `inventory_kit_assignments` | player ↔ item | brak strict UNIQUE |

### 2.4 Niepotrzebne relacje / możliwe uproszczenia

| Propozycja | Wartość | Kiedy |
|------------|---------|-------|
| Scalanie `player_stats` rollup z `match_player_stats` | Wysoka | ETAP 14 — jeden source of truth |
| Wspólna tabela `external_clubs` dla scouting + integrations | Średnia | ETAP 18+ — duży refactor |
| Usunięcie `match_mvp_history` na rzecz tylko `matches.mvp_player_id` | Niska | Wymaga migracji historii |
| `academy_groups.team_id` jako jedyne źródło grup | Średnia | Gdy UI staff będzie gotowe |

**Na obecną skalę (1 klub testowy):** relacje są **poprawne i wystarczające**. Uproszczenia mają sens dopiero przy 100+ klubach lub refaktorze danych.

---

## 3. Audyt multi-tenant

### 3.1 Gotowość skalowania

| Skala | Ocena | Uzasadnienie |
|-------|-------|--------------|
| **10 klubów** | ✅ Gotowe | RLS + indeksy `(club_id, …)` wystarczają |
| **100 klubów** | ⚠️ Warunkowo | Wymaga: cache AI, cron zamiast sync-on-read, limity list, indeksy integracji |
| **1000 klubów** | ❌ Niegotowe | Brak: multi-club session picker, connection pooling strategy, read replicas, rate limits AI, platform admin, billing per tenant |

### 3.2 Izolacja między klubami

| Mechanizm | Status |
|-----------|--------|
| `user_club_ids()` w RLS | ✅ Spójne we wszystkich modułach |
| Triggery spójności `club_id` | ✅ 50+ triggerów |
| Anon revoke + GRANT authenticated | ✅ `20260531140000_security_hardening.sql` |
| Cross-club w aplikacji | ✅ `requireAccessContext()` z jednym `clubId` |
| Public RPC | ✅ `get_public_*` z walidacją `website_is_public` |

**Luka:** aplikacja operuje na **jednym klubie na sesję** (hardcoded/default w loaderach seed). Brak UI wyboru klubu dla użytkownika multi-club — wymagane przed SaaS.

### 3.3 Przegląd RLS (skrót)

Moduły z **row-level scoping** (wzorzec docelowy):
- Akademia: `actor_can_read_development_row`
- Finanse portal: `parent_player_ids`
- Magazyn portal: `actor_can_read_own_inventory`
- Sponsor: `actor_can_access_sponsor_row`

Moduły **club-wide read** (wymagają poprawy dla zawodnik/rodzic/trener):
- `players`, `player_documents`, `player_injuries`, `player_stats`
- `trainings`, `matches` (dla ról player/parent)

---

## 4. Audyt Supabase

### 4.1 PostgreSQL

| Aspekt | Stan |
|--------|------|
| Tabele | 87 |
| RLS | Włączone na wszystkich tabelach biznesowych |
| RPC | 10+ funkcji agregujących (finance, inventory, public, academy) |
| Migracje | 38 plików SQL, audyt per moduł |
| Seed | Per moduł (Piorun Wawrzeńczyce) |

**Limity Supabase (Free → Pro):**
- Free: 500 MB DB, 50k MAU auth — **1 klub OK**
- 100 klubów: ~50–200 MB danych operacyjnych (szacunek) — Pro wystarczy
- 1000 klubów: wymaga Pro/Team + monitoring rozmiaru, archiwizacja `sync_logs`, `ai_messages`

### 4.2 Storage

| Bucket | Polityki | Użycie |
|--------|----------|--------|
| `club-assets` | Path-based RLS per moduł | Zawodnicy, WWW, finanse, magazyn |

**Koszt:** ~$0.021/GB/miesiąc + egress. Przy 100 klubach × 500 MB ≈ 50 GB → ~$1/miesiąc storage (niski).

**Limity:** brak walidacji rozmiaru per-klub (global 10 MB per file w bucket policy).

### 4.3 Realtime

**Nieużywany** — brak `.channel()` / `.subscribe()` w kodzie.

**Rekomendacja:** ETAP 15 — powiadomienia na żywo; do tego czasu polling/in-app notifications (`club_notifications`).

### 4.4 Auth

| Wzorzec | Plik |
|---------|------|
| SSR cookies | `@supabase/ssr` |
| Middleware | `src/middleware.ts` — session gate |
| OAuth callback | `src/app/auth/callback/route.ts` |
| Role | `club_memberships.role` enum (11 ról) |

**Koszt Auth:** MAU-based. 100 klubów × 30 użytkowników = 3000 MAU — Free tier może nie wystarczyć.

**Luka:** `/academy` brak w `protectedPrefixes` middleware (mitigacja: layout dashboard).

---

## 5. Audyt OpenAI

### 5.1 Architektura

| Element | Wartość |
|---------|---------|
| Model domyślny | `gpt-4o-mini` |
| Max wiadomość | 4000 znaków |
| Historia | 20 wiadomości |
| Kontekst | Pełny JSON klubu (`buildAiClubContext`) |
| Storage | `ai_conversations`, `ai_messages`, `ai_reports`, `ai_suggestions` |
| Streaming | Brak |

### 5.2 Zapytania na akcję użytkownika

| Akcja | OpenAI | DB reads |
|-------|--------|----------|
| Wiadomość chat | 1 | ~25–30 |
| Raport meczowy/treningowy | 1 | context + encja |
| Raport sponsor/finance/inventory | 0–1 | mniejszy JSON |
| `syncAiSuggestions` | 0 | pełny context (~25) |

### 5.3 Szacunkowe koszty (gpt-4o-mini ~$0.15/1M input, $0.60/1M output)

**Założenia:** 500 wiadomości AI/miesiąc/klub, ~5k tokenów input + 800 output na wiadomość.

| Skala | Wiadomości/mies. | Szacunek kosztu OpenAI |
|-------|------------------|------------------------|
| **1 klub** | 500 | **~$0.60–1.50/mies.** |
| **10 klubów** | 5 000 | **~$6–15/mies.** |
| **100 klubów** | 50 000 | **~$60–150/mies.** |

+ raporty (~50/mies./klub × 8k tokenów) → +30–50% kosztu.

### 5.4 Rekomendacje optymalizacji

1. **Cache kontekstu** (TTL 5–15 min per club) — redukcja DB reads o ~90% przy chacie.
2. **Slim context** — wysyłać tylko moduł pytany (matches vs finance vs academy).
3. **Cap `player_development_history`** w `buildAcademyAiContext` (np. ostatnie 50 wpisów).
4. **Usunąć `syncAiSuggestions` z page load** (`/ai/suggestions`) — regresja vs ETAP 5.
5. **`max_tokens`** na output — kontrola kosztów raportów.
6. **Background job** dla sugestii AI zamiast sync-on-read.
7. **Plan SaaS:** limity tokenów AI per klub/plan.

---

## 6. Audyt wydajności

### 6.1 Hotspoty (P0–P2)

| P | Problem | Lokalizacja | Wpływ |
|---|---------|-------------|-------|
| P0 | Sync przypomnień treningów przy każdym layout | `getDashboardContext` | Write-on-read, opóźnienie TTFB |
| P0 | Sync przypomnień sponsorów przy wejściu na `/sponsors` | `sponsors/page.tsx` | j.w. |
| P1 | Pełny kontekst AI bez cache | `lib/ai/context.ts` | DB + latency + koszt |
| P1 | `getMatchDetail` + sezonowa frekwencja | `session.ts` | Wolna strona meczu |
| P1 | `getTalentRanking` sekwencyjne zapytania | `academy/loaders.ts` | Wolny ranking |
| P1 | `getPlayers()` cały klub na stronie meczu | `matches/[id]/page.tsx` | Nadmierny transfer |
| P2 | `getAiReports` bez limit | `session.ts` | Rośnie w czasie |
| P2 | N× `useActionState` w `match-detail-view` | Hydration + re-render | UX mobile |

### 6.2 Frontend — niepotrzebne renderowania

- `match-detail-view.tsx` — jeden duży client boundary; drag formation re-renderuje całość.
- `ai-chat-view.tsx` — brak optimistic UI; pełny RSC refresh po wiadomości.
- Kalendarze meczów/treningów — `router.push` = pełny server refetch (zamierzone, ale ciężkie).

### 6.3 Pozytywne wzorce

- React `cache()` w loaderach (dedup w ramach requestu).
- `Promise.all` w detail pages (player, training, match partial, academy).
- Suspense na listach meczów/treningów/AI.
- RPC agregujące (finance dashboard, inventory stats, team_development_average).

---

## 7. Audyt bezpieczeństwa

### 7.1 Macierz zgodności ze specyfikacją

| Wymaganie | RLS | Aplikacja | Werdykt |
|-----------|-----|-----------|---------|
| Sponsor nie widzi danych zawodników | ✅ | ✅ (nav + brak player:read) | **PASS** |
| Rodzic tylko własne dziecko | ❌ club-wide players | ❌ pełna lista `/players` | **FAIL P0** |
| Zawodnik tylko własne dane | ❌ club-wide | ❌ pełna lista | **FAIL P0** |
| Trener tylko swoje drużyny | ❌ club-wide | ❌ brak filter team_id | **FAIL P1** |
| Izolacja klubów | ✅ | ✅ | **PASS** |

**Wyjątki poprawnie zaimplementowane (post ETAP 11 audit):**
- Akademia: `actor_can_read_development_row` + guards w UI
- Finanse portal: `parent_player_ids`
- Magazyn portal: własny sprzęt zawodnika

### 7.2 Storage

| Ścieżka | SELECT | WRITE |
|---------|--------|-------|
| `{club_id}/players/{player_id}/…` | `actor_can_read_players` | `actor_can_manage_players` |
| `{club_id}/website/…` | Public read | CMS roles |
| `{club_id}/finance/…` | Finance read | Finance manage |
| `{club_id}/inventory/…` | Inventory read | Inventory manage |

Path validation w audit hardening — OK.

### 7.3 API

- Brak REST API (`src/app/api/*` poza OAuth callback).
- Mutacje przez Server Actions + RLS JWT — **bezpieczny wzorzec**.
- `supabase/admin` (service role) **nieużywany** w kodzie aplikacji — OK.

### 7.4 Niespójności app vs RLS

| Rola | App permissions | RLS |
|------|-----------------|-----|
| Treasurer | `player:read` | **Deny** players |
| Scout | `player:read` | **Deny** players |
| Player/Parent | `player:read` | **Allow all club** (za szeroko vs spec) |

---

## 8. Audyt frontend

### 8.1 Spójność UI

| Aspekt | Ocena |
|--------|-------|
| Design system | Shadcn UI + Tailwind 4 — spójne |
| Nawigacja modułowa | Sub-nav per moduł (academy, integrations, finance…) — spójne |
| Badge/status | Wzorzec `*-status-badge.tsx` per moduł |
| Formularze | Server Actions + `useActionState` — spójne |
| Tabele vs karty mobile | Nowsze moduły (academy, integrations) — wzorzec `md:hidden` / `hidden md:block` |
| Starsze moduły | Częściowo tylko desktop table |

### 8.2 Dostępność

| Aspekt | Stan |
|--------|------|
| Touch targets 44px | Academy, integrations, część finance/inventory — **nie wszędzie** |
| Focus states | Shadcn defaults |
| ARIA | Podstawowe (brak audytu axe) |
| Kontrast | CSS variables — OK |

### 8.3 Responsywność

| Urządzenie | Ocena | Uwagi |
|------------|-------|-------|
| Desktop | ✅ | Pełna funkcjonalność |
| Tablet | ✅ | Gridy `md:`/`lg:` |
| Telefon | ⚠️ | Match detail (formacja), niektóre tabele bez card fallback; sub-nav scroll OK |

---

## 9. Audyt Vercel

| Aspekt | Stan |
|--------|------|
| `vercel.json` | `buildCommand: npm run build`, Next.js 15 |
| Build | ✅ 85 tras, middleware 106 kB |
| Env validation | `validate-env.mjs` — wymaga 3× `NEXT_PUBLIC_*` |
| Brak w validate-env | `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD` (OK — opcjonalne/runtime) |
| Serverless | Każdy request = cold start potential; sync-on-read amplifikuje |
| Edge | Middleware Supabase auth — OK |

**Gotowość produkcyjna Vercel:** ✅ technicznie (build przechodzi).  
**Uwaga:** `package.json` ma zduplikowany klucz `"build"` — drugi nadpisuje pierwszy (build i tak działa przez drugą definicję z validate-env).

**Rekomendacje:**
- Dodać env vars w Vercel dashboard (Supabase + OpenAI + SITE_URL).
- Rozważyć Vercel Cron dla reminder sync (zamiast layout).
- Monitoring: Vercel Analytics + Supabase dashboard.

---

## 10. Audyt GitHub

### 10.1 Struktura repozytorium

```
src/
├── app/           # App Router (dashboard + public)
├── components/    # UI shared + layout
├── config/        # navigation, permissions
├── features/      # 11 modułów domenowych (actions + components)
├── integrations/  # PZPN, DZPN, Extranet adapters
├── lib/           # auth, ai, academy, loaders per domain
└── types/         # database.ts, rbac, domain types
supabase/migrations/  # 38 migracji chronologicznych
docs/              # 41 plików (moduły, audyty, architektura)
scripts/           # setup-stage*.mjs, validate-env, run-sql
```

**Ocena:** ✅ Czytelny podział feature-first zgodny z Clean Architecture opisaną w `docs/architecture/`.

### 10.2 Dokumentacja

| Typ | Pliki |
|-----|-------|
| Moduły ETAP 1–11 | `docs/modules/stage-*.md` |
| Raporty etapów | `docs/stage-*-report.md` |
| Audyty | `docs/audit/stage-*-audit-report.md` |
| Architektura | `docs/architecture/*` |
| Baza | `docs/database/schema-proposal.md`, `erd.md` |

**Luka:** brak `CONTRIBUTING.md`, brak CI workflow (GitHub Actions) — build nie jest weryfikowany automatycznie w PR.

---

## 11. Raport gotowości produkcyjnej (skala 1–10)

| Obszar | Ocena | Uzasadnienie |
|--------|-------|--------------|
| **Architektura** | **8/10** | Spójny multi-tenant, modułowość, Server Actions; nakładające się domeny danych |
| **Bezpieczeństwo** | **6/10** | RLS solidne per moduł; P0 na players/parent/player; brak coach team scope |
| **Skalowalność** | **7/10** | Wzorzec DB OK do 100 klubów; sync-on-read i AI context blokują 1000 |
| **UX** | **7/10** | Spójny design system; mobile gaps w match detail i starszych listach |
| **AI** | **6/10** | Funkcjonalne; drogie i ciężkie kontekstowo; regresja sync na suggestions |
| **Multi Tenant** | **7/10** | RLS izoluje kluby; brak multi-club UI i platform admin |
| **Wydajność** | **6/10** | Hotspoty zidentyfikowane; brak cache cross-request i background jobs |
| **Gotowość produkcyjna** | **7/10** | Build OK, env validation, audyty per etap; wymaga ETAP 12 security przed launch |

**Średnia ważona:** **6.8/10** — gotowe na **pilotaż 1–10 klubów** po ETAP 12 (security hardening).

---

## 12. Plan ETAPÓW 12–20 (wartość biznesowa)

Ułożone według **wpływu na możliwość komercjalizacji i bezpieczeństwo**, nie chronologii technicznej.

| Etap | Nazwa | Cel | Wartość biznesowa |
|------|-------|-----|-------------------|
| **12** | **Security & RBAC hardening** | Row-level RLS dla players/parent/player; coach team scope; middleware `/academy`; align permissions treasurer/scout | **Krytyczna** — warunek produkcji i RODO |
| **13** | **Performance & background ops** | Cron (Vercel/Supabase) dla reminder sync; cache AI context; parallelize loaders; limity list | **Wysoka** — UX i koszty infra |
| **14** | **Multi-club SaaS foundation** | Wybór klubu w sesji; onboarding klubu; subdomeny `{slug}.fcos.pl`; limity planów | **Wysoka** — monetyzacja multi-tenant |
| **15** | **Powiadomienia & Realtime** | Supabase Realtime dla `club_notifications`; push email (opcjonalnie); centrum powiadomień | **Wysoka** — retencja użytkowników |
| **16** | **Portale rodzic/zawodnik** | Dedykowany UX (nie pełny dashboard); mobile-first; własny rozwój, frekwencja, opłaty | **Wysoka** — główni użytkownicy końcowi |
| **17** | **Automatyzacja danych sportowych** | Rollup `match_player_stats` → `player_stats`; frekwencja w rankingu talentów; MVP single source | **Średnia** — wiarygodność raportów |
| **18** | **Billing & plany SaaS** | Stripe/subskrypcje; limity storage/AI/użytkowników; faktury | **Średnia** — przychód recurring |
| **19** | **Platform admin** | Panel operatora SaaS; metryki tenantów; support; audit log | **Średnia** — operacje przy 100+ klubach |
| **20** | **Integracje live & ekosystem** | PZPN/DZPN sync produkcyjny; API publiczne; marketplace integracji | **Długoterminowa** — przewaga rynkowa |

### Szczegóły kluczowych etapów

**ETAP 12** (must-have przed launch):
- `actor_can_read_player_row(club_id, player_id)` zastępujący club-wide read
- Filtr listy `/players` dla parent/player
- Guard na `/players/[id]` analogiczny do academy
- `coach_team_ids()` z `club_memberships.team_id`
- Testy regresji RLS

**ETAP 13** (must-have przed 50+ klubami):
- `syncTrainingReminders` → Vercel Cron
- `unstable_cache` / Redis dla `buildAiClubContext`
- `Promise.all` w `getTalentRanking`
- `.limit(100)` na `getAiReports`

**ETAP 14** (must-have przed SaaS):
- Cookie `active_club_id` + UI switcher
- Rejestracja nowego klubu (self-service lub invite)
- Usunięcie hardcoded `DEFAULT_CLUB_ID` z loaderów

---

## 13. Checklist przed produkcją (bez implementacji w 11.5)

- [ ] ETAP 12 security — row-level RLS players
- [ ] ETAP 12 — coach team scoping
- [ ] ETAP 13 — cron zamiast sync-on-read
- [ ] ETAP 13 — AI context cache + slim mode
- [ ] CI GitHub Actions (`typecheck` + `build`)
- [ ] Env vars produkcyjne w Vercel
- [ ] Backup strategy Supabase (PITR Pro)
- [ ] Polityka retencji `sync_logs`, `ai_messages`
- [ ] Pen test RLS (skrypt test users per rola)
- [ ] Aktualizacja `docs/architecture/overview.md` (Storage/Realtime już wdrożone)

---

## 14. Pliki referencyjne

| Dokument | Opis |
|----------|------|
| `docs/architecture/overview.md` | Clean Architecture |
| `docs/architecture/multi-tenant.md` | Strategia tenant |
| `docs/architecture/rbac.md` | Role i uprawnienia |
| `docs/audit/stage-*-audit-report.md` | Audyty per moduł (1–11) |
| `docs/modules/stage-*.md` | Dokumentacja modułów |
| `src/types/database.ts` | Typy DB (87 tabel) |
| `src/config/permissions.ts` | Macierz RBAC aplikacji |

---

*ETAP 11.5 — wyłącznie analiza i rekomendacje. Żadne tabele, moduły ani funkcje nie zostały dodane.*
