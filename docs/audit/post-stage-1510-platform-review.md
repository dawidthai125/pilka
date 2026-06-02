# POST-STAGE-15.10 PLATFORM REVIEW

**Football Club OS — Sprint stabilizacyjny**  
**Data:** 2026-05-31  
**Zakres:** ETAP 1 → 15.10 (Dashboard, League Hub, Matches, Training, Attendance, Communication, CRM, Sponsors, Finance, Equipment, Injuries, AI, Content, Video, Website, PWA)  
**Metoda:** analiza statyczna kodu, migracji SQL, konfiguracji produkcyjnej, nawigacji RBAC, wzorców loaderów i komponentów UI. **Bez implementacji poprawek.**

---

## Podsumowanie wykonawcze

Platforma jest **funkcjonalnie kompletna dla pilota jednego klubu** (Piorun Wawrzeńczyce) z silną warstwą RLS i spójnym modelem modułowym w nowszych etapach (15.6–15.10). Główne ryzyka stabilizacyjne to: **wydajność przy skali danych** (loadery bez paginacji, N+1 w League Hub), **architektura legacy** (`session.ts` ~3000 linii), **UX roli portalowych** (whitelist nawigacji, bottom nav bez RBAC), **luki dokumentacji produkcyjnej** (checklist do stage116, service role w runtime) oraz **brak monitoringu błędów**.

| Obszar | Ocena (1–10) | Komentarz |
|--------|:------------:|-----------|
| **Performance** | **6/10** | Dobry layout RPC; słabe strony: League Hub, Match detail, Academy talents, brak paginacji |
| **Security** | **8/10** | RLS + audyty etapowe; ryzyka: DEFAULT_CLUB_ID, video signed URLs, middleware bez RBAC |
| **Architecture** | **6/10** | Nowe moduły spójne; legacy w session.ts, dual league tables, 5 stylów walidacji |
| **UX** | **6/10** | Bogaty feature set; przeciążona nawigacja, PL/EN mix, role bez dedykowanych home |
| **Mobile** | **5/10** | Match squad admin, CRM pipeline, bottom nav nierolowy, offline PWA praktycznie pusty |
| **Production Readiness** | **6/10** | CI typecheck+build; brak Sentry, audit w CI, cron push, checklist nieaktualny |

**Werdykt produktowy (Audyt G):** Trener Pioruna **może prowadzić drużynę w ~85% codziennych scenariuszy** w ramach systemu, ale **nie w 100%** — brakuje m.in. jednolitego flow meczowego, mobilnej optymalizacji kluczowych ekranów trenera oraz kilku operacji „w terenie” bez wielu kliknięć.

---

## AUDIT A — WYDAJNOŚĆ

### Kontekst infrastrukturalny

| Warstwa | Stan | Wpływ |
|---------|------|-------|
| Vercel region | `fra1` w `vercel.json` | ✅ Zgodne z Supabase EU (Irlandia) |
| Layout dashboard | RPC `get_app_layout_context` | ✅ ~49 ms vs 6× SQL (~293 ms) — naprawione w ETAP 13.7 |
| Dashboard pages | Brak `revalidate` / ISR | Każde wejście = pełny SSR + Supabase |
| Cross-request cache | Tylko AI context + match filters (`unstable_cache`, 300s) | Reszta modułów bez TTL cache |
| Middleware | `getUser()` na prawie każdym requeście | Podwójna auth: middleware + layout |

### TOP 20 najwolniejszych elementów

