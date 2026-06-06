# FC OS — Navigation v2 (propozycja)

**Sprint:** 20.3A (audyt UX — propozycja, bez implementacji)  
**Data:** 2026-06-06  
**Status:** DRAFT do review produktowego  
**Powiązane audyty:** [navigation-inventory.md](../archive/audit/navigation-inventory.md) · [navigation-tiering.md](../archive/audit/navigation-tiering.md) · [navigation-findings.md](../archive/audit/navigation-findings.md)

---

## Zasady projektowe Navigation v2

1. **Grupowanie tierów** — Poziom 1 widoczny zawsze; Poziom 2 w rozwijanych sekcjach; Poziom 3 w „Ustawienia / Administracja”.
2. **Jeden moduł = jedna brama** — Liga i sync tylko przez **Rozgrywki**; integracje techniczne pod Poziomem 3.
3. **Dashboard = centrum akcji** — Najczęstsze zadania wykonywalne z dashboardu (1–2 kliki), nie tylko linki gdzie indziej.
4. **Spójność językowa** — Polski w UI operatora; angielskie terminy tylko tam, gdzie są nazwami własnymi (np. PZPN).
5. **Bez zmiany routingu w v2.0** — Propozycja zakłada reorganizację menu i agregację na dashboardach; URL-e pozostają (redirecty opcjonalne w v2.1).

---

## A. Administrator Platformy — Navigation v2

### A.1 Struktura menu bocznego (proponowana)

```
PLATFORM
├── Pulpit                    → /platform
├── Operacje
│   ├── Rejestr klubów        → /platform/clubs
│   └── Nowy klub             → /platform/clubs/new          [akcja primary, nie L1 stale]
├── Observability
│   ├── Monitoring            → /platform/monitoring
│   └── Audit                 → /platform/audit
└── ← Panel klubowy           → /dashboard
```

**Zmiany vs dziś:**
- **Nowy klub** przeniesiony do podgrupy „Operacje” (nie równorzędny z Rejestrem na top-level).
- **Audit Center** → skrót **Audit** (PL); podgrupa Observability.
- Etykieta **Monitoring Center** usunięta — jeden termin „Monitoring”.

### A.2 Platform Dashboard v2 (agregacja akcji)

| Sekcja | Priorytet | Zawartość | Akcje inline (nowe) |
|--------|-----------|-----------|---------------------|
| **Wymaga dzisiaj** | P0 | Attention clubs + CRITICAL alerts + stale owner invites | Resend invite · Otwórz monitoring · Kontynuuj onboarding |
| **KPI** | P1 | 4 karty (bez zmian) | Klik → filtr registry |
| **Onboarding** | P2 | Top 5 (skrócone z 10) | Link do detail |
| **Sync i zdrowie** | P2 | Ostatnie 5 synców + link „wszystkie” | Klik failed → monitoring z filtrem |
| **Ostatnie operacje** | P3 | 5 wpisów (skrócone z 15) | Link Audit |

**Usunięte / przeniesione z dashboardu:**
- Pełna tabela Platform Health (5 kart) → **tylko KPI + badge na Monitoring**.
- Duplikat „Szybkie akcje” z dwoma linkami do `/platform/monitoring` → jeden **Monitoring** + licznik alertów na sekcji „Wymaga dzisiaj”.

### A.3 Club detail v2 (uzupełnienie nawigacji)

Na `/platform/clubs/[clubId]` dodać **pasek akcji lifecycle** (jak w registry):
- Archive / Restore / Resend invite (wg statusu)
- Monitoring · Liga · Strona publiczna (bez zmian)

**Uzasadnienie:** PATH-03/04 z findings — operator nie powinien wracać do registry po akcji.

### A.4 Wejście do Platform z club UI

| Obecne | Proponowane |
|--------|-------------|
| Tylko dropdown → Platform — kluby | Dropdown + **banner** na dashboard ownera (jeśli `isPlatformAdmin`): „Panel operatora →” |

---

## B. Właściciel klubu — Navigation v2

### B.1 Struktura menu bocznego (proponowana)

