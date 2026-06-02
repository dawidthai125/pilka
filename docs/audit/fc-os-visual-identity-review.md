# FC OS VISUAL IDENTITY REVIEW

**Football Club OS — Club Identity & Layout Review**  
**Klub docelowy:** Piorun Wawrzeńczyce (GLKS Mietków)  
**Data:** 2026-06-02  
**Zakres analizy:** Dashboard · Sidebar · Mobile Navigation · Login · Public Website · Coach Day  
**Status:** analiza wyłącznie — **bez implementacji**

**Produkcja:** https://pilka-mu.vercel.app  
**Strona publiczna:** `/` (ClubSiteShell + `website_settings`)

---

## Executive summary

Football Club OS ma **dwa równoległe systemy wizualne**:

| Warstwa | Tożsamość | Ocena |
|---------|-----------|-------|
| **Strona publiczna** | Kolory Pioruna, hero, logo, footer klubowy | ✅ Spójna, „klubowa” |
| **Panel aplikacji** (dashboard, sidebar, moduły) | shadcn/ui neutral gray + Geist + SaaS copy | ❌ Generyczna, „admin panel” |

Kolory klubu (`#0B3D2E` / `#F4C430`) są zdefiniowane w `website_settings` i używane na stronie publicznej oraz częściowo w PWA (`--pwa-primary`), ale **nie są mapowane na tokeny UI** (`--primary` w `globals.css` pozostaje szaro-czarny). Efekt: użytkownik przechodzi ze **zbrandowanej strony klubu** do **anonimowego panelu SaaS** — to główny problem tożsamości wizualnej przed pilotażem.

---

## 1. Aktualne problemy UI

### 1.1 Rozjazd tożsamości: public vs app

```
Strona publiczna          →    Panel /login → /dashboard
─────────────────              ───────────────────────────
--club-primary (#0B3D2E)       --primary (oklch gray ~#333)
Logo / PW fallback             Brak logo — sam tekst
Hero, gradient, sponsorzy      Białe karty shadcn
„Panel klubu” CTA              „Football Club OS” w loginie
```

**Pliki:** `club-site-shell.tsx`, `globals.css`, `login-form.tsx`, `(dashboard)/layout.tsx`

### 1.2 Dashboard wygląda jak panel administracyjny

| Element | Problem | Plik |
|---------|---------|------|
| Nagłówek „Dashboard” + suchy opis | Brak powitania klubowego, brak herosa | `dashboard/page.tsx` |
| Karta „Uprawnienia aktywne” (liczba permissionów) | Metryka developerska / RBAC debug | `dashboard/page.tsx` |
| Karta „Twoje role” z badge’ami | Przypomina panel IAM, nie klub | `dashboard/page.tsx` |
| Siatka 5 identycznych kart | Monotonna, bez hierarchii wizualnej | `dashboard/page.tsx` |
| Brak logo klubu na starcie | Tylko tekst w sidebarze | `(dashboard)/layout.tsx` |

**Wrażenie użytkownika:** system operacyjny produktu B2B, nie „aplikacja mojego klubu”.

### 1.3 Sidebar (desktop) — funkcjonalny, bez charakteru klubu

**Obecny stan** (`(dashboard)/layout.tsx` + `dashboard-nav.tsx`):

- Nagłówek: `siteConfig.shortName` (**„Piorun”**) + nazwa klubu — **bez logo, bez koloru akcentu**
- Etykieta produktu: uppercase „Piorun” wygląda jak label SaaS, nie herb
- **40+ pozycji menu** bez grupowania wizualnego (AI, CRM, Integracje, League Hub obok Treningów)
- Aktywna pozycja: `bg-primary` = **szary/czarny**, nie zielony Pioruna
- Mieszanka języków: PL + EN (`Communication Hub`, `Injury & Medical`, `Equipment & Assets`, `Club CRM`, `Video Center`, `Content Hub`, `League Hub`)

**Brak identyfikacji klubowej:** sidebar nie korzysta z `website_settings.primaryColor` ani `logoPath`.

### 1.4 Mobile Navigation — fragmentacja i generyczność