| # | Element | Problem | Wpływ | Rekomendacja | Szac. zysk |
|---|---------|---------|-------|--------------|------------|
| 1 | `getTalentRanking` — `src/lib/academy/loaders.ts` | 4 pełne skany tabel (players, developments, assessments, history) bez `.limit()` | TTFB rośnie liniowo z liczbą zawodników; strona `/academy/talents` | Paginacja + SQL aggregate / ranking RPC | **−60–80% TTFB** przy 50+ zawodnikach |
| 2 | `getLeagueConflicts` — `src/lib/league/loaders.ts` | N+1: osobne zapytanie `league_matches` per konflikt | 10 konfliktów = 11 round-tripów | Jedno `.in("id", ids)` lub JOIN | **−70%** czasu sekcji konfliktów |
| 3 | League Hub page — `src/app/(dashboard)/league/page.tsx` | `getLatestLeagueTable` 2× + `buildLeagueAiInsights` powtarza season/table/fixtures | 10+ zapytań na jedno wejście | Dedup w page + `React.cache()` na league loaders | **−40% TTFB** |
| 4 | League loaders — `src/lib/league/loaders.ts` | Brak `React.cache()` (jedyny duży moduł bez dedup per request) | Duplikaty w ramach requestu | Owijka `cache()` na eksportach | **−15–30%** na League Hub |
| 5 | Match detail — `matches/[id]/page.tsx` + `getMatchDetail` | 10+ zapytań; duplikat `getPlayersByTeam` (już w getMatchDetail) | Wolny detail meczu; wysoki TTFB | Usunąć redundant fetch; opcjonalnie lazy sections | **−25–35% TTFB** |
| 6 | `buildAiClubContextUncached` — `src/lib/ai/context.ts` | 15+ zapytań na kontekst AI | Każda wiadomość chat (cache 5 min łagodzi) | Tagi + `revalidateTag`; węższy kontekst per intent | **−50%** przy cache miss |
| 7 | Video hub — `src/app/(dashboard)/video/page.tsx` | `getVideoDashboardStats` + `getVideos` — podwójny skan `videos` | 2× pełna tabela | Jedno query + agregaty w SQL | **−40%** ładowania hubu |
| 8 | Content hub — `getContentPosts` | Brak limitu — wszystkie posty | Skalowanie contentu | Paginacja cursor + filtry | **−50–70%** przy 100+ postach |
| 9 | `getCrmContacts` / pipeline — `src/lib/crm/loaders.ts` | Pełna lista kontaktów, filtrowanie w JS | CRM przy dużej bazie kontaktów | Paginacja + indeksowane filtry SQL | **−40–60%** |
| 10 | `getCrmDonations` stats | Fetch wszystkich wpisów do sumy w JS | O(n) pamięć + czas | `SUM()` w RPC/SQL | **−80%** czasu stats |
| 11 | `getPlayerFrequencyStats` — `attendance/loaders.ts` | Do 500 rekordów attendance + pełna lista graczy; agregacja w JS | Raport frekwencji trenera | RPC frekwencji per team/season | **−50%** |
| 12 | `getAttendanceDashboardWidgets` | Do ~7 sekwencyjnych zapytań (training → availability → match → squad) | Widgety dashboardu attendance | `Promise.all` + jeden RPC widgetów | **−40%** |
| 13 | `session.ts` (~2991 linii) | Monolityczny hub loaderów legacy | Maintainability + cold import cost | Ekstrakcja do `lib/{domain}/loaders.ts` | Pośredni; **−10% bundle** długoterminowo |
| 14 | Player detail — `getPlayerDetail` + `player-detail-view.tsx` (700 linii) | 7 równoległych zapytań + ciężki komponent | Wolny profil zawodnika | Lazy tabs; węższe selecty per tab | **−30% TTFB** pierwszego paint |
| 15 | Training detail — `getTrainingDetail` (403 linii UI) | 5+ zapytań + roster drużyny | Sesja treningowa | Cache roster per team w request | **−20%** |
| 16 | Communication stats — `communication/loaders.ts` | 4× COUNT + pełny fetch ogłoszeń do unread | Hub komunikacji | RPC unread count | **−35%** |
| 17 | Injuries AI — `/injuries/ai` | Stats + lista + historia (historia re-fetchuje injuries) | Podwójne ładowanie | Wspólny loader bundle | **−25%** |
| 18 | `PwaProvider` — `src/components/pwa/pwa-provider.tsx` | Po 2,5 s: `/api/pwa/offline-data` na każdej sesji dashboard | Sieć + RPC w tle | Odroczyć do SW / gestu / dłuższy TTL | **−1 RPC** na visit |
| 19 | Middleware — `src/middleware.ts` | `getUser()` na trasach publicznych (`/`, aktualności) | +50–100 ms na public | Wąski matcher — wykluczyć `(public)` | **−50 ms** public TTFB |
| 20 | Server Actions — szerokie `revalidatePath` | Integrations/training invalidują 4–10 tras naraz | Post-mutation lag | `revalidateTag` per moduł | **−20%** czasu po zapisie |

### Dodatkowe obserwacje

- **Pozytywne:** `React.cache()` w większości modułów (`crm`, `equipment`, `injuries`, `attendance`, `session.ts`); public site ISR `revalidate = 60`; RPC agregujące na stronie publicznej.
- **Brak:** `revalidateTag()` w całym `src/` mimo zdefiniowanych tagów w `unstable_cache`.
- **Komponenty React (największe):** `player-detail-view.tsx` (700), `league-panels.tsx` (546), `academy-panels.tsx` (536), `integrations-panels.tsx` (488), `training-detail-view.tsx` (403).
- **Client fetch:** Brak antywzorca masowego `useEffect`+fetch; dane poprawnie na serwerze.

