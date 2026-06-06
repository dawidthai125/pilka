# Raport audytu — ETAP 11.6 (Production Hardening)

**Data:** 2026-06-01  
**Zakres:** ETAP 1 → ETAP 11, strona publiczna Piorun Wawrzeńczyce  
**Typ:** analiza i rekomendacje — **bez nowych funkcji, bez nowych modułów**  
**Weryfikacja techniczna:** `npm run typecheck` ✅ · `npm run build` ✅ (85 tras)  
**Status poprawek:** ✅ wdrożone — szczegóły w [`docs/stage-11.6-fixes-report.md`](../stage-11.6-fixes-report.md) · migracja `20260606120000_stage116_production_hardening.sql`

---

## Executive summary

Football Club OS jest **gotowy do pilota produkcyjnego dla jednego klubu** (Piorun Wawrzeńczyce), pod warunkiem:

1. Pełne wdrożenie migracji Supabase (ETAP 1–11 + `stage115`) na bazie produkcyjnej.
2. Uzupełnienie brakujących `GRANT` dla roli `anon` na stronie publicznej (znane z wdrożenia ETAP 9).
3. Naprawa **3 problemów krytycznych** przed szerokim rolloutem: cache AI bez scope użytkownika, wyciek `coach_notes` na stronie publicznej, storage `website/` bez guarda `website_is_public`.

Architektura multi-tenant w **warstwie bazy (RLS)** jest silna; aplikacja działa jako **single-tenant** (`DEFAULT_CLUB_ID`, jeden `club_slug`). SaaS wieloklubowy wymaga ETAP 14+.

---

## Production Readiness Score (1–10)

| Obszar | Ocena | Uzasadnienie |
|--------|-------|--------------|
| **Bezpieczeństwo** | **7/10** | RLS row-level (11.5), Server Actions z RBAC; luki: AI cache, public coach_notes, president bez write, coach_notes club-wide |
| **Skalowalność** | **6/10** | DB 87 tabel, RLS per club; brak club switcher, hardcoded `DEFAULT_CLUB_ID`, sync-on-read, brak rate limit AI |
| **Wydajność** | **7/10** | ISR 60s public, cache AI 300s, Promise.all w loaderach; ciężki kontekst AI, middleware 106 kB na każdy request |
| **UX** | **8/10** | Spójny dashboard, responsywne layouty, panel kibica; brak optimistic UI w czacie AI |
| **AI** | **6/10** | gpt-4o-mini, limity historii; brak rate limit, cache cross-user, brak max_tokens |
| **Multi-tenant** | **4/10** | RLS ✅ · app single-club · brak routingu po slug/host |
| **Mobile** | **8/10** | Tailwind breakpoints, min-h touch targets na public; duże client bundles w meczach/formacji |
| **Gotowość produkcyjna** | **7/10** | Build OK, headers bezpieczeństwa, brak CI, migracje wymagają ręcznej synchronizacji z prod |

**Średnia ważona (pilot 1 klub): 6.9/10**  
**Średnia ważona (SaaS 100 klubów): 5.5/10**

---

## 1. Problemy krytyczne (P0)

### C1. Cache kontekstu AI współdzielony między użytkownikami

**Plik:** `src/lib/ai/context.ts`  
**Problem:** `unstable_cache` kluczowany tylko `clubId`, nie `userId`/rolą. Trener może otrzymać w cache dane finansowe/sponsorów załadowane wcześniej przez skarbnika/prezesa.  
**Wpływ:** wyciek danych wrażliwych przez odpowiedzi AI.  
**Rekomendacja:** usunąć cache lub dodać `userId` + hash ról do klucza; budować kontekst per rola.

### C2. `coach_notes` w publicznym SELECT meczów

**Plik:** `src/lib/website/public-data.ts` (linia 37)  
**Problem:** pole `coach_notes` jest pobierane dla strony `/mecze` i kart meczów na stronie głównej. Przy włączonej publicznej stronie (`website_is_public`) notatki trenera są dostępne anonimowo przez PostgREST/RLS `matches_public_select`.  
**Rekomendacja:** usunąć `coach_notes` z `MATCH_PUBLIC_SELECT`; ewentualnie osobne pole `public_match_summary` w CMS.

