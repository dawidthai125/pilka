# FC OS — Inwentaryzacja nawigacji

**Sprint:** 20.3A (audyt UX, tylko analiza)  
**Data:** 2026-06-06  
**Baseline:** `main` · prod `eb29e7a`  
**Źródła:** `src/config/navigation.ts`, `platform-shell.tsx`, `dashboard-nav.tsx`, `src/app/**/page.tsx`

---

## Legenda ról

| Skrót | Opis |
|-------|------|
| **Platform** | Email w `PLATFORM_ADMIN_EMAILS` (nie rola klubowa) |
| **Owner** | Właściciel klubu (`owner`) |
| **Leadership** | `owner`, `president`, `sports_director` |
| **Admin klubu** | W praktyce: owner / president (brak roli `admin`) |
| **Staff** | coach, treasurer, scout, website_admin (wg modułu) |
| **Portal** | parent, player, sponsor (widok ograniczony) |
| **Public** | Niezalogowany użytkownik |
| **All** | Każdy zalogowany członek klubu (po filtrze RBAC) |

---

## A. Platform Admin (`/platform`)

### A.1 Menu boczne (sidebar)

Źródło: `src/features/platform/components/platform-shell.tsx`

| Nazwa | Route | Rola | Przeznaczenie |
|-------|-------|------|---------------|
| Dashboard | `/platform` | Platform | KPI, attention, alerty, onboarding, ostatnie syncy i operacje |
| Monitoring | `/platform/monitoring` | Platform | Health klubów/lig, alerty platformy, Sync History, cron |
| Audit Center | `/platform/audit` | Platform | Filtrowalny rejestr zdarzeń audit (JSONB per klub) |
| Kluby | `/platform/clubs` | Platform | Club Operations Registry — lista, filtry, lifecycle inline |
| Nowy klub | `/platform/clubs/new` | Platform | Create Club Wizard |
| ← Panel klubowy | `/dashboard` | All (auth) | Wyjście z kontekstu platformy do panelu klubowego |

### A.2 Trasy bez pozycji w sidebarze (cross-link)

| Nazwa | Route | Rola | Przeznaczenie |
|-------|-------|------|---------------|
| Szczegóły klubu | `/platform/clubs/[clubId]` | Platform | Onboarding grid, bramki aktywacji G1–G5, owner, linki liga |
| League Status | `/platform/clubs/[clubId]/league` | Platform | Status syncu ligi per klub (operator) |
| League Setup | `/platform/clubs/[clubId]/league/setup` | Platform | Wizard konfiguracji ligi (mirror live / import) |

### A.3 Menu górne / wejście do Platform

| Nazwa | Route | Rola | Przeznaczenie |
|-------|-------|------|---------------|
| Platform — kluby | `/platform/clubs` | Platform | Link w menu użytkownika (header panelu klubowego) — **jedyny** widoczny punkt wejścia z club UI |

### A.4 Szybkie akcje (Platform Dashboard)

| Nazwa | Route | Rola | Przeznaczenie |
|-------|-------|------|---------------|
| Wszystkie kluby | `/platform/clubs` | Platform | Skrót do registry |
| Monitoring Center | `/platform/monitoring` | Platform | Pełny monitoring |
| Alerty krytyczne | `/platform/monitoring` | Platform | Ten sam route co Monitoring (badge liczby CRITICAL) |
| Kluby wymagające uwagi | `/platform/clubs?status=attention` | Platform | Filtr registry attention |

### A.5 Cross-linki między ekranami Platform

| Z ekranu | Do | Cel |
|----------|-----|-----|
| Dashboard → klub | `/platform/monitoring?clubId=` | Health per klub |
| Dashboard → klub | `/platform/clubs/[id]` | Szczegóły / onboarding |
| Dashboard → onboarding | `/platform/clubs?status=onboarding` | Lista onboardingu |
| Dashboard → alerty | `/platform/monitoring` | Pełne alerty |
| Dashboard → audit | `/platform/audit` | Audit Center |
| Dashboard → sync | `/platform/clubs/[id]/league` | Liga klubu |
| Registry → health | `/platform/monitoring?clubId=` | Monitoring |
| Registry → szczegóły | `/platform/clubs/[id]` | Detail |
| Registry → filtry | `/platform/clubs?status=` | active / onboarding / archived / attention |
| Registry (inline) | Archive / Restore / Resend | Lifecycle bez osobnej strony |
| Monitoring → klub | `/platform/clubs/[id]` | Nazwa klubu w tabeli health |
| Monitoring → liga | `/platform/clubs/[id]/league` | Nazwa klubu w tabeli league health |
| Sync History → klub | `/platform/clubs/[id]/league` | Kolumna klubu |
| Club detail → liga | setup / status | Konfiguracja i status ligi |
| Club detail → public | `{slug}` (external) | Podgląd strony klubu |

---

## B. Panel klubowy — menu główne (sidebar)

Źródło: `src/config/navigation.ts` + filtr `dashboard-nav.tsx`  
**Uwaga:** Lista płaska (brak grup). Widoczność zależy od ról — poniżej pełna inwentaryzacja z domyślną rolą docelową.