| Problem | Szczegóły |
|---------|-----------|
| **Trzy menu naraz** | Hamburger (header, lewy sheet) + bottom nav + „Więcej” (dolny sheet) — ten sam `DashboardNav` 2× |
| **Bottom nav bez koloru klubu** | `border-t bg-card/95` — neutralny, jak iOS tab bar |
| **MobileRoleHeader** | Jedyny zielony element mobile — gradient `--pwa-primary`, ale reszta ekranu biała/szara |
| **Etykieta „Football Club OS”** w banerze mobile | Produkt zamiast „Piorun Wawrzeńczyce” |
| **„Content” w nav sponsora** | EN w polskim UI (`i18n.ts`) |
| **Brak logo w bottom bar** | Tylko ikony Lucide |

**Pliki:** `bottom-navigation.tsx`, `mobile-more-sheet.tsx`, `mobile-dashboard-nav.tsx`, `mobile-home.tsx`

### 1.5 Login — zero identyfikacji klubu

**Obecny stan** (`login-form.tsx`, `(auth)/layout.tsx`):

- Białe tło, wycentrowana karta shadcn
- Tytuł: **„Logowanie”** / opis: **„Zaloguj się do Football Club OS”**
- Brak: logo Pioruna, kolorów klubu, zdjęcia boiska, linku „wróć na stronę klubu”
- Layout auth **nie ładuje** `website_settings` — niemożliwe spójne logowanie bez refactoru

**Kontrast:** publiczny header ma pełny branding + przycisk „Panel klubu” → login wygląda jak inna aplikacja.

### 1.6 Public Website — najlepiej zbrandowana warstwa, z lukami

**Mocne strony** (`club-site-shell.tsx`, `club-home-sections.tsx`):

- CSS vars: `--club-primary`, `--club-secondary`, `--club-accent` z bazy
- Header/footer w kolorze klubu, hero z opcjonalnym zdjęciem
- Fallback logo „PW” w złotym kole — spójne z kolorystyką

**Słabe strony / niespójności:**

| Issue | Opis |
|-------|------|
| **Mieszanka tokenów** | Sekcje używają `text-primary` (gray shadcn) obok `text-[var(--club-primary)]` |
| **Karty treści** | `bg-card` + szare border — jak panel admin, nie jak strona klubu |
| **Footer** | „Powered by Football Club OS” — produkt dominuje nad klubem |
| **Logo** | `logoPath` w seedzie często pusty → fallback „PW”, nie herb Pioruna |
| **Odcięcie od panelu** | Po kliknięciu „Panel klubu” użytkownik traci całą identyfikację wizualną |

### 1.7 Coach Day — dobry UX trenera, słaba tożsamość wizualna

**Obecny stan** (`coach-day-panel.tsx`):

- Tytuł **„Coach Day”** (EN) — nie „Dzień trenera” / „Dziś w klubie”
- **6 identycznych kart** shadcn w siatce — brak wyróżnienia priorytetu (trening vs mecz)
- Kolory semantyczne tylko punktowo (`text-amber-600` dla braków kadrowych)
- Szybkie akcje: `variant="secondary"` — szare pills, bez akcentu klubowego
- Brak logo drużyny, zdjęcia boiska, skrótu „Piorun”

**Funkcjonalnie:** najlepszy element dashboardu trenera. **Wizualnie:** kolejny moduł admin table.

### 1.8 Inne niespójności systemowe

| # | Problem |
|---|---------|
| V1 | `globals.css` `--primary` ≠ `website_settings.primary_color` |
| V2 | Dark mode: `--sidebar-primary` = **niebieski** (`oklch 264`) — całkowicie off-brand dla Pioruna |
| V3 | Font **Geist** — neutralny tech font; brak fontu „sportowego” / lokalnego charakteru |
| V4 | PWA manifest: nazwa **„Football Club OS”**, skrót **„FCOS”** — nie „Piorun” |
| V5 | Ikona PWA: kolory Pioruna, ale symbol **„+”** zamiast pioruna / PW / logo |
| V6 | `siteConfig.shortName` = „Piorun” w sidebarze, ale `PWA_DEFAULT_THEME.name` = „Football Club OS” |
| V7 | ThemeProvider (`fcos-theme`) — light/dark systemowy, bez „club theme” |

---

