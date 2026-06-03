# PROJECT HANDOFF — FC OS (Football Club OS)

**Klub referencyjny:** Piorun Wawrzeńczyce / GLKS Mietków  
**Repozytorium:** `dawidthai125/pilka`  
**Dokument:** stan na 2026-06-03 · dla nowego agenta  
**Produkcja:** https://pilka-mu.vercel.app

---

## 1. PROJECT STATUS

### Obecny etap

- **ETAP 15.x** — platforma modułowa (League Hub, Content, CRM, PWA, itd.) — **wdrożona i używana**.
- **Strona publiczna** — **Public Website 4.0** + późniejsze **ujednolicenie dark matchday** na wszystkich podstronach publicznych (`PublicLandingHome`, `/druzyna`, `/tabela`, `/mecze`, …).
- **Dane ligowe** — **mirror live sync** (90minut + regionalnyfutbol + regiowyniki kadra); brak oficjalnego API PZPN/DZPN w produkcji.
- **Sprint 16.0 P0** — **wdrożony na produkcję** (wydajność public + stabilizacja ingestu ligowego).

### Ostatni wdrożony sprint

**Performance & League Stabilization 16.0 — P0**  
Commit: `aee9d4f4cb53e647d0c85dfc90780ee212a35cbd`  
Deployment: `dpl_EYRCaYJQBpHMYtvyV8vHbGsQcaqv` · werdykt deploy: **GO**

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

### Stabilization Sprint 15.10A

- Naprawa nawigacji RBAC (bottom nav, sponsor bez redirect loop).
- Portal urazów w nav dla rodzica/zawodnika.
- TOP 5 wydajności (League Hub, match detail).
- **Coach Day** na `/dashboard`.
- Usunięcie martwego kodu z auditu.
- Raport: `docs/audit/stabilization-sprint-1510a-report.md`

### Club Identity 15.10B

- Spójna identyfikacja wizualna Pioruna: login, sidebar, dashboard chrome, PWA.
- Logo, kolory `#0B3D2E` / `#F4C430`, crest badges.
- Raport: `docs/audit/club-identity-1510b-report.md`

### Layout Sprint 15.10C

- Redesign dashboardu (hero, visuals, Coach Day integration).
- Premium dark green + gold UI panelu.
- Raporty: `docs/audit/layout-sprint-1510c-report.md`, `docs/audit/layout-1510c-build-report.md`

### Public Website 2.0

- Przebudowa `/`: moduły meczowe, akademia, wiele drużyn, top strzelcy, tabela skrócona.
- Multi-club SaaS (bez hardcodu nazw w logice).
- Raport: `docs/audit/public-website-2.0-report.md`

### Public Website 3.0

- Scenografia „klub piłkarski”: pełnoekranowy hero, matchday plakat, sponsor wall, ciemna scena `#062820`.
- Usunięto osobną sekcję „Klub w liczbach” (statystyki w hero).
- Skrócona nawigacja publiczna.
- Raport: `docs/audit/public-website-3.0-implementation-report.md`

### Public Website 4.0

- Fotorealistyczne JPG w `/club-media/`, naprawa Matchday (`Invalid Date`).
- Lokalność z CMS, akademia wyżej, sponsorzy jako partnerzy.
- Raport: `docs/audit/public-website-4.0-implementation-report.md`

### Piorun Real Content Sprint

- Audyt: 100% slotów demo, fake newsy, stock zdjęcia.
- P1 wykonane **lokalnie** (import FB Playwright, migracja newsów, ukrycie demo sponsorów) — raport mówi „bez commita na prod” w momencie pisania; **zweryfikuj** `git log` i stan `website_media` na Supabase prod.
- Raport: `docs/audit/real-content-sprint-report.md`, `docs/audit/p1-import-report.md`
- Przewodnik treści: `docs/audit/piorun-brand-content-guide.md`

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
| **Commit** | `aee9d4f4cb53e647d0c85dfc90780ee212a35cbd` |
| **Deployment ID** | `dpl_EYRCaYJQBpHMYtvyV8vHbGsQcaqv` |
| **URL** | https://pilka-mu.vercel.app |
| **Region Vercel** | `fra1` |
| **Status** | ● Ready (production) |
| **CI (ostatni push)** | Run `26874634689` — **success** (~1m57s) |

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
- DNA wizualne: `docs/audit/piorun-visual-dna.md`

### Styl komunikacji

- Ciepły, lokalny, rodzinny, energiczny (tytuły mogą być CAPS jak plakat meczowy).
- „My”, „nasz klub” — nie korporacyjny ton.
- Telefon: **+48 663 595 991**
- Pełny przewodnik: `docs/audit/piorun-brand-content-guide.md`

---

## 7. OPEN TASKS

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

---

## START HERE

Instrukcja dla **nowego agenta** po otwarciu repozytorium:

### Krok 0 — Baza wiedzy (obowiązkowe)

Przeczytaj **[`docs/ai/README.md`](../ai/README.md)** — pełna architektura, struktura strony, moduły, liga, DB, zasady. Ten handoff to **stan na dziś**; `docs/ai/` to **jak działa cały system**.

### Krok 1 — Kontekst (5 min)

1. Przeczytaj ten plik do końca.
2. Przeczytaj `docs/audit/piorun-brand-content-guide.md` jeśli dotykasz treści publicznych.
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
- Vercel: ostatni deployment = commit `aee9d4f` (lub nowszy).

### Krok 4 — Zweryfikuj ligę

```bash
npm run sync:league-live:dry-run
node scripts/verify-squad-registry.mjs   # jeśli masz .env.local
```

Porównaj wynik z sekcją 4 tego dokumentu.

### Krok 5 — Zaplanuj sprint

- **Rekomendacja produktowa:** **League Player Matching 16.1** (sekcja 8).
- **Rekomendacja techniczna równoległa:** commit **Regiowyniki goals** + **Etap B** (`get_public_home_bundle`) — patrz P1.

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

---

*Dokument wygenerowany w ramach przekazania projektu FC OS. Aktualizuj po każdym wdrożonym sprincie.*