### C3. Niespójność migracji prod vs repozytorium

**Problem:** baza dev/prod może być na ETAP 7, podczas gdy kod wymaga ETAP 9+ (RPC, `website_settings`). Skrypt `setup:stage9` używa hosta `db.*.supabase.co` (często niedostępny); wymaga poolera regionalnego.  
**Wpływ:** strona „niedostępna”, brak modułów, fałszywe poczucie bezpieczeństwa (polityki RLS bez tabel).  
**Rekomendacja:** checklist migracji per środowisko; Supabase migration history; naprawić host w skryptach setup.

---

## 2. Problemy wysokiego ryzyka (P1)

### RLS / dane

| ID | Problem | Lokalizacja |
|----|---------|-------------|
| H1 | **President** ma read na zasoby drużyn, ale `actor_can_manage_team_resource` **nie zawiera** `president` — prezes nie może zapisywać meczy/treningów/zawodników | `20260605110000_stage115_security_performance.sql` |
| H2 | **`player_coach_notes`** — każdy trener klubu widzi wszystkie notatki (brak scope drużyny) | `20260531160000_players_module.sql` |
| H3 | **Storage write** używa `actor_can_manage_players` (club-wide), read używa `actor_can_read_player_row` (team-scoped) — trener może uploadować poza swoją drużynę znając UUID | `20260531163000_players_audit_hardening.sql` |
| H4 | **`club_assets_website_public_read`** — odczyt anon bez `website_is_public()` | `20260603100000_website_module.sql` |
| H5 | **Trener bez `team_id`** w membership = dostęp club-wide (`NOT actor_is_coach_team_scoped`) | stage115 |
| H6 | **Akademia** — `actor_can_manage_academy` dla wszystkich trenerów klubu (brak `coach_team_ids`) | `20260605100000_academy_module.sql` |

### Auth / API

| ID | Problem | Lokalizacja |
|----|---------|-------------|
| H7 | **Brak rate limit** na `sendAiMessage` i generowanie raportów | `src/features/ai/actions.ts` |
| H8 | **Otwarta rejestracja** — spam kont auth bez membership | `src/features/auth/actions.ts` |
| H9 | **`buildAiClubContext`** zawsze ładuje finance/inventory/integrations — koszt + powierzchnia danych | `src/lib/ai/context.ts` |

### Storage / public

| ID | Problem | Lokalizacja |
|----|---------|-------------|
| H10 | Brak **`GRANT SELECT TO anon`** na `matches`, `clubs`, `profiles` itd. po `security_hardening` REVOKE — wymaga ręcznej poprawki przy ETAP 9 | `20260531140000_security_hardening.sql` |

---

## 3. Problemy średniego ryzyka (P2)