### B.1 Rdzeń i ustawienia

| Nazwa | Route | Rola | Przeznaczenie |
|-------|-------|------|---------------|
| Dashboard | `/dashboard` | All | Pulpit: Coach Day, statystyki, tabela ligowa skrót |
| Profil użytkownika | `/profile` | All | Dane konta użytkownika |
| Ustawienia aplikacji | `/settings` | All | Motyw, locale, preferencje PWA |
| Profil klubu | `/club` | All (edit: Leadership) | Metadane klubu, branding podstawowy |
| Drużyny | `/teams` | All | Lista drużyn (create: Leadership) |
| Zawodnicy | `/players` | All (`player:read`) | Kadra klubu |
| Role i uprawnienia | `/members` | Leadership (`member:read`) | Macierz RBAC, członkowie |

### B.2 Sport i operacje dzienne

| Nazwa | Route | Rola | Przeznaczenie |
|-------|-------|------|---------------|
| Treningi | `/training` | owner, president, sports_director, coach, player, parent | Kalendarz i lista treningów |
| Panel trenera | `/training/coach` | coach+ (`training:manage`) | Widok operacyjny trenera |
| Frekwencja | `/attendance` | attendance_staff | Obecności, kalendarz, raporty |
| Mecze | `/matches` | owner, president, sports_director, coach, player, parent | Terminarz i wyniki klubu |
| Tabela ligowa | `/matches/league-table` | All (w nav) | Skrót tabeli w kontekście meczów |
| Urazy | `/injuries` | injuries_staff | Rejestr urazów (staff) |
| Mój status urazu | `/injuries/portal` | injuries_portal | Portal zawodnika/rodzica |
| Akademia | `/academy` | academy_staff | Grupy, rozwój, talenty, scouting |

### B.3 Liga i integracje

| Nazwa | Route | Rola | Przeznaczenie |
|-------|-------|------|---------------|
| Integracje | `/integrations` | integration_staff | PZPN, DZPN, importy, mapowania, historia sync |
| Rozgrywki | `/league` | league_staff | League Hub — tabela, terminarz, sync, rejestr |

### B.4 Komunikacja i treści

| Nazwa | Route | Rola | Przeznaczenie |
|-------|-------|------|---------------|
| Komunikacja | `/communication` | communication_staff | Ogłoszenia, czaty, AI |
| Treści | `/content` | content_staff | Posty, kalendarz, kanały, media |
| Strona klubu | `/website` | website_staff | CMS: news, media, galeria, branding |
| Wideo | `/video` | video_staff | Biblioteka wideo |

### B.5 CRM, finanse, sprzęt

| Nazwa | Route | Rola | Przeznaczenie |
|-------|-------|------|---------------|
| Club CRM | `/crm` | crm_staff | Kontakty, pipeline, wydarzenia, zadania |
| Relacje klubu | `/crm/parents` | crm_parent | Portal rodzica — relacje |
| Equipment & Assets | `/equipment` | equipment_staff | Rejestr sprzętu klubowego |
| Mój sprzęt (equipment) | `/equipment/portal` | equipment_portal | Wydania sprzętu — zawodnik/rodzic |
| Finanse | `/finance` | finance_staff | Przychody, koszty, składki, budżety |
| Moje składki | `/finance/portal` | parent | Portal rodzica — opłaty |
| Magazyn | `/inventory` | inventory_staff | Stan magazynowy, wydania, zamówienia |
| Mój sprzęt (inventory) | `/inventory/portal` | player | Portal zawodnika — przydzielony sprzęt |
| Sponsorzy | `/sponsors` | staff (leadership) | CRM sponsorów, leady, publikacje |
| Panel sponsora | `/sponsors/portal` | sponsor | Portal sponsora |

### B.6 AI (3 osobne pozycje sidebar)

| Nazwa | Route | Rola | Przeznaczenie |
|-------|-------|------|---------------|
| AI Club Manager | `/ai/manager` | canReadAi | Konfiguracja i przegląd AI |
| Zadania AI | `/ai/tasks` | canReadAi | Kolejka zadań AI |
| Club AI Assistant | `/ai` | canReadAi | Chat / asystent |

---

## C. Panel klubowy — menu górne (header)

Źródło: `src/components/layout/dashboard-header.tsx`

| Nazwa | Route / akcja | Rola | Przeznaczenie |
|-------|---------------|------|---------------|
| Hamburger (mobile) | Sheet → pełny sidebar | All | Nawigacja na mobile |
| Szukaj | placeholder (read-only) | All | **Niefunkcjonalne** — UX dead-end |
| Strona publiczna | `/` (new tab) | All | Podgląd witryny klubu |
| Powiadomienia | `/notifications` | All | Centrum powiadomień |
| Menu użytkownika → Profil | `/profile` | All | — |
| Menu użytkownika → Powiadomienia | `/notifications` | All | Duplikat dzwonka |
| Menu użytkownika → Platform — kluby | `/platform/clubs` | Platform | Wejście operatora SaaS |
| Wyloguj | sign out | All | — |