## 2. Branding Pioruna

### 2.1 Dane z systemu (seed + config)

| Element | Wartość | Źródło |
|---------|---------|--------|
| Nazwa publiczna | **Piorun Wawrzeńczyce** | `clubs.public_name`, `siteConfig.name` |
| Nazwa oficjalna | **GLKS Mietków** (liga) | `clubs.official_name`, hero subtitle |
| Lokalizacja | Wawrzeńczyce, Dolnośląskie, B Klasa | seed website |
| Kolor primary | **#0B3D2E** (ciemna zieleń) | `website_settings`, `PWA_DEFAULT_THEME` |
| Kolor secondary | **#F4C430** (złoty / „piorun”) | j.w. |
| Kolor accent | **#FFFFFF** | j.w. |
| Kontakt | kontakt@piorun-wawrzenczyce.pl | seed |
| Social | Facebook, Instagram, YouTube | seed |

### 2.2 Semantyka marki (rekomendacja projektowa)

**Piorun** sugeruje wizualnie:

- **Energia** — błysk, dynamika (nie statyczny corporate dashboard)
- **Lokalność** — mały klub z Wawrzeńczyce, społeczność, boisko
- **Kontrast** — zieleń boiska + złoty akcent (już w seedzie — dobrze dobrane)
- **Herb / inicjały** — fallback „PW” jest sensowny do czasu uploadu logo w CMS

### 2.3 Co system już ma vs czego brakuje

| Asset | W CMS / DB | W panelu app | W PWA |
|-------|------------|--------------|-------|
| `primary_color` | ✅ | ⚠️ tylko `--pwa-primary` (1 komponent) | ✅ theme-color meta |
| `secondary_color` | ✅ | ❌ | ⚠️ CSS var, mało używany |
| `logo_path` | ✅ upload | ❌ | ⚠️ ikona generyczna „+” |
| `hero_image` | ✅ | ❌ | ❌ |
| Nazwa klubu | ✅ | ✅ tekst | ❌ manifest = FCOS |

### 2.4 Rekomendacja tożsamości docelowej

**Jedna marka, dwa konteksty:**

1. **Public** — pełna ekspresja klubu (jak dziś, z dopracowaniem kart)
2. **App** — **„Piorun OS”** / **„Panel Pioruna”** jako sub-brand; kolory klubu na chrome (header, sidebar, akcenty), nie tylko na mobile banner

Produkt **Football Club OS** → stopka / about / „Powered by” — nie w nagłówku codziennego użytkowania.

---

## 3. Kolory

### 3.1 Paleta Pioruna (kanoniczna)

| Token | HEX | Użycie |
|-------|-----|--------|
| `--club-primary` | `#0B3D2E` | Header, hero, CTA tło, sidebar tło (propozycja) |
| `--club-secondary` | `#F4C430` | Akcenty, CTA, aktywny tab, badge ważnych alertów |
| `--club-accent` | `#FFFFFF` | Tekst na primary |
| `--club-primary-muted` | `#0B3D2E` @ 10–15% | Tła kart Coach Day, selected states |
| `--club-secondary-muted` | `#F4C430` @ 20% | Hover, highlight w tabelach |

**Propozycja rozszerzenia:**

| Token | HEX | Użycie |
|-------|-----|--------|
| `--club-danger` | `#DC2626` | Kontuzje, zaległości |
| `--club-success` | `#16A34A` | Obecność, wpłacone składki |
| `--club-warning` | `#D97706` | RSVP, braki kadrowe (zamiast losowego amber-600) |

### 3.2 Mapowanie na shadcn (propozycja redesignu)

Obecnie (`globals.css`):

```css
--primary: oklch(0.205 0 0);  /* ~czarny — NIE klub */
```

Docelowo (koncept — **nie implementować teraz**):

- `--primary` ← `#0B3D2E` (lub oklch ekwiwalent)
- `--primary-foreground` ← `#FFFFFF`
- `--accent` ← `#F4C430` @ niska saturacja dla tła
- `--ring` ← `#0B3D2E`
- `--sidebar` ← `#0B3D2E` lub `#062820` (ciemniejszy odcień — już użyty w mobile gradient)
- `--sidebar-primary` ← `#F4C430` (aktywna pozycja menu)
- **Wyłączyć** niebieski sidebar w dark mode