```
PULPIT
└── Dashboard                 → /dashboard

SPORT
├── Mecze                     → /matches
├── Treningi                  → /training
├── Frekwencja                → /attendance
├── Kadra                     → /players          [rename: Zawodnicy → Kadra]
└── Urazy                     → /injuries

ROZGRYWKI                   → /league             [jedna brama: tabela, terminarz, sync, import]
  (sub-nav bez zmian zakładek, ale BEZ duplikatu Tabela ligowa w sidebar)

KLUB
├── Komunikacja               → /communication
├── Strona i treści           → /website          [merge entry: website + skrót do /content]
├── Sponsorzy                 → /sponsors
├── Finanse                   → /finance
├── Magazyn                   → /inventory
├── Sprzęt klubowy            → /equipment        [rename PL]
├── CRM                       → /crm              [rename: Club CRM → CRM]
└── Akademia                  → /academy

NARZĘDZIA
├── Wideo                     → /video
└── Asystent AI               → /ai               [jedna pozycja; sub: manager, tasks, chat]

ADMINISTRACJA               [zwinięta sekcja, domyślnie collapsed]
├── Drużyny                   → /teams
├── Integracje                → /integrations
├── Role i członkowie         → /members
├── Profil klubu              → /club
├── Profil użytkownika        → /profile
└── Ustawienia aplikacji      → /settings
```

**Liczba pozycji top-level:** 6 grup + ~15 widocznych (vs 27 flat dziś).

### B.2 Zmiany nazw (owner)

| Było | Będzie |
|------|--------|
| Zawodnicy | Kadra |
| Club CRM | CRM |
| Equipment & Assets | Sprzęt klubowy |
| 3× AI (Manager, Zadania, Assistant) | Asystent AI (hub z zakładkami) |
| Tabela ligowa (sidebar) | *usunięte* — tylko w Rozgrywkach |
| Strona klubu + Treści (osobno) | Strona i treści (hub) lub Treści jako sub website |

### B.3 Club Dashboard v2 (agregacja)

| Sekcja | Dla owner | Akcje |
|--------|-----------|-------|
| **Dziś** | Coach Day, następny mecz, trening | 1 klik → mecz/trening |
| **Wymaga uwagi** | Failed sync (jeśli league_staff), nieopłacone składki (finance), otwarte urazy CRITICAL | Link do modułu |
| **Skróty** | Kadra, Frekwencja, Rozgrywki, Komunikacja | 4 kafle |
| **Tabela / terminarz** | Skrót z league (bez pełnej tabeli) | → /league |

**Przeniesienie z sidebar do dashboardu:** nic obligatoryjnego — dashboard już ma Coach Day; rozszerzyć o **widget „liga”** i **alerty modułowe** (nie platform).

### B.4 Header v2

| Element | Decyzja |
|---------|---------|
| Search | **Ukryć** do czasu implementacji LUB ship z global search (osobny sprint) |
| Powiadomienia | Zostawić dzwonek; usunąć duplikat z user menu |
| Platform link | Zostawić w menu; dodać wizualny divider „Operator SaaS” |

---

## C. Administrator klubu (president / sports_director) — Navigation v2

Identyczna struktura jak **Owner**, z RBAC-em ukrywającym:

| Grupa | president | sports_director |
|-------|-----------|-----------------|
| ADMINISTRACJA → Integracje | read-only lub ukryte manage tabs | read + league manage |
| NARZĘDZIA → AI | tak | tak |
| KLUB → Finanse | tak | read (wg permissions) |
| ADMINISTRACJA → Role | tak (president); sports_director read |

**Collapsed Admin** szczególnie ważne — president rzadziej używa integracji PZPN niż owner.

---

## D. Trener — Navigation v2 (skrót)

```
PULPIT                      → /dashboard
SPORT
├── Panel trenera           → /training/coach    [Poziom 1 dla coach]
├── Treningi                → /training
├── Mecze                   → /matches
├── Frekwencja              → /attendance
└── Kadra                   → /players
KOMUNIKACJA                 → /communication
URAZY                       → /injuries          [jeśli staff]
WIĘCEJ                      → collapsed: Akademia, Wideo, AI, Liga (read)
```

Bottom nav bez zmian (Start, Mecze, Treningi, Frekwencja).

---

## E. Portale (parent / player / sponsor) — Navigation v2

**Bez większych zmian** — obecny whitelist model jest najlepszy w systemie.

Jedyna korekta:

| Rola | Zmiana |
|------|--------|
| parent | Rozróżnić etykiety: „Sprzęt (wydania)” vs „Magazyn (zawodnik)” zamiast dwa „Mój sprzęt” |
| player | `/inventory/portal` → **„Mój magazyn”**; `/equipment/portal` → **„Mój sprzęt”** |

---

## F. Ocena dashboardów (Zadanie 5)

### F.1 Platform Dashboard — co przenieść / wzmocnić