| ID | Obszar | Opis |
|----|--------|------|
| M1 | RLS trainings | Rodzic widzi dostępność całej drużyny na treningu, nie tylko dziecka |
| M2 | RLS inventory | Rodzic nie widzi kitów dziecka (`actor_can_read_own_inventory` tylko player) |
| M3 | RLS integrations | Coach czyta `integrations.config` (potencjalne credentials) |
| M4 | RLS website | Coach czyta `website_social_integrations.config` |
| M5 | RLS memberships | Coach widzi wszystkie membership w klubie |
| M6 | RLS teams | `teams_manage_staff` — coach może CRUD wszystkich drużyn |
| M7 | RPC | `get_sponsor_portal_schedule` — brak walidacji `p_team_id` vs kontrakt sponsora |
| M8 | Actions | Signed URL finance/inventory — walidacja tylko prefix ścieżki, bez JOIN do rekordu DB |
| M9 | ENV | `validate-env.mjs` nie sprawdza `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| M10 | ENV | `.env.example` zawiera prawdziwy project ref w komentarzu |
| M11 | Middleware | Auth-only, brak RBAC na poziomie route (backup: layout + actions) |
| M12 | DB | `stage115` może nie być na prod — regresja P0 z audytu 11.5 |
| M13 | Frontend | `defaultValue={new Date()}` w formularzach — edge hydration przy zmianie strefy czasowej |
| M14 | AI | Brak `max_tokens` w wywołaniach OpenAI — niekontrolowany koszt output |
| M15 | Multi-tenant | 56+ użyć `DEFAULT_CLUB_ID` w actions (players, training, matches, club) |

---

## 4. Problemy niskiego ryzyka (P3)

| ID | Opis |
|----|------|
| L1 | `ai_reports` kategorie `scouting`/`integrations` — `actor_can_read_ai_report` może blokować odczyt |
| L2 | `profiles_select_club_managers` — pełny PII (email, phone) dla zarządu |
| L3 | ESLint warnings — unused `_prev` w Server Actions (jakość kodu) |
| L4 | Brak `CONTRIBUTING.md`, brak GitHub Actions CI |
| L5 | Integracje DZPN/PZPN/Extranet — stuby bez implementacji (OK na pilot) |
| L6 | `player_id_for_user` — link tylko po email (parent/player bez match email) |
| L7 | Brak retencji `sync_logs`, `ai_messages` — wzrost kosztów DB w czasie |

---

## Audyt RLS — podsumowanie modułów

| Moduł | Izolacja klubów | Sponsor ↔ gracze | Rodzic ↔ dziecko | Zawodnik ↔ własne | Trener ↔ drużyna | Ocena |
|-------|-----------------|--------------------|------------------|-------------------|------------------|-------|
| clubs / profiles / teams | ✅ | N/A | N/A | N/A | ⚠️ coach CRUD all teams | 7/10 |
| players | ✅ | ✅ sponsor blocked | ✅ row-level | ✅ | ⚠️ coach_notes, storage write | 7/10 |
| matches | ✅ | ✅ | ⚠️ attendance roster | ✅ | ✅ stage115 team scope | 8/10 |
| trainings | ✅ | ✅ | ⚠️ availability roster | ✅ self | ✅ team scope | 7/10 |
| sponsors | ✅ | ✅ own row only | ✅ | ✅ | N/A | 9/10 |
| finance | ✅ | ✅ | ✅ parent fees | ✅ portal | N/A finance roles | 9/10 |
| inventory | ✅ | ✅ | ❌ parent kits | ✅ player kits | N/A | 7/10 |
| ai | ✅ per user | ✅ | ✅ | ✅ | ✅ category RBAC | 7/10 |
| website | ✅ RPC filtered | ✅ | N/A | N/A | N/A | 7/10* |
| academy | ✅ | ✅ | ✅ development | ✅ | ❌ manage club-wide | 6/10 |
| integrations | ✅ | ✅ | ✅ | ✅ | ⚠️ coach reads config | 7/10 |

\* Po wdrożeniu ETAP 9 + anon GRANTs; storage website nadal bez guarda.

**Potwierdzenia wymagań użytkownika:**

- ✅ Dane klubów odseparowane (`user_club_ids()` na ~wszystkich tabelach)
- ✅ Sponsor nie widzi danych zawodników (brak w player helpers; portal = terminarz)
- ✅ Rodzic widzi wyłącznie własne dziecko (players, finance fees, academy development) — wyjątki: availability roster, inventory kits
- ✅ Zawodnik widzi wyłącznie własne dane (row-level read)
- ⚠️ Trener widzi wyłącznie swoje drużyny — **częściowo** (stage115 na read; luki: coach_notes, academy write, unscoped coach, storage write)

---

## Audyt Auth

| Element | Status | Uwagi |
|---------|--------|-------|
| Supabase Auth | ✅ | Email/hasło, OAuth callback z `safeRedirectPath` |
| Sesje SSR | ✅ | `@supabase/ssr` w middleware + server client |
| Role | ✅ | 11 ról w `club_memberships.role` |
| Middleware | ⚠️ | Session gate; lista `protectedPrefixes` — public i auth poza listą |
| Route protection | ✅ dashboard | `(dashboard)/layout` → `getDashboardContext()` |
| Strony bez auth (zamierzone) | `/`, `/aktualnosci`, `/mecze`, `/druzyna`, `/tabela`, `/sponsorzy`, `/galeria`, `/kontakt`, `/kibic`, `/login`, `/register`, `/robots.txt`, `/sitemap.xml` |
| API Routes | 1× | `/auth/callback` — OK |
| Service role w runtime | ✅ | `createAdminClient()` tylko w skryptach setup |

---

## Audyt API (Server Actions + RPC)

**Server Actions:** 12 modułów — wszystkie mutatory używają `requireAccessContext()` + permission helpers.  
**RPC publiczne:** `get_public_*` — SECURITY DEFINER + `website_is_public`.  
**RPC wewnętrzne:** finance/inventory/sponsor portal — gated przez `actor_can_*`.

**Luki walidacji:**
- Finance/inventory signed URLs — path prefix only
- Brak Zod na części formularzy (spójność z resztą projektu do review)
- `dismissAiSuggestion` — każdy użytkownik z `canUseAiChat`

---

## Audyt Storage

| Bucket | Publiczny? | Polityki | Ryzyko |
|--------|--------------|----------|--------|
| `club-assets` | **Nie** (bucket private) | Path-based RLS | Niskie dla players/finance/inventory |
| `{clubId}/players/` | Nie | `actor_can_read_player_row` | Średnie — write club-wide |
| `{clubId}/finance/` | Nie | finance RBAC | Niskie |
| `{clubId}/inventory/` | Nie | inventory RBAC | Niskie |
| `{clubId}/website/` | **Tak (anon SELECT)** | folder `website` | **Wysokie** — bez `website_is_public` |

PDF zawodników: `{clubId}/players/{playerId}/documents/` — prywatne, OK.  
Sponsorzy: URL zewnętrzne w DB, brak uploadu do Storage.

---

## Audyt Vercel — Production Ready Checklist

### Build (zweryfikowano 2026-06-01)

- [x] `npm run build` — sukces, 85 tras
- [x] `npm run typecheck` — sukces
- [x] ESLint — tylko warnings (unused vars)
- [x] `vercel.json` — `buildCommand: npm run build`
- [x] Security headers w `next.config.ts`

### Do skonfigurowania na Vercel

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_SITE_URL` (wymagane przez build!)
- [ ] `OPENAI_API_KEY` (opcjonalnie — ukryć AI UI gdy brak)
- [ ] Supabase Auth redirect: `https://<domena>/auth/callback`
- [ ] Preview deployments — osobny Supabase project lub branch DB
- [ ] Włączyć Vercel Analytics / Speed Insights (opcjonalnie)
- [ ] Cron dla reminder sync (zamiast sync-on-read na `/notifications`)

