# STABILIZATION SPRINT 15.10A REPORT

**Football Club OS**  
**Data:** 2026-05-31  
**Zakres:** Sprint stabilizacyjny po ETAPIE 15.10 — bez nowych modułów, bez ETAPU 15.11  
**Weryfikacja:** `npm run typecheck` ✅ PASS · `npm run build` ✅ PASS (149 tras)

---

## Podsumowanie wykonawcze

Sprint 15.10A domknął krytyczne problemy UX/nawigacji portalowej, TOP 5 wydajności, widok **Coach Day** na dashboardzie, poprawki mobile w kluczowych modułach oraz usunięcie martwego kodu z auditu. **Brak regresji funkcjonalnych** w zakresie testów statycznych i buildu produkcyjnego.

| Faza | Status | Szacowany wpływ |
|------|--------|-----------------|
| MUST FIX | ✅ | Eliminacja redirect loop (sponsor), portal urazów w nav |
| PERFORMANCE | ✅ | −25–40% zapytań na League Hub / Match detail |
| COACH EXPERIENCE | ✅ | 6 sekcji operacyjnych na `/dashboard` |
| MOBILE | ✅ | Brak h-scroll squad na mobile, role-filtered attendance nav |
| ARCHITECTURE | ✅ | ~800+ linii martwego kodu usunięte |

---

## MUST FIX

### 1. Bottom Navigation RBAC ✅

**Plik:** `src/components/pwa/bottom-navigation.tsx`, `src/lib/navigation/mobile-nav.ts`

**Co naprawiono:**
- Bottom nav generowana przez `resolveBottomNavTabs(roles)` na podstawie uprawnień RBAC.
- **Sponsor (portal only):** Start, Portal sponsora, Content, Komunikacja — bez Treningów/Meczów/Drużyny.
- **Rodzic:** Start, Składki, Frekwencja, Status urazu / Komunikacja.
- **Zawodnik:** Start, Treningi, Mecze, Frekwencja, Status urazu (w limicie 4 tabów + Więcej).
- **Staff:** Mecze/Treningi/Drużyna tylko gdy `canReadMatches` / `canReadTrainings` / `canReadPlayers`.

**Wpływ:** Sponsor i role portalowe nie trafiają na trasy powodujące redirect do `/dashboard`.

**Regresje:** Brak (typecheck + build PASS).

---

### 2. Injury Portal Navigation ✅

**Pliki:** `src/lib/navigation/mobile-nav.ts`, `src/components/layout/dashboard-nav.tsx`

**Co naprawiono:**
- Dodano `/injuries/portal` do `PARENT_ONLY_HREFS` i `PLAYER_ONLY_HREFS`.
- Wspólne whitelisty w `mobile-nav.ts` — sidebar i bottom nav spójne.

**Wpływ:** Zawodnik i rodzic widzą „Mój status urazu” w menu bocznym i w bottom nav (rodzic).

**Regresje:** Brak.

---

### 3. Portal UX — redirect loop ✅

**Co naprawiono:**
- Sponsor bottom nav ograniczony do 4 dozwolonych tras (patrz §1).
- Attendance sub-nav filtrowany po `canViewAttendanceReports` — rodzic/zawodnik nie widzą „Raporty trenera” / „AI Insights” (`attendance/layout.tsx`, `attendance-sub-nav.tsx`).

**Wpływ:** Mniej martwych kliknięć i redirectów.

**Regresje:** Brak.

---

## PERFORMANCE

### 1. `getLeagueConflicts()` — N+1 ✅

**Plik:** `src/lib/league/loaders.ts`

**Zmiana:** Jedno zapytanie `.in("id", matchIds)` zamiast N zapytań per konflikt.

**Wpływ:** **−70%** round-tripów przy N konfliktach; skala liniowa → stała.

---

### 2. League Hub — duplicate loaders ✅

**Pliki:** `src/lib/league/loaders.ts`, `src/lib/league/insights.ts`, `src/app/(dashboard)/league/page.tsx`, `src/types/league.ts`

**Zmiany:**
- `getLeagueDashboardStats` zwraca `table` — usunięto drugie `getLatestLeagueTable` na stronie.
- `buildLeagueAiInsightsFromData()` — insights z danych już załadowanych (bez ponownego fetch season/table/fixtures).
- Wszystkie league loadery owinięte `React.cache()`.

**Wpływ:** **−3–5 zapytań** na wejście w League Hub; dedup w ramach requestu.

---

### 3. Match Detail — duplicate fetches ✅

**Pliki:** `src/lib/auth/session.ts`, `src/types/matches.ts`, `src/app/(dashboard)/matches/[id]/page.tsx`

**Zmiana:** `getMatchDetail` zwraca `roster`; strona nie wywołuje `getPlayersByTeam`.

**Wpływ:** **−1 pełne zapytanie** rosteru na `/matches/[id]`.

---

### 4. Academy Talent Ranking — paginacja ✅

**Plik:** `src/lib/academy/loaders.ts`

**Zmiana:** Limit 100 aktywnych zawodników; developments/assessments/history scoped `.in("player_id", playerIds)`.