| Funkcja | Obecnie | Propozycja v2 | Oszczędność klików |
|---------|---------|---------------|-------------------|
| Aktywne alerty CRITICAL | Sekcja + link do monitoring | **Sekcja „Wymaga dzisiaj”** z akcją per alert | 1 klik |
| Błędy synchronizacji | Tabela na dole dashboardu | Widget top 5 failed + **filtr monitoring inline** | 2 → 1 |
| Wymagane działania (attention) | Tabela + registry link | **Inline**: Monitoring + Szczegóły + (future) Resend | 2 → 1 |
| Oczekujące zaproszenia owner | **Brak** | **Nowa sekcja** stale invites + Resend (backlog 20.2) | ∞ → 1 |
| Onboarding | Tabela | Skrócić; CTA **Aktywuj** gdy G1–G5 pass | 3 → 2 |
| Audit ostatnie operacje | 15 wierszy | 5 wierszy + Audit | scroll −60% |
| Platform Health 5 kart | Osobna sekcja | Merge do KPI (healthy/warning/critical badges) | scroll −1 viewport |

### F.2 Club Dashboard — co przenieść / wzmocnić

| Funkcja | Obecnie | Propozycja v2 |
|---------|---------|---------------|
| Następny mecz / trening | Coach Day partial | **Karta „Dziś”** always visible |
| Tabela ligowa | Skrót w pulpicie | Zostawić; link tylko do `/league` (nie `/matches/league-table`) |
| Alerty modułowe | Brak agregacji | Widgety: sync failed, finance overdue, injury open |
| Frekwencja na trening | Stat card | Zostawić — dobre Poziom 1 |
| Powiadomienia | Tylko header | Ostatnie 3 na dashboardzie (opcjonalnie P2) |

### F.3 Co NIE przenosić na dashboard

| Funkcja | Powód |
|---------|-------|
| Archive / Restore club | Destrukcyjne — zostają w registry + detail z confirm |
| Audit Center pełne filtry | Zbyt złożone — zostaje osobna strona |
| League Setup wizard | Wielokrokowy — zostaje osobna trasa |
| CRM Pipeline | Wymaga przestrzeni — zostaje moduł |
| Integracje PZPN adapter | Tier 3 — zostaje w Administracja |

---

## G. Mapowanie migracji (bez zmiany URL)

| Akcja v2 | Typ zmiany | Pliki (orientacyjnie, implementacja 20.3B+) |
|----------|------------|---------------------------------------------|
| Grupowany sidebar club | UI only | `navigation.ts`, `dashboard-nav.tsx` |
| Usunięcie Tabela ligowa z sidebar | Config | `navigation.ts` |
| AI hub | Nowy wrapper `/ai` z sub-nav | `ai/layout.tsx` lub tabs component |
| Platform dashboard sekcje | Reorder + inline actions | `platform-dashboard.tsx`, `dashboard.ts` |
| Lifecycle na club detail | UI | `clubs/[clubId]/page.tsx` |
| Rename labels | i18n / constants | `navigation.ts`, `platform-shell.tsx` |
| Search hide | UI | `dashboard-header.tsx` |

---

## H. Fazy wdrożenia (szacunek)

| Faza | Scope | Wysiłek | Ryzyko |
|------|-------|---------|--------|
| **20.3B — Platform UX** | Platform menu groups, dashboard „Wymaga dzisiaj”, lifecycle na detail | 3–4 dni | Niskie |
| **20.3C — Club sidebar v2** | Grupowanie, rename, usunięcie duplikatów, AI hub | 4–5 dni | Średnie (RBAC regression) |
| **20.3D — Dashboard widgets** | Club attention widgets, platform stale owners | 3 dni | Niskie |
| **20.3E — Search / polish** | Global search LUB hide; i18n consistency | 2–5 dni | Zależy od scope search |

**Łącznie:** ~2–3 sprinty (12–17 dni roboczych) przy incremental ship.

---

## I. Metryki sukcesu (post-v2)

| Metryka | Baseline (20.3A) | Target |
|---------|------------------|--------|
| Pozycje sidebar owner (top-level) | 27 | ≤8 grup, ≤15 linków widocznych |
| Kliknięcia: Platform CRITICAL → akcja | 4–5 | ≤2 |
| Kliknięcia: Resend invite | 3 + scroll | 1 z dashboardu |
| Duplikaty nazwy w sidebar | 2× „Mój sprzęt” | 0 |
| EN labels w PL shell | ~8 | ≤2 (nazwy własne) |
| Platform dashboard sekcje | 7 | 4 |

---

*Propozycja Navigation v2 — Sprint 20.3A. Wymaga akceptacji produktowej przed implementacją.*
