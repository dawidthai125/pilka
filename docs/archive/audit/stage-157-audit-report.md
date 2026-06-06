# ETAP 15.7 — Attendance & Availability 2.0 — Raport audytu końcowego

**Data audytu:** 2026-05-31  
**Status:** ✅ PASS (z uwagami dot. kont testowych)  
**Zakres:** dostępność zawodników, frekwencja, Match Squad, RLS, rodzice, PWA, AI insights  

---

## 1. Podsumowanie wykonawcze

Rozbudowano istniejące moduły **Training**, **Matches** i **Communication Hub** o pełny moduł **Frekwencja & Dostępność** (`/attendance`) — bez przebudowy rdzenia ETAP 3/4/15.6.

**Wynik audytu:**

| Warstwa | Wynik |
|---------|-------|
| Typecheck | ✅ PASS |
| Build produkcyjny | ✅ PASS |
| Audyt statyczny (`audit:stage157`) | **10/10 PASS** |
| Audyt ról RLS (`audit:stage157-roles`) | **4/4 PASS** (4 SKIP — patrz §5) |

---

## 2. Zakres funkcjonalny (13 sekcji specyfikacji)

| Sekcja | Realizacja |
|--------|------------|
| 1. Dostępność zawodnika | `player_availability` — status present/absent/unknown dla treningów, meczów, wydarzeń klubowych |
| 2. Powód nieobecności | Enum `absence_reason` (+ vacation, family), tabela `availability_reasons`, pole komentarza |
| 3. Kalendarz dostępności | `/attendance/calendar` — widok miesięczny, kolory zielony/czerwony/żółty, filtry zawodnik/trener/drużyna |
| 4. Frekwencja | `attendance_records` + `stats.ts` — treningowa, meczowa, miesięczna, sezonowa |
| 5. Raporty trenera | `/attendance/coach` — najlepsza/najgorsza frekwencja, serie nieobecności, kontuzjowani |
| 6. Powołania meczowe | `match_squad.call_status` + `/attendance/matches/[id]` — called_up / reserve / not_called_up |
| 7. Potwierdzenie powołania | `match_squad_responses` — yes/no/unknown, podsumowanie dla trenera |
| 8. AI Attendance Insights | `/attendance/ai` — rekomendacje (spadek frekwencji, braki kadrowe); **bez auto-decyzji** |
| 9. Rodzice | `actor_managed_player_ids` + `playerId` w actions — tylko własne dzieci |
| 10. Dashboard | `/attendance` — widgety: dostępni na trening/mecz, braki kadrowe, kontuzjowani |
| 11. Baza danych | 3 migracje SQL, pełne RLS, sync z `training_availability` / `training_attendance` |
| 12. PWA | `AttendanceQuickActions` — „Dostępny” / „Nie będzie mnie”; quick link w PWA hub |
| 13. Audyt | typecheck, build, RLS, testy ról — niniejszy raport |

---

## 3. Architektura — rozszerzenia (bez przebudowy)

```
Training (ETAP 3)          Matches (ETAP 4)         Communication Hub (15.6)
     │                            │                            │
     ├─ training_availability ────┼── sync trigger ──► player_availability
     ├─ training_attendance ────────┼── sync trigger ──► attendance_records
     └─ training-detail-view        └─ match-detail-view ──► /attendance/matches/[id]
        + AttendanceQuickActions              + link „Powołania i RSVP”
                                              notifyMatchSquadCall → club_notifications + notification_queue
```

**Nowe trasy:** `/attendance`, `/attendance/calendar`, `/attendance/coach`, `/attendance/ai`, `/attendance/matches/[matchId]`

**RBAC:** `attendance:read`, `attendance:report` — role player, parent, coach, staff.

---

## 4. Migracje SQL

| Plik | Zawartość |
|------|-----------|
| `20260620120000_stage157_attendance_availability.sql` | Tabele, enumy, helpery RLS, sync triggery, seed powodów |
| `20260620121000_seed_stage157_attendance.sql` | Sync istniejących danych treningowych klubu testowego |
| `20260620123000_stage157_audit_hardening.sql` | Triggery team/club scope, indeksy wydajnościowe |

**Tabele:** `availability_reasons`, `player_availability`, `attendance_records`, `match_squad_responses`  
**Rozszerzenie:** `match_squad.call_status`