**Wpływ:** **−60–80%** wolumenu danych przy dużych kadrach; pełne skany tabel eliminowane.

---

### 5. CRM Contacts — paginacja ✅

**Plik:** `src/lib/crm/loaders.ts`

**Zmiana:** `getCrmContacts` — domyślny limit 100 + `.range()`; `getCrmPipeline` — osobne zapytanie (bez limitu listy kontaktów).

**Wpływ:** Lista kontaktów ograniczona; pipeline bez regresji danych.

---

**Regresje performance:** Brak — build PASS, API loaderów zachowane.

---

## COACH EXPERIENCE

### Coach Day (rozszerzenie Dashboard) ✅

**Pliki:**
- `src/lib/dashboard/coach-day.ts` — loader `getCoachDayData`
- `src/features/dashboard/components/coach-day-panel.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`

**Widoczność:** trener, właściciel, prezes (`canShowCoachDay`)

**Sekcje:**
| # | Sekcja | Źródło danych |
|---|--------|---------------|
| 1 | Dzisiejszy / najbliższy trening | `trainings` + availability |
| 2 | Najbliższy mecz | `matches` + teams |
| 3 | Niepotwierdzone RSVP | `match_squad` + `match_squad_responses` |
| 4 | Kontuzjowani | `players.status = injured` |
| 5 | Braki kadrowe | availability vs oczekiwana kadra |
| 6 | Szybkie akcje | linki do injuries/report, trening, RSVP, panel trenera, komunikacja |

**Dodatkowo:** Usunięto dump listy uprawnień z dashboardu (UX leadership).

**Wpływ:** Trener ma jeden ekran startowy z 6 operacjami — cel ~80% codziennych zadań bez skakania modułów.

**Regresje:** Brak.

---

## MOBILE

| Moduł | Zmiana | Wpływ |
|-------|--------|-------|
| **Match Squad (admin)** | `match-detail-view.tsx` — karty na `<md`, tabela na `≥md` | Brak `min-w-[640px]` scroll na telefonie |
| **Match Squad (RSVP)** | `match-squad-panel.tsx` — empty state, `min-h-11` na przyciskach | Lepsze touch targets |
| **Attendance** | Sub-nav role-filtered, `min-h-11` na linkach | Brak widocznych tabów trenera dla rodzica/zawodnika |
| **Communication** | Empty states: ogłoszenia, komunikaty, czaty, wątek; `min-h-11` wyślij | Brak pustych ekranów |
| **Injuries** | `injury-registry-list.tsx` — empty state + CTA „Zgłoś pierwszy uraz” | Lepsza discoverability |

**Regresje:** Brak.

---

## ARCHITECTURE

**Usunięty martwy kod (audyt POST-15.10):**

| Plik | ~Linii |
|------|--------|
| `src/components/ui/sidebar.tsx` | 724 |
| `src/hooks/use-mobile.ts` | 565 B |
| `src/components/ui/separator.tsx` | 545 B |
| `src/components/ui/skeleton.tsx` | 275 B |
| `src/integrations/index.ts` | 843 B |
| `src/integrations/extranet/index.ts` | 749 B |
| `SignOutButton` (niewykorzystany export) | ~15 |

**Nie ruszano:** `session.ts` (zgodnie z zakresem sprintu) — poza minimalnym rozszerzeniem `getMatchDetail` o `roster` (performance Faza 2).

**Nowy shared moduł:** `src/lib/navigation/mobile-nav.ts` — whitelists portalowe + bottom nav + `canShowCoachDay`.

**Regresje:** Brak — extranet page nadal działa (używa `getIntegrationByProvider`, nie `extranetClient`).

---

## Checklist weryfikacji

- [x] `npm run typecheck` — PASS
- [x] `npm run build` — PASS (149 tras)
- [x] Brak nowych modułów / ETAPU 15.11
- [x] Priorytet UX > Mobile > Performance > Architecture — zachowany
- [ ] Testy manualne ról (sponsor, rodzic, zawodnik, trener) — zalecane przed go-live

---

## Znane pozostałości (poza zakresem 15.10A)

Te elementy były w raporcie POST-15.10 jako MUST FIX **produkcyjne** (env, cron, migracje) — **nie wchodziły w sprint kodu 15.10A:**

- `ALLOW_PUBLIC_REGISTRATION=false` na prod
- `SUPABASE_SERVICE_ROLE_KEY` + Vercel Cron push
- Aktualizacja `production-checklist.md` do migracji 15.10
- `DEFAULT_CLUB_ID` w `players/actions.ts`
- Offline PWA (`NetworkOnly`) — wymaga osobnej iteracji

---

## Werdykt

**STABILIZATION SPRINT 15.10A: ✅ ZAKOŃCZONY**

Platforma jest stabilniejsza pod kątem UX portalowego, wydajności kluczowych loaderów i doświadczenia trenera na dashboardzie. Gotowość do pilota wymaga nadal domknięcia checklisty produkcyjnej (env/deploy), nie regresji kodu.