---

## AUDIT B — ARCHITEKTURA

### Martwy kod (potwierdzony brak importów)

| Element | Ścieżka | Uwagi |
|---------|---------|-------|
| Sidebar stack | `src/components/ui/sidebar.tsx` (~724 linii) | + `separator.tsx`, `skeleton.tsx` |
| Hook `useIsMobile` | `src/hooks/use-mobile.ts` | Używany tylko przez sidebar |
| `SignOutButton` | `src/features/auth/components/sign-out-button.tsx` | Używany jest `SignOutMenuItem` |
| Barrel integrations | `src/integrations/index.ts` | Konsumenci importują bezpośrednio |
| `extranetClient` | `src/integrations/extranet/index.ts` | Strona extranet bez klienta sync |

### Duplikaty logiki

| Obszar | Przykłady | Ocena długu |
|--------|-----------|-------------|
| **Walidacja (5 stylów)** | `validators.ts` (Zod), mappery (`crm/mappers`, `injuries/mappers`), inline w actions (`content`, `league`), `integrations/validation` | **Wysoki** — ryzyko rozjazdu enumów |
| **Dashboard stats** | Ten sam wzorzec w 8+ modułach (`get*DashboardStats`) | **Średni** — brak wspólnej abstrakcji |
| **Sub-nav (8 kopii)** | `*-sub-nav.tsx` w attendance, crm, equipment, injuries, league, integrations, academy, communication | **Średni** |
| **Status badges (4+)** | player/match/training/sponsor status badges | **Niski** |
| **AI generators** | `crm/generator`, `communication/generator`, `content/generator`, `equipment/generator` | **Średni** |
| **Dual league model** | `league_table_entries` (legacy/matches) vs `league_tables` (ETAP League Hub) + sync bridge | **Wysoki** — dwa źródła prawdy |
| **FormData helpers** | `readString()` vs lokalne `nullableString()` w players/training/matches | **Niski–średni** |

### Struktura projektu

```
src/app/        — cienkie strony (dobrze)
src/features/   — UI + server actions (22 pliki actions, ~169 akcji)
src/lib/        — NIESPÓJNE: nowe moduły lib/*/loaders vs legacy w session.ts
src/lib/auth/session.ts — ~2991 linii, ~85 cache() wrapperów, auth + RBAC + 60% loaderów
```

| Kryterium | Ocena | Uzasadnienie |
|-----------|:-----:|--------------|
| **Modularność** | 6/10 | Nowe etapy (CRM, Equipment, Injuries) wzorcowe; legacy skoncentrowany w jednym pliku |
| **Skalowalność** | 5/10 | Single-tenant (`DEFAULT_CLUB_ID`), loadery bez paginacji, brak multi-club |
| **Techniczny dług** | 6/10 | Brak TODO/FIXME; duży session.ts, dual league, martwy sidebar, checklist nieaktualny |

### Rekomendacje architektoniczne (bez implementacji)

1. Migracja pozostałych loaderów z `session.ts` → `lib/{domain}/loaders.ts`.
2. Konsolidacja walidacji enumów w `validators.ts` + wspólny `parseEnum()`.
3. Usunięcie martwego sidebar stack lub podpięcie go w layout.
4. Dokumentacja single source of truth dla tabel ligowych lub deprecacja `league_table_entries`.
5. Wspólny `ModuleSubNav` + `EmptyState` + `DashboardStatsGrid`.

---

## AUDIT C — UX (oczami ról)

Metoda: analiza `navigation.ts`, `permissions.ts`, `dashboard-nav.tsx`, `quick-actions.ts`, layoutów modułów, głębokości kliknięć.

### Właściciel — TOP 10 problemów

| # | Problem | Dowód |
|---|---------|-------|
| 1 | Przeciążona nawigacja (~25+ pozycji) | `navigation.ts` + permissive filter |
| 2 | Trzy osobne wejścia AI bez hierarchii | `/ai`, `/ai/manager`, `/ai/tasks` |
| 3 | Dashboard generyczny z listą uprawnień technicznych | `dashboard/page.tsx` ~164 |
| 4 | Mix PL/EN w nazwach modułów | „Club CRM”, „League Hub” vs „Mecze”, „Frekwencja” |
| 5 | Brak executive home (KPI klubu w jednym miejscu) | Ten sam dashboard co trener |
| 6 | „Role i uprawnienia” widoczne w nav dla wszystkich | Brak audience tag |
| 7 | Duplikat coach entry (Panel trenera + Treningi + Frekwencja) | 3 ścieżki do podobnych zadań |
| 8 | Brak onboarding / „co zrobić dziś” dla zarządu | Puste stany bez CTA |
| 9 | CRM 10 zakładek bez filtrowania roli | `CrmSubNav` |
| 10 | Ustawienia klubu schowane w ogólnym „Ustawienia” | Niska discoverability |