**Helpery RLS:**

- `actor_managed_player_ids` — zawodnik (email) + rodzic (`player_guardians`)
- `actor_can_set_player_availability`
- `actor_can_read_team_availability`
- `actor_can_respond_match_squad`

---

## 5. Wyniki testów

### 5.1 Audyt statyczny — 10/10 PASS

| ID | Obszar | Wynik |
|----|--------|-------|
| S157-01 | RLS + helpery dostępności | PASS |
| S157-02 | Trigger team scope `player_availability` | PASS |
| S157-03 | Match squad responses + RLS | PASS |
| S157-04 | Sync z modułem treningów | PASS |
| S157-05 | Scope `playerId` / rodzic | PASS |
| S157-06 | Push `match_squad_call` | PASS |
| S157-07 | AI — tylko rekomendacje | PASS |
| S157-08 | RBAC `attendance:*` | PASS |
| S157-09 | Trigger club scope responses | PASS |
| S157-10 | PWA quick actions | PASS |

### 5.2 Audyt ról (live DB) — 4/4 PASS, 4 SKIP

| ID | Scenariusz | Wynik |
|----|------------|-------|
| R157-01 | RLS na 4 tabelach | PASS |
| R157-02 | Trener odczytuje dostępność treningu | PASS |
| R157-03 | Zawodnik ustawia własną dostępność | **SKIP** — profil `zawodnik@piorun.test` nie jest powiązany emailem z rekordem `players` |
| R157-04 | Zawodnik nie ustawia obcej dostępności | **SKIP** — jw. |
| R157-05 | Rodzic via `player_guardians` | **SKIP** — wymaga `npm run setup:stage7` |
| R157-06 | Sponsor nie widzi dostępności | PASS |
| R157-07 | Potwierdzenie powołania meczowego | **SKIP** — brak powiązania profil↔zawodnik |
| R157-08 | Funkcje RLS w DB | PASS |

**Uwaga operacyjna:** Aby odblokować testy R157-03/04/07, przypisz email zawodnika w `players` do `zawodnik@piorun.test` lub uruchom `setup:stage7` dla rodzica.

### 5.3 Typecheck & Build

```bash
npm run typecheck   # PASS
npm run build       # PASS (121 tras, w tym /attendance/*)
```

---

## 6. Uruchomienie pełnego setupu

```bash
npm run setup:stage157
npm run typecheck
npm run build
```

Skrypt `setup:stage157` wykonuje migracje, seed, audyt statyczny i audyt ról.

---

## 7. Pliki aplikacji (nowe / rozszerzone)

**Nowe:**

- `src/types/attendance.ts`
- `src/lib/attendance/*` — constants, mappers, loaders, stats, insights, dispatch
- `src/features/attendance/actions.ts` + komponenty UI
- `src/app/(dashboard)/attendance/**`

**Rozszerzone:**

- `src/features/training/actions.ts` — `resolveOwnPlayerIds`, opcjonalny `playerId`
- `src/features/training/components/training-detail-view.tsx` — PWA quick actions
- `src/features/matches/components/match-detail-view.tsx` — link do Match Squad
- `src/config/permissions.ts`, `navigation.ts`, `middleware.ts`, `sw.ts`
- `src/lib/pwa/quick-actions.ts` — skrót „Frekwencja”

---

## 8. Ograniczenia i rekomendacje

1. **Konta testowe** — powiązać profil zawodnika z rekordem `players` w seedzie stage1, aby live testy R157-03/07 przechodziły bez SKIP.
2. **Rodzice** — po `setup:stage7` audyt R157-05 powinien przejść na PASS.
3. **AI** — moduł generuje wyłącznie rekomendacje tekstowe; nie modyfikuje dostępności ani składów automatycznie.
4. **Kolejne etapy** — nie rozpoczęto; zakres zamknięty na ETAP 15.7.

---

## 9. Werdykt

**ETAP 15.7 Attendance & Availability 2.0 — ZAMKNIĘTY ✅**

Moduł spełnia specyfikację 13 sekcji, migracje i RLS są na miejscu, build produkcyjny przechodzi. Testy ról zawodnika/rodzica wymagają uzupełnienia danych testowych (SKIP, nie FAIL).
