# Raport audytu — ETAP 3 (moduł treningów)

**Data:** 2026-05-31  
**Zakres:** planowanie treningów, kalendarz, frekwencja, powiadomienia, panel trenera, RLS  
**Status po audycie:** poprawki wdrożone

---

## Podsumowanie

| Obszar | Ocena przed | Ocena po | Naprawione |
|--------|-------------|----------|------------|
| Bezpieczeństwo danych | ⚠️ Średnie | ✅ Dobre | 9 |
| Polityki RLS | ⚠️ Średnie | ✅ Dobre | 2 |
| Poprawność frekwencji | ⚠️ Średnie | ✅ Dobre | 2 |
| Wydajność zapytań | ⚠️ Średnie | ✅ Dobre | 4 |
| TypeScript | ✅ Dobre | ✅ Dobre | 2 |
| Kalendarz (logika dat) | ❌ Błędne | ✅ Dobre | 3 |
| Mobile / responsywność | ⚠️ Średnie | ✅ Dobre | 3 |
| Panel trenera | ⚠️ Średnie | ✅ Dobre | 1 |

**Weryfikacja:** `npm run typecheck` — ✅ | `npm run build` — ✅ | migracja audytu — ✅

---

## 1. Bezpieczeństwo

### Naprawione

| # | Problem | Severity | Rozwiązanie |
|---|---------|----------|-------------|
| 1 | Brak walidacji `teamId` przy tworzeniu/edycji treningu | Wysokie | `verifyTeamInClub()` w `actions.ts` |
| 2 | Brak walidacji `coachUserId` — możliwość przypisania dowolnego użytkownika | Wysokie | `verifyCoachInClub()` — aktywny członek sztabu |
| 3 | Obecność (`setTrainingAttendance`) bez weryfikacji przynależności zawodnika do drużyny treningu | Wysokie | `verifyPlayerOnTrainingTeam()` |
| 4 | Notatki sesji z `playerId` spoza drużyny treningu | Wysokie | Walidacja w akcji + trigger DB |
| 5 | Dostępność na treningu zakończonym / anulowanym | Średnie | Sprawdzenie `status === 'planned'` |
| 6 | Brak weryfikacji istnienia treningu w klubie przy mutacjach | Średnie | `verifyTrainingInClub()` |
| 7 | Brak walidacji kolejności godzin po stronie aplikacji | Średnie | `isEndTimeAfterStart()` |
| 8 | `markNotificationRead` bez filtra `club_id` | Niskie | `.eq("club_id", DEFAULT_CLUB_ID)` |
| 9 | Obecność/dostępność — brak wymuszenia drużyny w DB | Wysokie | Trigger `enforce_training_player_on_team` |

### Pozostaje (świadome, bez zmian scope)

| Problem | Rekomendacja |
|---------|--------------|
| `syncTrainingReminders` uruchamiane przy każdym wejściu na dashboard (staff) | W przyszłości: cron / edge function |
| Stały offset UTC+2 dla przypomnień (CEST) | Pełna strefa `Europe/Warsaw` w osobnym etapie |
| Rola `player` widzi dostępność całej drużyny | Scope per drużyna w przyszłości |

---

## 2. Polityki RLS

### Stan po audycie

| Tabela | SELECT | INSERT/UPDATE/DELETE |
|--------|--------|----------------------|
| `trainings` | `actor_can_read_trainings` + `user_club_ids` | `actor_can_manage_trainings` |
| `training_availability` | j.w. | staff LUB własny wpis zawodnika |
| `training_attendance` | j.w. | `actor_can_mark_training_attendance` |
| `training_session_notes` | j.w. | `actor_can_manage_trainings` |
| `club_notifications` | własne wpisy użytkownika | staff INSERT; user UPDATE `read_at` |

### Naprawione

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | `club_notifications_update_own` — brak `club_id` w `WITH CHECK` | Dodano `club_id IN (user_club_ids())` |
| 2 | Brak triggerów spójności player ↔ team treningu | `20260531172000_trainings_audit_hardening.sql` |