---

## D. Panel klubowy — bottom nav (mobile PWA)

Źródło: `src/lib/navigation/mobile-nav.ts`, `bottom-navigation.tsx`  
Max **4 taby** + **„Więcej”** (pełny sidebar).

| Profil użytkownika | Taby (przykład) | Rola |
|--------------------|-----------------|------|
| Staff (owner/coach) | Start, Mecze, Treningi, Drużyna / Frekwencja | leadership / coach |
| Parent portal | Start, Składki, Frekwencja / Urazy / Komunikacja | parent |
| Player portal | Start, Treningi, Mecze, Frekwencja / Urazy | player |
| Sponsor portal | Start, Portal sponsora, Treści, Komunikacja | sponsor |

---

## E. Sub-nawigacja modułów (tabs wewnętrzne)

Moduły z poziomym paskiem zakładek (nie w głównym sidebarze):

| Moduł | Plik | Zakładki (skrót) |
|-------|------|------------------|
| CRM | `crm-sub-nav.tsx` | Przegląd, Kontakty, Pipeline, Rodzice, Wolontariusze, Partnerzy, Darowizny, Wydarzenia, Zadania, AI |
| Integracje | `integrations-sub-nav.tsx` | Przegląd, PZPN, DZPN, Extranet, Ręczne, Importy, Mapowania, Historia sync |
| Rozgrywki | `league-sub-nav.tsx` | Dashboard, Tabela, Terminarz, Import, Sync Center, Drużyny, Rejestr zawodników, Źródła |
| Akademia | `academy-sub-nav.tsx` | Przegląd, Grupy, Rozwój, Talenty, Skauting, Przeciwnicy (role-filtered) |
| Frekwencja | `attendance-sub-nav.tsx` | Dashboard, Kalendarz, Raporty trenera, AI Insights |
| Urazy | `injury-sub-nav.tsx` | Dashboard, Rejestr, Zgłoś, Historia, Kategorie, AI, Mój status |
| Sprzęt | `equipment-sub-nav.tsx` | Przegląd, Rejestr, Magazyn, Wydania, Stroje, Konserwacja, AI |
| Komunikacja | `communication-sub-nav.tsx` | Przegląd, Ogłoszenia, Trener, Czaty, AI |
| Finanse | inline na `/finance` | Przychody, Koszty, Składki, Dotacje, Budżety, Dokumenty, Raporty |
| Magazyn | inline na `/inventory` | Pozycje, Wydania, Zwroty, Uszkodzenia, Stroje, Inwentaryzacje, Dostawcy, Zamówienia |
| Strona klubu | inline na `/website` | Aktualności, Media, Galeria, Branding, Social |
| Treści | inline na `/content` | Kalendarz, Kolejka, Generator AI |
| Sponsorzy | inline na `/sponsors` | Leady, Publikacje, Dodaj sponsora |
| Wideo | inline na `/video` | Biblioteka, Upload |

**Szacunek tras panelu klubowego:** ~132 `page.tsx` w `src/app/(dashboard)/`.

---

## F. Strona publiczna (kontekst nawigacji)

Źródło: `public-club-nav.tsx`, `public-site-nav.tsx`

| Nazwa | Route | Rola | Przeznaczenie |
|-------|-------|------|---------------|
| Strona główna | `/` lub `/[clubSlug]` | Public | Landing multi-club |
| Kadra | `/[slug]/druzyna` | Public | Skład |
| Mecze | `/[slug]/mecze` | Public | Terminarz publiczny |
| Tabela | `/[slug]/tabela` | Public | Tabela ligowa |
| Aktualności | `/[slug]/aktualnosci` | Public | News |
| Galeria | `/[slug]/galeria` | Public | Albumy |
| Sponsorzy | `/[slug]/sponsorzy` | Public | Partnerzy |
| Kontakt / Kibic | `/[slug]/kontakt`, `/kibic` | Public | Kontakt i społeczność |
| Logowanie | `/login` | Public | Wejście do panelu |

---

## G. Auth (poza panelem)

| Nazwa | Route | Rola | Przeznaczenie |
|-------|-------|------|---------------|
| Logowanie | `/login` | Public | Auth |
| Rejestracja | `/register` | Public | Zaproszenie / rejestracja |
| Reset hasła | `/forgot-password` | Public | Recovery |
| Błąd auth | `/auth/error` | Public | Komunikat błędu OAuth |

---

## H. Podsumowanie liczebne

| Obszar | Pozycje sidebar (max) | Trasy page.tsx | Sub-nav modułów |
|--------|----------------------|----------------|-----------------|
| Platform Admin | 5 + 1 exit | 8 | 0 (filtry query na registry/audit/monitoring) |
| Panel klubowy (owner) | ~27 płaskich pozycji | ~132 | 14 modułów z tabs |
| Public | ~8 linków nav | ~15+ | 0 |

---

*Dokument wygenerowany w ramach Sprint 20.3A — audyt nawigacji (read-only).*