**Mechanizm:** runtime injection z `website_settings` (jak `PwaThemeMeta`) → mapowanie na `:root` tokeny shadcn, nie tylko `--pwa-primary`.

### 3.3 Gdzie kolory są dziś vs gdzie powinny być

| Obszar | Dziś | Docelowo |
|--------|------|----------|
| Sidebar bg | `bg-card` (biały) | Ciemna zieleń + jasny tekst |
| Active nav | Szary `bg-primary` | Złoty pill lub zielony border-left |
| Primary button | Czarny | Zielony Pioruna |
| Coach Day cards | Białe | Białe + zielony header strip / ikona w secondary |
| Bottom nav active | `text-primary` (gray) | `text-[club-primary]` + ikona filled |
| Login tło | Białe | Split: lewa połowa hero klubu / prawa formularz |

---

## 4. Typografia

### 4.1 Stan obecny

| Warstwa | Font | Charakter |
|---------|------|-----------|
| Cała app | **Geist Sans** + Geist Mono | Neutralny SaaS (Vercel default) |
| Nagłówki public | Geist + `font-bold` | Brak odrębnej hierarchii |
| Sidebar / nav | `text-sm` uniform | Brak rozróżnienia sekcji |

### 4.2 Problemy

- **Geist** nie komunikuje „piłka nożna / klub / Dolny Śląsk”
- Brak **fontu display** na hero / Coach Day / nagłówki modułów
- Mieszanka **PL treści + EN nazw modułów** psuje spójność językową
- `tracking-tight` + `text-2xl` wszędzie — mało rytmu (wszystko „średnio ważne”)

### 4.3 Rekomendacja typografii Pioruna

| Rola | Propozycja | Przykład |
|------|------------|----------|
| **Display / hero** | Font z charakterem sportowym, ale czytelny (np. **Barlow Condensed**, **Oswald**, **DM Sans** bold) | „Piorun Wawrzeńczyce”, Coach Day |
| **UI / body** | Geist lub **Inter** — zostawić dla czytelności formularzy | Formularze, tabele |
| **Mono / stats** | Geist Mono | Wyniki, składki, numery na koszulkach |

**Skala (propozycja):**

| Poziom | Rozmiar | Użycie |
|--------|---------|--------|
| H1 | 28–32px / semibold | Dashboard powitanie, nazwa klubu |
| H2 | 20–24px | Coach Day, sekcje modułów |
| H3 | 16–18px | Karty, podsekcje |
| Body | 14–16px | Treść |
| Caption | 12px | Meta, daty meczów |

**Copy PL:** zamiana EN labels w nav na polskie (patrz sekcja 8 Quick wins).

---

## 5. Dashboard redesign

### 5.1 Problemy do adresowania

1. Brak **hero strefy klubowej** na desktop (mobile ma `MobileRoleHeader`, desktop nie)
2. **Coach Day** zginie w morzu kart statystycznych
3. Metryki **uprawnień / ról** — usunąć z widoku domyślnego (owner only / debug)
4. Brak **kontekstu sezonu** (kolejka, następny mecz w hero)
5. Jednolita siatka kart — brak **visual hierarchy**

### 5.2 Propozycja layoutu (wireframe koncepcyjny)

