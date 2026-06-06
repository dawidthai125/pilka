# FC OS — Identyfikacja problemów UX nawigacji

**Sprint:** 20.3A  
**Data:** 2026-06-06  
**Severity:** 🔴 wysoka · 🟡 średnia · 🟢 niska

---

## 1. Zduplikowane funkcje

| ID | Problem | Severity | Szczegóły |
|----|---------|----------|-----------|
| **DUP-01** | Tabela ligowa w dwóch miejscach | 🟡 | Sidebar: **Tabela ligowa** → `/matches/league-table` oraz moduł **Rozgrywki** → `/league/table`. Te same dane, różne konteksty nawigacji. |
| **DUP-02** | Sync / import w Integracjach i Rozgrywkach | 🟡 | `/integrations/sync` (Historia sync) vs `/league/sync` (Sync Center). Operator nie wie, który jest „prawdziwy”. |
| **DUP-03** | Treści vs Strona klubu vs Content | 🟡 | `/website` (CMS), `/content` (social/posts), nakładanie dla `website_admin` i owner. |
| **DUP-04** | Alerty na Platform Dashboard i Monitoring | 🟢 | Dashboard: top 5 alertów; Monitoring: pełna lista + filtry. Zamierzone, ale **„Alerty krytyczne”** w quick actions prowadzi na ten sam URL co Monitoring Center. |
| **DUP-05** | Audit: Dashboard vs Audit Center | 🟡 | „Ostatnie operacje platformy” (15 wpisów) duplikuje funkcję Audit Center bez filtrów. |
| **DUP-06** | Health: Dashboard vs Monitoring vs Registry | 🟡 | Health score w registry → link do monitoring; dashboard ma attention table; monitoring ma pełne tabele. Trzy wejścia, spójne dane, różna głębokość. |
| **DUP-07** | Dwa „Mój sprzęt” | 🟡 | Etykieta identyczna: `/equipment/portal` i `/inventory/portal` — różne moduły, ten sam label w sidebarze. |
| **DUP-08** | Powiadomienia w header 2× | 🟢 | Dzwonek + pozycja w menu użytkownika → `/notifications`. |

---

## 2. Zduplikowane ścieżki dostępu

| ID | Cel | Ścieżki (kliki od root) | Severity |
|----|-----|-------------------------|----------|
| **PATH-01** | Monitoring klubu X | Sidebar Monitoring → filtr · Dashboard attention → Monitoring · Registry → Monitoring · Health score click | 🟢 OK (wiele wejść) |
| **PATH-02** | Onboarding klubu X | Dashboard onboarding table → detail · Registry filter onboarding → detail · Dashboard KPI → registry | 🟢 OK |
| **PATH-03** | Archive klubu | **Tylko** Registry row action — **brak** na club detail | 🔴 |
| **PATH-04** | Resend invite | **Tylko** Registry — detail pokazuje status bez akcji | 🔴 |
| **PATH-05** | Platform Admin | User menu → Platform · (brak w sidebarze club) · po wejściu sidebar Platform | 🟡 Ukryte wejście |
| **PATH-06** | League setup (platform) | Club detail → setup · Club detail → status → setup · Registry → detail → setup | 🟡 3+ kliki |
| **PATH-07** | Sync history klubu | Monitoring (in-page filter) · Dashboard recent syncs → league page · Sync history section → league | 🟡 Rozproszone |

---

## 3. Nieintuicyjne nazwy (PL/EN mix)

| ID | Obecna nazwa | Problem | Severity |
|----|--------------|---------|----------|
| **NAME-01** | Club CRM | Angielski w polskim UI | 🟡 |
| **NAME-02** | Equipment & Assets | Angielski, długie | 🟡 |
| **NAME-03** | Club AI Assistant / AI Club Manager | Dwa podobne „AI Club…” | 🟡 |
| **NAME-04** | Audit Center | Angielski (reszta Platform częściowo PL) | 🟡 |
| **NAME-05** | Monitoring Center (quick action) vs Monitoring (sidebar) | Niespójność label | 🟢 |
| **NAME-06** | League Setup / League Status | Angielski na stronach detail | 🟡 |
| **NAME-07** | Rozgrywki vs Integracje | Niejasna granica modułów | 🟡 |
| **NAME-08** | Requires Attention (filtr registry) | Angielski w filtrze PL UI | 🟢 |
| **NAME-09** | Panel klubowy vs Platform | Dwa „panele” — użytkownik multi-role może się gubić | 🟡 |