### Prezes — TOP 10 problemów

| # | Problem | Dowód |
|---|---------|-------|
| 1 | Ten sam nav co owner bez wizualnej różnicy read-only | Brak UI diff president vs owner |
| 2 | Brak szybkich akcji finansowych na mobile home | `quick-actions.ts` — coach-biased |
| 3 | Finanse wymagają 2–3 kliknięć bez skrótu KPI | Brak widgetu składek na dashboard |
| 4 | Communication Hub bez H1 w layout | `communication/layout.tsx` |
| 5 | Puste listy ogłoszeń bez komunikatu | `communication-panels.tsx` |
| 6 | „Relacje klubu” vs „Club CRM” — dwa nazewnictwa | nav vs layout |
| 7 | Sponsor management rozproszony (Sponsorzy + CRM + Content) | Wiele modułów |
| 8 | Link „Role” na dashboard bez guard | Możliwy dead-end |
| 9 | Brak widoku „kalendarz klubu” cross-modułowego | Treningi/mecze/wydarzenia osobno |
| 10 | Integracje widoczne ale bez `integration:manage` | Confusing capability |

### Trener — TOP 10 problemów

| # | Problem | Dowód |
|---|---------|-------|
| 1 | Rozdrobniony flow frekwencji (Panel trenera / Frekwencja / Treningi) | 3 moduły, 4+ ścieżki |
| 2 | Dual match squad (admin tabela vs RSVP cards) | `match-detail-view` vs `MatchSquadPanel` |
| 3 | Oznacz obecność → `/training` zamiast bieżącej sesji | `quick-actions.ts` |
| 4 | „Dodaj notatkę” → `/players` (nie formularz notatki) | Quick action misleading |
| 5 | CRM read-only ale pełne 10 zakładek | `CrmSubNav` |
| 6 | Attendance sub-nav pokazuje „Raporty trenera” graczom/rodzicom | Redirect friction |
| 7 | Match squad entry 3+ tapy | widget → match → RSVP |
| 8 | Brak jednego „dzisiejszego” ekranu (trening + mecz + availability) | Brak unified coach day view |
| 9 | Akademia + scouting w nav — dużo szumu dla trenera ligi amatorskiej | Nav overload |
| 10 | Formularz urazu wielopolowy na mobile | `InjuryReportForm` |

### Zawodnik — TOP 10 problemów

| # | Problem | Dowód |
|---|---------|-------|
| 1 | **`/injuries/portal` brak w whitelist nav** | `PLAYER_ONLY_HREFS` |
| 2 | Dwa „Mój sprzęt” (inventory + equipment portal) | `navigation.ts` 91–95, 204–208 |
| 3 | Dashboard generyczny (teams count, permissions) | Niski player value |
| 4 | Coach-only tabs w Frekwencji → redirect | `attendance-sub-nav` |
| 5 | Portal urazów tylko przez quick action (max 6 slotów) | Może wypaść z listy |
| 6 | Brak push „twój mecz za 2 dni — potwierdź obecność” na home | Brak actionable card |
| 7 | Akademia development — niejasna ścieżka dla amatora | `/academy/development` |
| 8 | Chat pusty bez empty state | `ChatThread` |
| 9 | Liga w nav ale ograniczona wartość dla zawodnika | Może mylić |
| 10 | Brak jasnego „Moja dostępność na ten tydzień” | Wymaga wejścia w trening |

### Rodzic — TOP 10 problemów

| # | Problem | Dowód |
|---|---------|-------|
| 1 | **`/injuries/portal` brak w whitelist** | `PARENT_ONLY_HREFS` |
| 2 | `/crm/parents` z pełnym CRM sub-nav (9 nieistotnych zakładek) | `crm/layout.tsx` |
| 3 | `requireCrmReadAccess` pozwala portal user na `/crm/*` | `session.ts` |
| 4 | Attendance coach/AI tabs visible → redirect | Jak u zawodnika |
| 5 | „Moje składki” OK, ale brak historii płatności na mobile home | Finance portal depth |
| 6 | Dwa portale sprzętu — confusion | inventory vs equipment |
| 7 | Brak agregatu „status dziecka” (frekwencja + uraz + składka) | Brak parent dashboard |
| 8 | Communication bez empty states | Blank sections |
| 9 | Nazewnictwo PL/EN | Club CRM |
| 10 | Powiadomienia urazu — brak jasnego „co zrobić” w UI portalu | Text-only empty |