```
┌─────────────────────────────────────────────────────────────┐
│ [LOGO] Piorun Wawrzeńczyce · witaj, Jan · sezon 2025/26    │  ← Club hero strip (desktop)
├─────────────────────────────────────────────────────────────┤
│ COACH DAY (trener/owner) — pełna szerokość, 2 rzędy        │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ Dzisiejszy   │ │ Następny     │ │ RSVP         │        │
│ │ trening      │ │ mecz         │ │ alert        │        │
│ └──────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────┤
│ Rola: Zawodnik / Rodzic / Trener → spersonalizowane karty  │
│ (składki · frekwencja · komunikat) — max 3 karty           │
├─────────────────────────────────────────────────────────────┤
│ Szybkie akcje (ikony + kolor secondary)                     │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Zmiany per rola (bez nowych funkcji — tylko layout)

| Rola | Co pokazać na dashboardzie | Co ukryć / przenieść |
|------|---------------------------|----------------------|
| **Trener** | Coach Day na górze, skróty: frekwencja, mecz, komunikacja | Licznik uprawnień, role badges |
| **Zawodnik** | Następny trening, dostępność, ostatni komunikat | Statystyki klubu, drużyny staff |
| **Rodzic** | Składka, frekwencja dziecka, uraz (jeśli jest) | CRM, AI, integracje |
| **Owner** | Coach Day + KPI klubu (zawodnicy, mecze) | Surowa liczba permissions |

### 5.4 Coach Day — redesign wizualny

| Aspekt | Teraz | Propozycja |
|--------|-------|------------|
| Tytuł | „Coach Day” | **„Dziś w klubie”** lub **„Dzień trenera”** |
| Hierarchia | 6 równych kart | **2 duże** (trening + mecz) + **4 małe** (RSVP, urazy, kadra, akcje) |
| Kolor | Białe karty | Primary strip u góry sekcji; alert cards z `--club-secondary` border |
| CTA | Szare outline | Primary zielony + secondary dla drugorzędnych |
| Kontekst | Brak | Mini logo / nazwa drużyny w karcie treningu |

### 5.5 Desktop sidebar — redesign

```
┌──────────────────┐
│ [LOGO 48px]      │
│ Piorun           │
│ Wawrzeńczyce     │
├──────────────────┤
│ ▶ Dziś           │  ← Coach Day link (trener)
│ ─ Codzienne      │
│   Treningi       │
│   Mecze          │
│   Frekwencja     │
│ ─ Komunikacja    │
│ ─ Klub           │
│ ─ Admin ▼        │  ← AI, CRM, Integracje zwinięte
└──────────────────┘
```

- Tło: `#0B3D2E`, tekst biały, aktywny: złoty lewy border
- Grupowanie wizualne zmniejsza wrażenie „ERP”

---

## 6. Mobile redesign

### 6.1 Problemy

- 3 entry points do tej samej nawigacji
- Bottom nav generyczny; aktywny stan słabo widoczny
- Jedyny branded element (`MobileRoleHeader`) znika po scrollu
- Brak club logo w headerze (tylko „Klub” + nazwa)

### 6.2 Propozycja mobile chrome

**Header (sticky):**

```
┌────────────────────────────────────────┐
│ [≡]  [LOGO] Piorun    [🔔] [Avatar]   │
│      Wawrzeńczyce                      │
└────────────────────────────────────────┘
```

- Tło: białe LUB cienki primary strip (4px top)
- Hamburger: zostawić **albo** bottom „Więcej” — **nie oba pełne drzewa**

**Bottom nav (4 + Więcej):**

| Tab | Ikona | Aktywny stan |
|-----|-------|--------------|
| Start | dom | filled + `--club-primary` |
| Treningi | kalendarz | j.w. |
| Mecze | puchar | j.w. |
| Frekwencja | check | j.w. |
| Więcej | … | sheet z resztą |

- Tło bar: `bg-white` + `border-t` w `--club-primary` @ 20%
- Safe area zachowana

**Dashboard mobile:**

- `MobileRoleHeader`: zamienić „Football Club OS” → **nazwa klubu** + opcjonalnie logo
- Coach Day tuż pod headerem — **przed** generic stats
- Usunąć duplikat „Szybkie akcje” jeśli Coach Day już je ma

### 6.3 Uproszczenie nawigacji (UX + visual)

| Decyzja | Uzasadnienie |
|---------|--------------|
| Usunąć lewy hamburger **lub** uprościć do „Profil / Wyloguj” | Duplikat z „Więcej” |
| Bottom nav labels 100% PL | Spójność |
| Portal roles: dedykowane 4 taby (rodzic: Składki · Frekwencja · Urazy · Wiadomości) | Mniej „Więcej” |

---

## 7. Public website redesign

### 7.1 Mocne strony (zachować)

- Header/footer w `--club-primary`
- Hero z gradientem + opcjonalne zdjęcie boiska
- CTA Terminarz / Aktualności w `--club-secondary`
- Sponsor strip, tabela ligowa — dobre sekcje klubowe

### 7.2 Problemy