---

## 4. Przeładowane menu

| ID | Obszar | Metryka | Severity |
|----|--------|---------|----------|
| **MENU-01** | Club sidebar (owner) | **~27 pozycji płaskich**, brak grup | 🔴 |
| **MENU-02** | Club sidebar | Ustawienia (Profil, Settings) **nad** modułami operacyjnymi | 🟡 |
| **MENU-03** | AI w sidebar | **3 osobne pozycje** z tą samą ikoną Bot | 🟡 |
| **MENU-04** | CRM sub-nav | **10 zakładek** poziomy scroll | 🟡 |
| **MENU-05** | Integracje sub-nav | **8 zakładek** | 🟡 |
| **MENU-06** | League sub-nav | **8 zakładek** | 🟡 |
| **MENU-07** | Platform Dashboard | **7 sekcji** na jednej stronie (scroll >3 viewporty) | 🟡 |
| **MENU-08** | Monitoring page | Health + League health + Alerts + Sync History + Cron | 🟡 Jedna strona „wszystko” |

---

## 5. Sekcje trudne do odnalezienia

| ID | Funkcja | Gdzie jest | Problem | Severity |
|----|---------|------------|---------|----------|
| **FIND-01** | Platform Admin | Tylko dropdown użytkownika | Operator nie wie, że ma dostęp | 🟡 |
| **FIND-02** | Lifecycle (archive/restore) | Tylko registry table | Nie na club detail | 🔴 |
| **FIND-03** | Aktywacja klubu (G1–G5) | Club detail | OK, ale brak linku z dashboard onboarding („Kontynuuj” → detail, nie activation card) | 🟢 |
| **FIND-04** | Test clubs filter | Registry `hideTest` toggle | Ukryte — dobrze dla ops, słabo udokumentowane | 🟢 |
| **FIND-05** | Panel trenera | Sidebar osobno od Treningi | Trener może nie wiedzieć o `/training/coach` | 🟡 |
| **FIND-06** | Mapowania ligowe | `/integrations/mappings` vs `/league/players` | Dwa miejsca na matching | 🟡 |
| **FIND-07** | Global search | Header — **read-only placeholder** | Obietnica bez funkcji | 🔴 |

---

## 6. Zbyt wiele kliknięć (top tasks)

| Zadanie | Obecna ścieżka | Kliki | Severity |
|---------|----------------|-------|----------|
| Zobacz CRITICAL alert klubu | Login → Platform dropdown → clubs → monitoring → znajdź klub | 4–5 | 🟡 |
| Resend invite ownera | Platform → Kluby → znajdź wiersz → Resend | 3 + scroll | 🟡 |
| Archive klub onboarding | Platform → Kluby → filter onboarding → **brak archive** (tylko active!) | ∞ | 🔴 |
| Sync history failed job | Dashboard sync table → league page → monitoring → filter | 3–4 | 🟡 |
| Owner: opublikuj news | Sidebar Strona klubu → Aktualności | 2 | 🟢 |
| Coach: frekwencja treningu | Bottom nav Frekwencja lub sidebar | 1–2 | 🟢 |
| Rodzic: składki | Bottom nav Składki | 1 | 🟢 |

---

## 7. Funkcje administracyjne zbyt wysoko