### Sponsor — TOP 10 problemów

| # | Problem | Dowód |
|---|---------|-------|
| 1 | **Bottom nav: Treningi/Drużyna bez uprawnień → redirect** | `bottom-navigation.tsx` |
| 2 | Minimalny sidebar (6) vs generic bottom bar | Niespójne wayfinding |
| 3 | PWA shortcut „AI Assistant” bez `ai:chat` | `manifest.ts` |
| 4 | Content Hub pełny vs potrzeby read-only sponsora | Nav breadth |
| 5 | Brak dedykowanego sponsor home (ROI publikacji) | Generic dashboard |
| 6 | Portal sponsorów oddzielny od Content — 2 miejsca | `/sponsors/portal` + `/content` |
| 7 | Brak mobile preview publikacji | Desktop-first panels |
| 8 | Communication bez guided „odpowiedz klubowi” | Generic lists |
| 9 | Brak powiadomienia o nowej publikacji w UI (poza hub) | Discoverability |
| 10 | Język angielski w nazwach modułów | Brand inconsistency |

---

## AUDIT D — MOBILE / PWA

### Moduły kluczowe — ocena responsywności

| Moduł | iPhone / małe ekrany | Android | Główne problemy |
|-------|---------------------|---------|-----------------|
| **Dashboard** | Mobile quick actions OK (`md:hidden`) | OK | Generic content; permission dump; crowded bottom zone |
| **Communication Hub** | Sub-nav scroll OK | OK | Puste sekcje; chat `min(70vh,640px)`; brak layout H1 |
| **Attendance** | Kalendarz 7-kol `min-h-16` — ciasno | Ciasno | Coach tabs leak; squad cards OK |
| **Match Squad** | Admin: `min-w-[640px]` scroll | Scroll | RSVP path OK w `/attendance/matches/[id]` |
| **Injury** | Form OK `max-w-xl` | OK | Sub-nav 7 tabs scroll; text-only empty states |
| **CRM** | Pipeline `min-w-[240px]` kol.; tabele `520px` | Scroll | Form 10 pól 2-col; parent widzi 10 tabs |

### PWA — stan

| Aspekt | Plik | Ocena |
|--------|------|-------|
| Service Worker | `src/sw.ts` | `NetworkOnly` na chronionych trasach — **offline praktycznie nie działa** dla modułów |
| Manifest | `src/app/manifest.ts` | `standalone`, portrait; shortcuts **nierolowe** |
| Offline cache | `pwa-provider.tsx` + `/api/pwa/offline-data` | Tylko harmonogram; refresh co sesję (+2,5s) |
| Install prompt | `install-prompt.tsx` | `bottom-20` — konkuuruje z bottom nav |
| Bottom nav | `bottom-navigation.tsx` | **Nie filtruje po roli** — P0 dla sponsora |
| Duplikat menu | `MobileDashboardNav` + `MobileMoreSheet` | Dwa pełne nav |

### TOP problemy mobile (priorytet)

| Priorytet | Problem | Lokalizacja |
|-----------|---------|-------------|
| **P0** | Bottom nav bez RBAC | `bottom-navigation.tsx` |
| **P0** | Injury portal off-nav dla player/parent | `dashboard-nav.tsx` |
| **P1** | Match squad admin table horizontal scroll | `match-detail-view.tsx` → `SquadPanel` |
| **P1** | CRM pipeline/donations horizontal scroll | `crm-pipeline-board.tsx` |
| **P1** | Availability calendar cramped | `availability-calendar.tsx` |
| **P1** | Offline PWA bezużyteczny dla auth tasks | `sw.ts` |
| **P2** | Podwójne menu mobile | header + bottom „Więcej” |
| **P2** | Manifest shortcuts ignorują RBAC | `manifest.ts` |
| **P2** | Touch targets — większość OK (min-h-11 w attendance quick) | częściowe |
| **P3** | `portrait-primary` — tablet/landscape lineup | `manifest.ts` |

---

## AUDIT E — BEZPIECZEŃSTWO

### Mocne strony

