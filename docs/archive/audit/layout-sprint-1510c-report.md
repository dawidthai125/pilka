# LAYOUT SPRINT 15.10C REPORT

**Sprint:** Layout 15.10C — Dashboard Redesign  
**Klub:** Piorun Wawrzeńczyce  
**Data:** 2026-06-02  
**Commit bazowy:** `2bab268` (Club Identity 15.10B)  
**Produkcja:** https://pilka-mu.vercel.app

---

## 1. Dashboard Hero

Nowy komponent `DashboardHero` zastępuje generyczny nagłówek „Dashboard” + baner roli (`MobileRoleHeader`).

| Element | Opis |
|---------|------|
| **Tło** | Gradient w kolorach klubu (`--club-primary`, złote akcenty) |
| **Logo** | `ClubLogo` XL z pierścieniem na ciemnym tle |
| **Treść** | „Panel klubu”, nazwa klubu, podtytuł urzędowy, badge drużyny |
| **Powitanie** | „Witaj, {imię użytkownika}” |
| **Kafel meczu** | Najbliższy mecz (przeciwnik, data, link) |
| **Kafel kadry** | Dostępność na trening (X/Y + procent) |

Hero agreguje dane z `getDashboardPresentation` — ten sam model `CoachDayData` co wcześniej, nowa prezentacja.

---

## 2. Coach Day Redesign

Sekcja **„Dziś w klubie”** (`CoachDayPanel`) — pełny redesign kafelkowy.

| Kafel | Emoji | Zawartość |
|-------|-------|-----------|
| Trening | 🏃 | Dzisiejszy / najbliższy trening + CTA |
| Mecz | ⚽ | Najbliższy mecz + CTA |
| Kontuzjowani | 🚑 | Liczba + imiona (alert gdy > 0) |
| RSVP | ❗ | Niepotwierdzeni (alert gdy > 0) |
| Dostępni | 👥 | X/Y zawodników + luki kadrowe |
| Komunikat | 📢 | Ostatnie ogłoszenie (nowe — prop `lastAnnouncement`) |

**Widoczność:** coach, owner, president (`canShowCoachDay`).  
**Layout:** 1 kolumna mobile → 2 (sm) → 3 (xl).  
**Warianty wizualne:** `default` / `alert` (amber) / `success` (emerald).

---

## 3. Club Visuals

Sekcja `DashboardClubVisuals` — galeria 3 slotów 16:10.

| Slot | Etykieta | Domyślnie |
|------|----------|-----------|
| Drużyna | „Miejsce na zdjęcie zespołu” | CSS gradient + ikona |
| Stadion | „Miejsce na zdjęcie obiektu” | CSS gradient + ikona |
| Mecz | „Miejsce na zdjęcie z meczu” | Hero z CMS (`website_settings.heroImagePath`) jeśli ustawiony |

Placeholdery używają tokenów klubu — gotowe pod przyszłe uploady zdjęć bez zmian layoutu.

---

## 4. Statistics Redesign

`DashboardStatsGrid` — sekcja **„Operacje klubu”**.

| Kafel | Warunek | Akcent |
|-------|---------|--------|
| Zawodnicy | `player:read` | Zielony (club primary) |
| Frekwencja | `attendance:read` | Złoty (club secondary) |
| Mecze | zawsze | Domyślny |
| Treningi | zawsze | Domyślny |

Duża typografia (3xl), ikony Lucide, linki do modułów.  
Dane z `getDashboardPresentation` (counts od dziś).

**Usunięte z dashboardu:** karty admin („Role w klubie”, „Uprawnienia aktywne”).

---

## 5. Quick Actions

`DashboardQuickActions` — **„Szybkie akcje”**, 4 zielone CTA (2×2 mobile, 4×1 desktop).

| Akcja | Rola | Link |
|-------|------|------|
| Dodaj trening | trener+ | `/training/new` |
| Wyślij komunikat | staff comm | `/communication/coach` |
| Dodaj mecz | staff matches | `/matches/new` |
| Sprawdź obecności | attendance | `/attendance` |

Filtrowane przez `PRIORITY_ACTIONS.can(roles)` — puste dla ról bez uprawnień.

---

## 6. Mobile Experience