### Runtime

- [ ] Monitoring błędów (Sentry / Vercel Logs)
- [ ] Alert na 5xx spike po deploy
- [ ] PITR backups Supabase Pro

---

## Audyt ENV

| Zmienna | Build | Runtime server | W bundle client | Status |
|---------|-------|----------------|-----------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ validate | ✅ | ✅ | OK |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ validate | ✅ | ✅ | OK (public by design) |
| `NEXT_PUBLIC_SITE_URL` | ✅ validate | ✅ | ✅ metadata | OK |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ nie validate | skrypty only | ❌ nie w bundle | OK |
| `OPENAI_API_KEY` | ❌ nie validate | server only | ❌ | ⚠️ brak walidacji prod |
| `SUPABASE_DB_PASSWORD` | — | setup scripts | ❌ | OK |

**Wycieki:** brak service role / OpenAI w kodzie klienta. `.env.local` w `.gitignore` — OK.

---

## Audyt OpenAI

| Wywołanie | Plik | Częstotliwość | Cache |
|-----------|------|---------------|-------|
| Chat AI | `features/ai/actions.ts` | per wiadomość | context 300s ⚠️ |
| Raporty AI | `features/ai/actions.ts` | on-demand | — |
| Finance report | `lib/finance/insights.ts` | on-demand | — |
| Inventory report | `lib/inventory/insights.ts` | on-demand | — |
| Website news AI | `lib/website/insights.ts` | on-demand | — |
| Sponsor report | `features/sponsors/actions.ts` | on-demand | — |
| Integrations summary | `lib/integrations/insights.ts` | on-demand | — |
| `syncAiSuggestions` | `lib/ai/insights.ts` | rule-based | używa cached context |