- Globalne REVOKE anon + RLS na tabelach (`20260531140000_security_hardening.sql`).
- 50+ helperów `SECURITY DEFINER` z walidacją `auth.uid()` i membership.
- Wszystkie 21 modułów `actions.ts` wywołują `requireAccessContext()`.
- Audyty etapowe (stage1510: 16/16 + 27/27 RLS).
- Storage RLS powiązane z RBAC (finance, players, website).
- Portale: sponsor/parent/player scoped w RLS + page guards.

### Potencjalne ryzyka

| ID | Severity | Ryzyko | Lokalizacja |
|----|----------|--------|-------------|
| E1 | **Wysokie** | `SUPABASE_SERVICE_ROLE_KEY` wymagany w runtime (push, dispatch), checklist mówi „nie w runtime” | `admin.ts`, `push-dispatch.ts`, `production-checklist.md` |
| E2 | **Średnie** | `DEFAULT_CLUB_ID` w `players/actions.ts` (19×) zamiast `access.clubId` | Multi-tenant / club switch → IDOR |
| E3 | **Średnie** | Middleware: auth only, bez RBAC | `middleware.ts` — nowa strona bez guard = dostęp |
| E4 | **Średnie** | Brak `FORCE ROW LEVEL SECURITY` | Obrona tylko przez poprawność RLS |
| E5 | **Średnie** | `/api/pwa/push/dispatch` — cron secret; brak wpisu w `vercel.json` | Push nie dojdzie na prod |
| E6 | **Niskie–średnie** | Video signed URL: walidacja path bez lookup w DB | `video/loaders.ts` vs wzorzec finance |
| E7 | **Niskie** | Inventory portal: link gracza po email `.ilike` | `session.ts` — shared email risk |
| E8 | **Niskie** | Parent finance: fetch 50 płatności klubu + filter JS | RLS backup, fragile pattern |
| E9 | **Niskie** | Dev: push dispatch open bez secret gdy NODE_ENV wrong | `dispatch/route.ts` |
| E10 | **Niskie** | `unstable_cache` bez `revalidateTag` | Stale match filters / AI context do 5 min |

### Portale — podsumowanie

| Portal | Page guard | RLS | Uwaga |
|--------|------------|-----|-------|
| Sponsor | `requireSponsorPortalAccess` | `sponsor_id_for_user` | ✅ |
| Parent finance | `requireFinancePortalAccess` | `parent_player_ids()` | ✅ pattern query |
| Player inventory | `requireInventoryPortalAccess` | email match ⚠️ | E7 |
| Injury | `requireInjuryPortalAccess` | `actor_managed_player_ids` | ✅ audyt 27/27 |
| Equipment | `requireEquipmentPortalAccess` | team scope | ✅ |
| CRM parent | `requireCrmPortalAccess` | `actor_crm_portal_contact_ids` | ⚠️ nav leak |

### Cross-club / cross-team

- **Cross-club:** RLS + `.eq("club_id", access.clubId)` w większości akcji; wyjątek `DEFAULT_CLUB_ID` w players (bezpieczne tylko dla single-club pilot).
- **Cross-team (trener):** Enforcement w RLS injuries/attendance (stage1510 hardening); match squad scoped by team membership.

---

## AUDIT F — PRODUKCJA

### Obecny stan

| Element | Status |
|---------|--------|
| Vercel | `fra1`, build/install w `vercel.json` ✅ |
| CI | `.github/workflows/ci.yml` — typecheck + build ✅ |
| Security audit scripts | `npm run audit:security`, `audit:stage*` ✅ |
| Security audit w CI | ❌ |
| Sentry / APM | ❌ |
| Structured logging | ❌ |
| Cron push | ❌ brak w vercel.json |
| Production checklist | ⚠️ zatrzymany na stage116 |
| Backup | Wzmianka PITR w checklist — wymaga Supabase Pro |
| Indeksy DB | Rozbudowane per moduł (stage115, finance, video, equipment, PWA queue) ✅ |
| Cache | Minimalny cross-request; brak tag invalidation |

### Checklist wdrożeniowa

#### MUST FIX BEFORE REAL USERS