Dodatkowe triggery DB:
- `enforce_training_player_on_team` — availability + attendance
- `enforce_training_note_player_on_team` — notatki per zawodnik
- `enforce_training_availability_reason` — czyszczenie `absence_reason` gdy status ≠ absent

---

## 3. Poprawność frekwencji

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | Usprawiedliwieni (`excused`) obniżali % frekwencji mimo że nie są nieobecnością | Frekwencja = `(present + late + excused) / total` |
| 2 | Punktualność bez zmian | `present / (present + late)` — poprawne |

Wskaźnik zaangażowania: `frekwencja × 0.7 + punktualność × 0.3` — bez zmian formuły.

---

## 4. Wydajność zapytań

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | `getTrainingDetail` ładował wszystkich zawodników klubu | Zapytanie `players` filtrowane po `team_id` treningu |
| 2 | `getAttendanceStats` ładował pełną listę zawodników | Pobieranie tylko `player_id` obecnych w frekwencji |
| 3 | Brak indeksów pod zapytania frekwencji | Indeksy `(club_id, training_id)` na attendance/availability |
| 4 | Brak indeksu pod filtr status+data | Indeks `(club_id, status, training_date)` |

Notatki sesji: usunięto joiny PostgREST; autorzy ładowani osobnym zapytaniem (wzorzec z ETAP 2).

---

## 5. Kalendarz — logika dat

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | `formatIsoDate()` używał `toISOString()` — przesunięcie dni w strefie CET/CEST | Formatowanie z lokalnych składowych daty |
| 2 | Parsowanie `anchorIso` przez `new Date(string)` — UTC midnight | `parseLocalDate()` w `calendar.ts` |
| 3 | Zakres miesiąca w statystykach frekwencji — ten sam błąd UTC | `formatIsoDate()` w `getScopeDateFrom()` |

---

## 6. Mobile / responsywność

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | Siatka miesiąca na wąskich ekranach — nieczytelna | `overflow-x-auto` + `min-w-[640px]` |
| 2 | Nagłówek kalendarza — przyciski i tytuł nachodziły | Układ `flex-col` na mobile |
| 3 | Formularz obecności — kolumny za wąskie | Breakpoint `sm:grid` zamiast `md:grid` |

Widoki tydzień/dzień: kolumny stackują się pionowo na telefonie (bez zmian — poprawne).

---

## 7. Panel trenera

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | „Niepotwierdzeni” liczyli tylko status `unknown`, pomijając zawodników bez wpisu | `roster − present − absent` (w tym `unknown` i brak odpowiedzi) |

---

## 8. Powiadomienia — strefa czasowa

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | `trainingStartsAt()` interpretował godzinę jako UTC serwera | Stały offset klubu (+2h CEST) w `CLUB_WALL_CLOCK_OFFSET_HOURS` |

---

## 9. TypeScript

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | `parseLocalDate` / `trainingStartsAt` — `number \| undefined` z `.map(Number)` | Jawne parsowanie z walidacją typów |

---

## Pliki zmienione w audycie

```
supabase/migrations/20260531172000_trainings_audit_hardening.sql
src/features/training/actions.ts
src/features/training/components/training-calendar.tsx
src/features/training/components/training-detail-view.tsx
src/features/training/components/coach-dashboard.tsx
src/lib/training/calendar.ts
src/lib/training/mappers.ts
src/lib/training/notifications.ts
src/lib/auth/session.ts
scripts/setup-stage3.mjs
package.json
```

---

## Uruchomienie poprawek na istniejącej bazie

```bash
npm run db:migrate:trainings-audit
```

Lub pełny setup ETAP 3 (nowe środowisko):

```bash
npm run setup:stage3
```

---

## Werdykt

Moduł treningów ETAP 3 spełnia wymagania bezpieczeństwa i funkcjonalności po audycie. Krytyczne luki (walidacja drużyny/zawodnika, triggery DB, błędy strefy czasowej kalendarza) zostały zamknięte. Kolejne etapy nie rozpoczęte.