**Model:** `gpt-4o-mini` (domyślnie)  
**Limity:** 4000 znaków/wiadomość, 20 wiadomości historii  
**Brak:** rate limit, max_tokens, budżet per klub/user

**Rekomendacje:**
1. Rate limit per user (np. 20 msg/h)
2. Cache per `(clubId, userId, roleHash)`
3. Lazy-load modułów kontekstu wg uprawnień
4. `max_tokens: 1024` na odpowiedzi chat
5. Ukryć UI AI gdy brak klucza w prod

---

## Audyt bazy danych

| Aspekt | Stan |
|--------|------|
| Tabele | 87 (typy w `database.ts`) |
| Indeksy | stage115 + per-module audit (website_news published, sync_logs, itd.) |
| RPC | 10+ agregatorów SECURITY DEFINER |
| Realtime | **Nieużywany** |
| Ciężkie tabele | `ai_messages`, `sync_logs`, `club_notifications` |

**Potencjalne bottlenecks:**
- `buildAiClubContextUncached` — ~25–30 zapytań (cache 300s łagodzi)
- `getDashboardContext` — wiele loaderów (11.5: usunięto sync z layout)
- Public homepage — `Promise.all` 6 źródeł (OK po RPC home)

**Brakujące indeksy (niski priorytet):** composite na często filtrowanych listach po `status + club_id` poza już dodanymi w audit migrations.

---

## Audyt frontend

| Aspekt | Wynik |
|--------|-------|
| React / Next.js 15 | ✅ App Router, RSC na public |
| Hydration | ⚠️ niskie ryzyko (daty w formularzach) |
| Client components | ~61 plików — głównie dashboard/forms |
| Nieużywane komponenty | Nie wykryto krytycznych orphanów w audycie |
| Bundle | Middleware 106 kB; match detail ~129 kB First Load |

**Build warnings:** unused `_prev` w Server Actions — jakość kodu, nie blocker.

---

## Audyt responsywności (code review)

Projekt używa Tailwind (`sm:`, `md:`, `lg:`) w kluczowych widokach:

| Moduł | Responsywność | Uwagi |
|-------|---------------|-------|
| Dashboard | ✅ | Sidebar + grid |
| Mecze | ✅ | Kalendarz client-heavy |
| Treningi | ✅ | |
| Zawodnicy | ✅ | |
| Sponsorzy | ✅ | |
| Finanse | ✅ | Tabele scroll |
| Strona publiczna | ✅ | `club-site-shell`, min-h 44px touch targets (ETAP 9) |

**Test manualny na urządzeniach** — zalecany przed go-live (audyt statyczny nie zastępuje testów iPhone/Android).

---

## Audyt Lighthouse

**Ostatni pomiar (ETAP 9, build prod, `/`):** 100 / 100 / 100 / 100  
**Źródło:** `docs/audit/stage-9-audit-report.md`

| Strona | Performance | A11y | SEO | Best Practices | Uwagi |
|--------|-------------|------|-----|----------------|-------|
| `/` | 100* | 100* | 100* | 100* | *po wdrożeniu ETAP 9 na bazie |
| `/mecze` | ~95–100** | ~100** | ~100** | ~100** | **szacunek — RSC, mało JS |
| `/druzyna` | ~95–100** | ~100** | ~100** | ~100** | RPC players |
| `/sponsorzy` | ~95–100** | ~100** | ~100** | ~100** | RPC sponsors |

**Rekomendacja:** powtórzyć Lighthouse na prod URL po deploy (Chrome DevTools / PageSpeed Insights).

---

## Audyt GitHub

