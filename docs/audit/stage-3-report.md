# Raport ETAP 3 — Moduł treningów

**Data:** 2026-05-31  
**Klub testowy:** Piorun Wawrzeńczyce  
**Status:** Ukończony

## Podsumowanie wykonanych prac

Zaimplementowano kompletny moduł treningowy zgodnie z wymaganiami ETAPU 3, bez przebudowy istniejących modułów (auth, RBAC, zawodnicy). Rozwinięto projekt w istniejącej strukturze `features/`, `lib/`, `app/(dashboard)/`.

## Migracje bazy danych

| Plik | Zawartość |
|------|-----------|
| `20260531170000_trainings_module.sql` | 5 tabel, 5 enumów, funkcje RLS, triggery spójności, polityki |
| `20260531171000_seed_trainings.sql` | Harmonogram 6 miesięcy, frekwencja 25 zawodników, notatki, powiadomienia |

**Poprawka w trakcie wdrożenia:** alias kolumny `offset` w seedzie zmieniono na `reminder_offset` (słowo zastrzeżone w PostgreSQL).

## Nowe moduły aplikacji

### Warstwa danych
- `src/types/trainings.ts` — typy domenowe
- `src/types/database.ts` — typy Supabase dla nowych tabel
- `src/lib/training/*` — stałe, kalendarz, mapery, logika powiadomień

### Server Actions
- `src/features/training/actions.ts` — CRUD treningów, dostępność, obecność, notatki, powiadomienia

### Loadery sesji
- `getTrainings`, `getTrainingDetail`, `getAttendanceStats`, `getCoachDashboard`
- `syncTrainingReminders`, `getNotifications`, `getUnreadNotificationCount`, `getCoaches`

### UI (responsywne: desktop / tablet / mobile)
- Kalendarz z widokami miesiąc/tydzień/dzień i filtrami
- Formularz treningu, widok szczegółowy z panelami
- Panel trenera z KPI i rankingiem skróconym
- Pełny ranking zaangażowania z zakresem czasu
- Centrum powiadomień + dzwonek w nagłówku dashboardu

## Uprawnienia

Dodano: `training:read`, `training:manage`, `training:attendance`, `training:availability` w `src/types/rbac.ts` i `src/config/permissions.ts`.

## Bezpieczeństwo

- Row Level Security na wszystkich nowych tabelach
- Dostępność zawodnika ograniczona do własnego `player_id` (dopasowanie email)
- Powiadomienia — użytkownik widzi i oznacza tylko własne wpisy
- Triggery DB wymuszają spójność `club_id` ↔ `team_id` / `player_id`

## Dane testowe

- **Treningi:** wtorek i czwartek, mar–sie 2026, drużyna Seniorzy
- **Frekwencja:** losowo deterministyczna dla 25 zawodników na zakończonych treningach
- **Dostępność:** wpisy dla planowanych treningów
- **Powiadomienia:** przykładowe przypomnienia in_app dla członków klubu

## Weryfikacja

| Test | Wynik |
|------|-------|
| `npm run typecheck` | ✅ |
| `npm run build` | ✅ |
| `npm run setup:stage3` | ✅ (po poprawce seeda) |

## Konta testowe

| Email | Rola | Zastosowanie |
|-------|------|--------------|
| trener@piorun.test | coach | Panel trenera, obecności, notatki |
| zawodnik@piorun.test | player | Potwierdzanie dostępności |
| wlasciciel@piorun.test | owner | Pełny dostęp |

Hasło: `Piorun2026!`

## Następne kroki (poza ETAP 3)

- Integracja kanałów email / SMS / push przez `delivery_channels`
- Job cron do `syncTrainingReminders` (obecnie: wejście na dashboard przez staff)
- Powiązanie powiadomień z konkretną drużyną zawodnika (obecnie: członkowie klubu)

**ETAP 3 zamknięty — kolejne etapy nie rozpoczęte.**