- [ ] Zastosować **wszystkie migracje ETAP 1 → 15.10** (nie tylko do stage116).
- [ ] `ALLOW_PUBLIC_REGISTRATION=false` na produkcji.
- [ ] Ustawić `SUPABASE_SERVICE_ROLE_KEY` w Vercel (**wymagany** dla push/dispatch).
- [ ] Skonfigurować `PWA_CRON_SECRET`, `VAPID_*` + Vercel Cron → `POST /api/pwa/push/dispatch`.
- [ ] Uruchomić `npm run audit:security` + audyty stage1510/159 przed go-live.
- [ ] Włączyć Supabase PITR/backup (Pro).
- [ ] Skonfigurować Auth redirect URLs + `NEXT_PUBLIC_SITE_URL`.
- [ ] Alert Vercel na 5xx.
- [ ] Naprawić whitelist nav: `/injuries/portal` dla player/parent.
- [ ] Naprawić bottom nav RBAC (sponsor redirect loop).

#### SHOULD FIX

- [ ] Dodać `audit:security` do CI.
- [ ] Sentry (lub równoważny) server + client.
- [ ] Zaktualizować `production-checklist.md` (service role, PWA env, migracje do 1510).
- [ ] `players/actions.ts`: `access.clubId` zamiast `DEFAULT_CLUB_ID`.
- [ ] DB ownership check przed video signed URL.
- [ ] `revalidateTag()` lub usunięcie martwych tagów cache.
- [ ] Security headers (CSP, HSTS) w `vercel.json` lub middleware.
- [ ] Paginacja w loaderach listowych (content, video, CRM, academy talents).
- [ ] N+1 fix w `getLeagueConflicts`.
- [ ] `FORCE ROW LEVEL SECURITY` na finance, injuries, CRM.

#### NICE TO HAVE

- [ ] Vercel Analytics / Web Vitals dashboard.
- [ ] Usunięcie martwego sidebar stack (~800 linii).
- [ ] Konsolidacja sub-nav / empty states.
- [ ] Role-aware PWA manifest shortcuts.
- [ ] Scoped offline cache dla read-only widoków (harmonogram, tabela).
- [ ] EXPLAIN ANALYZE na RPC `get_dashboard_context`, `get_pwa_offline_context` przy prod volume.
- [ ] Indeks `players(club_id, lower(email))` dla inventory portal.
- [ ] Pełna polonizacja nav lub i18n.

---

## AUDIT G — JAKOŚĆ PRODUKTU

### Pytanie

> Czy trener Pioruna Wawrzeńczyce jest w stanie prowadzić drużynę wyłącznie przy pomocy Football Club OS?

### Odpowiedź: **NIE w 100% — TAK w ~85% scenariuszy codziennych**

System **pokrywa rdzeń pracy trenera amatorskiej/ligowej drużyny**, ale **nie zastępuje w pełni** operacji w terenie (boisko, szatnia, szybkie decyzje match-day) bez dodatkowej pracy obejścia UX.

### Co trener MOŻE zrobić w systemie ✅

| Obszar | Możliwość | Moduł |
|--------|-----------|-------|
| Plan treningów | Tworzenie, edycja, kalendarz | Training |
| Obecność na treningu | Zaznaczanie attendance | Training detail |
| Dostępność zawodników | Kalendarz + deklaracje | Attendance |
| Mecze | Terminarz, skład, wydarzenia, MVP | Matches |
| Powołania / RSVP | Match Squad panel | Attendance |
| Kadra | Lista zawodników, profile, notatki | Players |
| Urazy / niedostępność | Zgłoszenie, RTP, wpływ na skład | Injuries |
| Komunikacja | Ogłoszenia, wiadomości, czaty drużyny | Communication |
| Tabela / liga | League Hub, wyniki | League |
| Wideo / materiały | Analiza, klipy | Video |
| AI | Raporty trening/mecz, asystent | AI |
| Sprzęt drużyny | Przegląd przydziałów | Equipment (read) |
| Strona publiczna | Aktualności (ogranicznie) | Content / Website |

### Czego brakuje / co blokuje „tylko w systemie” ❌