| Element | Ocena |
|---------|-------|
| Struktura repo | ✅ `src/`, `supabase/migrations/`, `docs/`, `scripts/` |
| Migracje | ✅ 39 plików, konwencja `YYYYMMDDHHMMSS_*` |
| Dokumentacja | ✅ 44+ pliki MD, audyty per etap |
| CI/CD | ❌ brak `.github/workflows` |
| Historia | ✅ commity per etap (stage 11.5 ostatni security pass) |
| README | ✅ linki do docs |

---

## Audyt kosztów (szacunki miesięczne)

Założenia: 30 użytkowników/klub, 500 msg AI/klub/mies., umiarkowane zdjęcia/PDF, brak realtime.

### 1 klub (Piorun — pilot)

| Usługa | Plan | Szacunek |
|--------|------|----------|
| Supabase | Free / Pro | $0 – $25 |
| Storage (~2 GB) | w Supabase | $0 – $5 |
| OpenAI (gpt-4o-mini) | API | $1 – $3 |
| Vercel | Hobby / Pro | $0 – $20 |
| **Razem** | | **$1 – $53/mies.** |

### 10 klubów

| Usługa | Szacunek |
|--------|----------|
| Supabase Pro | $25 – $75 |
| Storage (~20 GB) | $5 – $15 |
| OpenAI | $10 – $20 |
| Vercel Pro | $20 – $40 |
| **Razem** | **$60 – $150/mies.** |

### 100 klubów

| Usługa | Szacunek |
|--------|----------|
| Supabase Pro+ / Team | $75 – $300+ |
| Storage (~200 GB) | $50 – $100 |
| OpenAI | $80 – $200 |
| Vercel Pro / Enterprise | $100 – $500+ |
| **Razem** | **$300 – $1 100+/mies.** |

**Czynniki wzrostu:** sync_logs, ai_messages, galeria HD, raporty AI, brak retencji danych.

---

## Rekomendacje — plan działania (ETAP 11.7+, bez nowych modułów)

### Natychmiast (przed prod)

1. Naprawić cache AI (`userId` + role w kluczu lub wyłączyć cache).
2. Usunąć `coach_notes` z publicznego SELECT meczów.
3. Dodać `website_is_public()` do storage policy website.
4. Checklist migracji prod (ETAP 1–11 + stage115 + anon GRANTs).
5. Uzupełnić `president` w `actor_can_manage_team_resource`.
6. Naprawić host DB w `scripts/setup-stage*.mjs` (pooler regionalny).

### Krótki termin (1–2 tygodnie)

7. Rate limit OpenAI per user.
8. Walidacja prod env (`OPENAI_API_KEY` optional with fail-closed UI).
9. GitHub Actions: `typecheck` + `build` on PR.
10. Team scope na `player_coach_notes` i academy manage.
11. Align storage write z `actor_can_manage_player_row`.
12. Wyłączyć / ograniczyć open registration na prod.

### Średni termin (przed SaaS)

13. Usunąć `DEFAULT_CLUB_ID` z legacy actions.
14. Club switcher + routing po slug (ETAP 14).
15. Retencja sync_logs / ai_messages.
16. RLS regression tests (skrypt per rola).
17. Vercel Cron dla reminderów.

---

## Załącznik A — mapa migracji (wdrożenie prod)

```
ETAP 1  foundation + seed
ETAP 2  players
ETAP 3  players seed/audit
ETAP 4  matches
ETAP 5  AI
ETAP 6  sponsors
ETAP 7  trainings
ETAP 8  inventory
ETAP 9  website (+ anon GRANTs supplement)
ETAP 10 finance
ETAP 11 integrations + academy
ETAP 11.5 stage115 security/performance
ETAP 11.6 stage116 production hardening
```

Skrypty: `npm run setup:stage1` … `setup:stage11`, `npm run db:migrate:stage115`, `npm run db:migrate:stage116`.

---

## Załącznik B — weryfikacja build (2026-06-01)

```
npm run typecheck  → exit 0
npm run build      → exit 0, 85 routes, middleware 106 kB
```

---

*Raport audytu ETAP 11.6. Poprawki wdrożone w tej samej iteracji — raport zmian: [`docs/stage-11.6-fixes-report.md`](../stage-11.6-fixes-report.md).*