| Aspekt | Zmiana |
|--------|--------|
| **Kolejność sekcji** | Offline → Hero → Visuals → Quick Actions → Coach Day → Stats → Dokumenty |
| **Hero** | Pełna szerokość, kafle mecz/kadra pod logo (stack na mobile) |
| **Visuals** | 1 kolumna → 3 kolumny od `sm` |
| **Quick Actions** | Grid 2×2, min-height 88px (touch target) |
| **Coach Day** | 1 kolumna, emoji + CTA min-h-11 |
| **Stats** | Grid 2×2 na mobile |
| **Sidebar / bottom nav** | Bez zmian w 15.10C (z 15.10B: logo, kolory, polonizacja) |

Usunięto `MobileRoleHeader` — identyfikacja klubu przeniesiona do Hero.

---

## 7. Przed / Po

### PRZED (15.10B)

```
┌─────────────────────────────────────┐
│ [logo] Dashboard                    │
│ MobileRoleHeader (rola FCOS)        │
├─────────────────────────────────────┤
│ 4× generyczne karty stat (shadcn)   │
│ Coach Day — lista / prostszy layout │
│ Admin: Role + Uprawnienia           │
│ Document alerts                     │
└─────────────────────────────────────┘
Bundle: 4.7 kB / 130 kB First Load JS
```

### PO (15.10C)

```
┌─────────────────────────────────────┐
│ HERO: gradient klubowy + logo       │
│   mecz | dostępność kadry           │
├─────────────────────────────────────┤
│ [Drużyna][Stadion][Mecz] visuals    │
├─────────────────────────────────────┤
│ Szybkie akcje (zielone CTA)         │
├─────────────────────────────────────┤
│ Dziś w klubie — 6 emoji kafli       │
├─────────────────────────────────────┤
│ Operacje klubu — 4 stat cards       │
├─────────────────────────────────────┤
│ Document alerts (bez zmian)           │
└─────────────────────────────────────┘
Bundle: 3.15 kB / 115 kB First Load JS
```

| Metryka | Przed | Po |
|---------|-------|-----|
| Route size | 4.7 kB | **3.15 kB** |
| First Load JS | 130 kB | **115 kB** |
| Admin cards | ✅ | ❌ usunięte |
| Club branding on dashboard | Częściowe (15.10B header) | **Pełne (hero + visuals)** |

---

## 8. Wpływ na użytkownika

| Rola | Co zyskuje |
|------|------------|
| **Trener / właściciel** | Hero z meczem i kadrą, Coach Day 6 kafli, szybkie akcje (trening, mecz, obecności, komunikat) |
| **Prezes** | Jak trener — Coach Day + stats operacyjne |
| **Zawodnik / rodzic** | Hero powitalny, stats (mecze/treningi), brak Coach Day — prostszy, czytelniejszy panel |
| **Sponsor** | Hero klubowy, stats, brak staff-only sekcji |

**Ogólny efekt:** Dashboard przestaje wyglądać jak generyczny panel SaaS — staje się **centrum operacyjnym klubu** z kolorystyką Pioruna, priorytetami dnia i skrótami do codziennych zadań trenera.

---

## Pliki sprintu

| Plik | Typ |
|------|-----|
| `src/app/(dashboard)/dashboard/page.tsx` | Modyfikacja |
| `src/features/dashboard/components/coach-day-panel.tsx` | Modyfikacja |
| `src/features/dashboard/components/dashboard-hero.tsx` | Nowy |
| `src/features/dashboard/components/dashboard-club-visuals.tsx` | Nowy |
| `src/features/dashboard/components/dashboard-stats-grid.tsx` | Nowy |
| `src/features/dashboard/components/dashboard-quick-actions.tsx` | Nowy |
| `src/lib/dashboard/presentation.ts` | Nowy |
| `docs/audit/layout-1510c-build-report.md` | Audyt build |
| `docs/audit/visual-diff-1510b.md` | Audyt wizualny 15.10B (dokumentacja) |

---

## Werdykt techniczny

| Test | Wynik |
|------|-------|
| typecheck | ✅ PASS |
| build | ✅ PASS (149 tras) |
| OOM (pierwszy run) | Przejściowy problem lokalny — patrz `layout-1510c-build-report.md` |

**Sprint 15.10C — GOTOWY DO WDROŻENIA.**