| Issue | Wpływ |
|-------|-------|
| Karty `bg-card` + szare border | Wyglądają jak widgety admin, nie jak media klubu |
| `text-primary` (gray) w linkach „Wszystkie” | Odcięcie od palety klubu |
| Brak realnego logo | Fallback „PW” — OK na dev, słabe na prod |
| Footer „Powered by FCOS” | Zbyt widoczny vs marka klubu |
| Brak ciągłości z panelem | Kolory giną po `/login` |

### 7.3 Propozycja redesignu public

**Homepage:**

1. **Hero** — pełna szerokość, zdjęcie boiska Pioruna, overlay zielony, CTA złote
2. **Następny mecz** — karta z diagonal stripe w `--club-secondary` (nie płaska szara)
3. **Aktualności** — większe miniatury, kategoria w kolorze secondary
4. **Tabela** — wiersz Pioruna highlighted `--club-primary-muted`
5. **Kadra CTA** — zdjęcie grupowe zamiast pustej karty z border

**Header:**

- Logo 48px (upload w `/website/branding`)
- Mobile nav pills: aktywny = `--club-secondary` bg

**Most do panelu:**

- Przycisk „Panel klubu” → login ze **split screen** (po lewej branding klubu, po prawej formularz)
- Po zalogowaniu: **ten sam primary** w sidebarze — użytkownik nie czuje „przeskoku”

**Footer:**

- Linia 1: klub + kontakt
- Linia 2: mały „System: Football Club OS” — dyskretnie

---

## 8. Quick wins

Zmiany niskiego nakładu, wysoki efekt wizualny (**kolejność sugerowana**):

| # | Zmiana | Effort | Efekt |
|---|--------|--------|-------|
| Q1 | **Mapuj `website_settings` → `--primary` / sidebar** (rozszerz `PwaThemeMeta`) | M | Cały panel w kolorach klubu |
| Q2 | **Login:** tło `#0B3D2E`, logo klubu, copy „Panel Pioruna Wawrzeńczyce” | S | Ciągłość public → app |
| Q3 | **Sidebar/header:** dodać `logoUrl` z website_settings | S | Natychmiastowa identyfikacja |
| Q4 | **Polonizacja nav:** Communication Hub → Komunikacja, Injury & Medical → Urazy, Coach Day → Dziś w klubie | S | Mniej „admin SaaS” |
| Q5 | **Ukryj kartę „Uprawnienia aktywne”** z dashboardu domyślnego | XS | Mniej panel IAM |
| Q6 | **MobileRoleHeader:** „Football Club OS” → nazwa klubu | XS | Spójność mobile |
| Q7 | **Aktywny bottom nav:** kolor `--club-primary` zamiast gray primary | S | Czytelny active state |
| Q8 | **PWA manifest** dynamiczny: `short_name: "Piorun"` | S | Ikona na telefonie „Piorun”, nie FCOS |
| Q9 | **Public:** linki `text-primary` → `text-[var(--club-primary)]` | XS | Spójność public |
| Q10 | **Upload logo** w CMS przed pilotem | Ops | Prawdziwy herb zamiast PW |

---

## 9. High impact visual improvements

Projekty większego zakresu (osobne iteracje po pilocie UX):

### HI-1 — Unified Club Theme Engine

**Opis:** Jeden loader `resolveClubTheme(clubId)` → CSS variables na `:root` dla public, auth, dashboard.

**Obejmuje:** shadcn tokens, PWA meta, manifest, ikony OG.

**Impact:** Eliminuje rozjazd public/app — **najważniejsza zmiana architektury wizualnej**.

---

### HI-2 — Dashboard jako „Club Home”, nie „Admin Home”

**Opis:** Przeprojektowanie `dashboard/page.tsx` — hero klubu, rola-based layout, Coach Day dominant dla trenera.

**Impact:** Pierwsze wrażenie użytkownika pilota — klub, nie software house.

---

### HI-3 — Sidebar redesign + grouped navigation

**Opis:** Ciemny sidebar w kolorach klubu, sekcje collapsible (Codzienne / Komunikacja / Administracja), logo + sezon.

**Impact:** Redukcja cognitive load; mniej „panel administracyjny”.

---