| ID | Funkcja | Obecna pozycja | Rekomendowany tier | Severity |
|----|---------|----------------|-------------------|----------|
| **ADMIN-01** | Role i uprawnienia | Sidebar pozycja ~26/27 | Poziom 3 (grupa Admin) | 🟡 |
| **ADMIN-02** | Integracje (PZPN adapter) | Sidebar L1 dla owner | Poziom 3 | 🟡 |
| **ADMIN-03** | Ustawienia aplikacji | Sidebar pozycja 3 | Poziom 3 (user menu) | 🟡 |
| **ADMIN-04** | Nowy klub (Platform) | Sidebar równorzędny z Kluby | Poziom 2 (akcja, nie stały nav) | 🟡 |
| **ADMIN-05** | Audit Center | Sidebar L1 | Poziom 2 (obok registry) | 🟢 |

---

## 8. Funkcje ważne ukryte zbyt głęboko

| ID | Funkcja | Problem | Severity |
|----|---------|---------|----------|
| **HIDE-01** | Owner invite status | Tylko mały tekst na detail; brak raportu stale invites | 🔴 (znany backlog 20.2) |
| **HIDE-02** | Attention clubs | Dashboard top 10; pełna lista wymaga `?status=attention` | 🟢 |
| **HIDE-03** | Coach Day | Tylko na `/dashboard` — nie w bottom nav | 🟢 |
| **HIDE-04** | League sync errors | Monitoring page na dole (Sync History) | 🟡 |
| **HIDE-05** | Aktywacja (G1–G5) | Dopiero na club detail po „Kontynuuj onboarding” | 🟡 |

---

## 9. Niespójności architektoniczne UX

| ID | Temat | Opis |
|----|-------|------|
| **ARCH-01** | Brak grup w sidebarze club | Portale mają whitelist; staff ma flat list — niespójne wzorce |
| **ARCH-02** | Sub-nav tylko w niektórych modułach | Finance/Inventory używają inline links, CRM używa `SubNav` — różne wzorce |
| **ARCH-03** | Platform club detail bez lifecycle | Registry = centrum operacji; detail = onboarding — rozdrobnione |
| **ARCH-04** | `club-directory-table.tsx` martwy | Nieużywany komponent — potencjalna confusion dla agentów/devów |
| **ARCH-05** | Nav vs page guard | Sidebar pokazuje pozycje bez uprawnień; strona redirectuje (np. `/members`) |

---

## 10. Ranking problemów (Top 10)

| # | ID | Problem | Impact |
|---|-----|---------|--------|
| 1 | MENU-01 | 27 pozycji flat sidebar (owner) | Przeciążenie poznawcze, długi scroll |
| 2 | FIND-07 | Search placeholder bez funkcji | Złamana obietnica UX |
| 3 | PATH-03/04 | Lifecycle tylko w registry, nie na detail | Operator musi pamiętać „gdzie jest akcja” |
| 4 | DUP-01/02 | Liga rozbita między Mecze, Rozgrywki, Integracje | Zagubienie przy sync/import |
| 5 | DUP-07 | Dwa „Mój sprzęt” | Błąd wyboru dla parent/player |
| 6 | MENU-03 | 3× AI w sidebar | Szum, ta sama ikona |
| 7 | NAME-07 | Rozgrywki vs Integracje | Niejasna granica produktowa |
| 8 | MENU-07 | Platform dashboard przeładowany | Wszystko na jednej stronie |
| 9 | FIND-01 | Platform entry ukryty w dropdown | Odkrywalność |
| 10 | HIDE-01 | Brak widoku stale owner invites | Blokuje skalowanie onboardingu |

---

## 11. Co działa dobrze (nie zmieniać bez powodu)

- **Portale** (parent/player/sponsor) — whitelist + bottom nav: czytelne, mało pozycji.
- **Platform sidebar** — 5 pozycji: zwięzłe, logiczne.
- **Cross-linki health** registry ↔ monitoring — dobra sieć powiązań.
- **RBAC filtrowanie** sidebar — technicznie poprawne (poza nav vs guard gap).
- **Attention Dashboard** (19.1) — dobra idea agregacji na Platform Dashboard.
- **Mobile „Więcej”** — sensowny escape hatch przy 4 tabach.

---

*Sprint 20.3A — findings (read-only). Implementacja w osobnym sprincie.*