| # | Brak | Wpływ na trenera |
|---|------|------------------|
| 1 | **Jeden ekran „Dzień trenera”** (dzisiejszy trening + mecz + kto nie gra + RSVP) | Trener skacze między 4 modułami |
| 2 | **Unified match-day flow** (powołania + skład + obecność w jednym miejscu mobile-first) | Dwa modele: admin squad vs RSVP |
| 3 | **Szybkie oznaczenie obecności** w 1 tap z mobile home | Quick action idzie na listę treningów, nie bieżącą sesję |
| 4 | **Push w terenie** wymaga pełnej konfiguracji cron/VAPID | Bez tego komunikacja reaktywna słabsza |
| 5 | **Offline na boisku** — PWA nie cache’uje modułów auth | Brak sieci = brak listy kadry |
| 6 | **Taktyka / diagramy / rozstawienie wizualne** | Tylko tekstowe lineup w match detail |
| 7 | **Plan mikrocyklu / periodyzacja** | Treningi bez makrocykla sezonowego |
| 8 | **Ocena indywidualna po treningu** (poza akademią) | Development module bardziej scoutingowy |
| 9 | **Integracja PZPN/DZPN live** (składy do rozgrywek) | Integracje istnieją, ale nie „jeden klik wyślij skład” |
| 10 | **Kontakt alarmowy rodzic na meczu** | CRM/rodzic oddzielnie od match squad |
| 11 | **Prosta lista „kto jest zdrowy na sobotę”** bez wejścia w 3 moduły | Wymaga składania injuries + availability + squad |
| 12 | **Mobilna tabela składu bez horizontal scroll** | `SquadPanel` min-width 640px |

### Werdykt produktowy

Dla **Pioruna Wawrzeńczyce** (klub ligowy, jedna/sezonowe drużyny, trener jako hub operacyjny):

- **Sezon + tygodniowa praca:** ✅ możliwe w systemie.
- **Match-day w szatni na telefonie:** ⚠️ możliwe z frustracją (scroll, wiele kliknięć).
- **100% bez Excel/WhatsApp:** ❌ nadal potrzebne obejścia komunikacyjne i ewentualnie arkusz do szybkich notatek taktycznych.

---

## WYNIK KOŃCOWY — OCENY 1–10

| Obszar | Ocena | Uzasadnienie skrócone |
|--------|:-----:|------------------------|
| **Performance** | **6** | Layout zoptymalizowany; ciężkie strony bez paginacji i league N+1 |
| **Security** | **8** | RLS + audyty; luki pilotowe (DEFAULT_CLUB_ID, docs, video URLs) |
| **Architecture** | **6** | Dobre nowe moduły; session.ts i dual league obciążają |
| **UX** | **6** | Feature-complete; nav overload, role homes, PL/EN |
| **Mobile** | **5** | RSVP OK; admin tables, bottom nav, offline słabe |
| **Production Readiness** | **6** | Build OK; monitoring, cron, checklist, CI security brak |

### Średnia ważona platformy: **6,2 / 10**

Platforma jest **gotowa na pilot jednego klubu** po zamknięciu MUST FIX z Audytu F. Do **produktu „trener pracuje tylko tutaj”** wymaga sprintu UX/mobile (nie nowych modułów) — konsolidacja flow trenera, naprawa nav portali, paginacja loaderów.

---

## Załącznik — mapa modułów (stan 15.10)

| Moduł | Trasy | Audyt bezpieczeństwa | Loader pattern |
|-------|-------|---------------------|----------------|
| Dashboard | `/dashboard` | layout RPC | session.ts |
| League Hub | `/league/*` | stage league | league/loaders (no cache) |
| Matches | `/matches/*` | stage matches | session.ts |
| Training | `/training/*` | stage training | session.ts |
| Attendance | `/attendance/*` | stage157 | attendance/loaders |
| Communication | `/communication/*` | stage156 | communication/loaders |
| Club CRM | `/crm/*` | stage158 | crm/loaders |
| Sponsors | `/sponsors/*` | stage sponsors | session.ts |
| Finance | `/finance/*` | stage finance | session.ts |
| Equipment | `/equipment/*` | stage159 ✅ | equipment/loaders |
| Injuries | `/injuries/*` | stage1510 ✅ 27/27 | injuries/loaders |
| AI | `/ai/*` | stage AI | ai/context (unstable_cache) |
| Content | `/content/*` | stage content | content/loaders |
| Video | `/video/*` | stage14 | video/loaders |
| Website | `/website`, public | stage website | public-data |
| PWA | sw, manifest, API | stage12 | push-dispatch |

---

## Następne kroki (sprint stabilizacyjny — bez nowych funkcji)

1. **Tydzień 1 — MUST FIX:** produkcja env, nav whitelist, bottom nav RBAC, migracje 1510, cron push.
2. **Tydzień 2 — Performance:** paginacja TOP 5 loaderów, league N+1, dedup match detail.
3. **Tydzień 3 — UX trener/portal:** unified coach day, match squad mobile, empty states.
4. **Tydzień 4 — Architektura:** ekstrakcja krytycznych loaderów z session.ts, aktualizacja checklist.

---

*Raport wygenerowany w ramach sprintu stabilizacyjnego POST-15.10. Bez zmian w kodzie aplikacji.*