### HI-4 — Mobile navigation consolidation

**Opis:** Jeden canonical nav (bottom + sheet); usunięcie duplikatu hamburger full-tree; club-colored chrome.

**Impact:** Mobile pilot (trener/zawodnik/rodzic) — profesjonalny club app feel.

---

### HI-5 — Branded auth flow

**Opis:** Login / forgot-password / reset z hero klubu, opcjonalnie zdjęcie boiska, link „Strona klubu”.

**Impact:** Spójność całej ścieżki wejścia.

---

### HI-6 — Coach Day visual system

**Opis:** Dedykowany layout „Dziś w klubie” — hierarchy cards, club colors, PL copy, ilustracje statusów (RSVP, urazy).

**Impact:** Flagowy ekran trenera — marketingowo i UX-owo najważniejszy moduł wizualny.

---

### HI-7 — Public website polish + photo-driven sections

**Opis:** Więcej fotografii klubu, mniej generycznych kart; highlighted row w tabeli; galeria na homepage.

**Impact:** Wizerunek zewnętrzny Pioruna; zaufanie rodziców/sponsorów.

---

### HI-8 — Custom PWA icon & splash z logo klubu

**Opis:** Dynamiczna ikona z `logo_path` lub monogram „⚡ PW”; splash screen w zieleni.

**Impact:** Telefon trenera wygląda jak **aplikacja klubu**, nie generyczna PWA.

---

## Macierz priorytetów (visual only)

| Priorytet | Element | Quick win / High impact |
|-----------|---------|-------------------------|
| **P0** | Mapowanie kolorów klubu → panel app | HI-1, Q1 |
| **P0** | Login + ciągłość z public | HI-5, Q2 |
| **P1** | Logo w sidebar/header | Q3, HI-3 |
| **P1** | Dashboard role-based layout | HI-2, Q5 |
| **P1** | Polonizacja + Coach Day PL | Q4, HI-6 |
| **P2** | Mobile nav consolidation | HI-4, Q7 |
| **P2** | Public cards polish | HI-7, Q9 |
| **P3** | Font display / typografia | Sekcja 4 |
| **P3** | PWA manifest + ikony | HI-8, Q8 |

---

## Pliki referencyjne (analiza)

| Obszar | Kluczowe pliki |
|--------|----------------|
| Tokeny UI | `src/app/globals.css` |
| PWA / kolory runtime | `src/lib/pwa/branding.ts`, `src/components/pwa/pwa-theme-meta.tsx` |
| Dashboard layout | `src/app/(dashboard)/layout.tsx`, `dashboard/page.tsx` |
| Sidebar / nav | `src/components/layout/dashboard-nav.tsx`, `src/config/navigation.ts` |
| Mobile | `src/components/pwa/bottom-navigation.tsx`, `mobile-more-sheet.tsx`, `mobile-home.tsx` |
| Login | `src/features/auth/components/login-form.tsx`, `(auth)/layout.tsx` |
| Public | `src/features/website/components/club-site-shell.tsx`, `club-home-sections.tsx` |
| Coach Day | `src/features/dashboard/components/coach-day-panel.tsx` |
| Branding DB | `supabase/migrations/20260603101000_seed_website.sql` |
| Site config | `src/config/site.ts` |

---

## Werdykt analizy

**Football Club OS ma solidną bazę brandingową Pioruna na stronie publicznej**, ale **panel aplikacji nie korzysta z tej tożsamości** — wygląda jak generyczny produkt B2B (shadcn neutral + FCOS copy + metryki RBAC).

**Przed / równolegle z pilotażem UX** rekomendowane minimum wizualne:

1. Kolory klubu w całym panelu (Q1)
2. Logo + nazwa klubu w chrome (Q3)
3. Login spójny ze stroną publiczną (Q2)
4. Polonizacja i Coach Day jako „Dziś w klubie” (Q4, HI-6)

**Nie rozpoczęto implementacji.** Następny krok (po akceptacji raportu): sprint **Club Identity 15.10B** — wyłącznie warstwa wizualna, bez ETAPU 15.11 funkcjonalnego.

---

*Raport przygotowany na podstawie analizy kodu źródłowego FC OS 15.10A. Bez zmian w repozytorium.*
