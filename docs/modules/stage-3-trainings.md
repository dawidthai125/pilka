# ETAP 3 — Moduł treningów

Dokumentacja techniczna modułu planowania treningów klubu piłkarskiego.

## Zakres

| # | Funkcja | Status |
|---|---------|--------|
| 1 | CRUD treningów (nazwa, drużyna, data, godziny, lokalizacja, opis, trener, status) | ✅ |
| 2 | Kalendarz: miesiąc / tydzień / dzień + filtry drużyna/trener | ✅ |
| 3 | Dostępność zawodników (obecny / nieobecny / nie wiem + powód) | ✅ |
| 4 | Powiadomienia 48h / 24h / 3h (in_app + centrum powiadomień) | ✅ |
| 5 | Lista obecności po treningu | ✅ |
| 6 | Statystyki frekwencji (miesiąc / sezon / cały okres) | ✅ |
| 7 | Panel trenera | ✅ |
| 8 | Notatki po treningu (ogólne i per zawodnik) | ✅ |
| 9 | Ranking zaangażowania TOP 10 | ✅ |
| 10 | RLS + RBAC + seed 6 miesięcy | ✅ |

## Architektura

```
src/features/training/
├── actions.ts
└── components/
    ├── training-calendar.tsx
    ├── training-form.tsx
    ├── training-detail-view.tsx
    ├── training-status-badge.tsx
    ├── coach-dashboard.tsx
    ├── engagement-ranking.tsx
    └── notifications-center.tsx

src/lib/training/
├── constants.ts
├── calendar.ts
├── mappers.ts
└── notifications.ts

src/app/(dashboard)/
├── training/
│   ├── page.tsx
│   ├── new/page.tsx
│   ├── [id]/page.tsx
│   ├── coach/page.tsx
│   └── ranking/page.tsx
└── notifications/page.tsx
```

## Tabele bazy danych

### `trainings`

Główna encja treningu.

| Kolumna | Typ | Opis |
|---------|-----|------|
| `club_id` | UUID FK | Tenant |
| `team_id` | UUID FK | Drużyna |
| `name` | TEXT | Nazwa treningu |
| `training_date` | DATE | Data |
| `start_time`, `end_time` | TIME | Godziny (CHECK: end > start) |
| `location` | TEXT | Miejsce |
| `description` | TEXT | Opis |
| `coach_user_id` | UUID FK | Trener prowadzący |
| `status` | ENUM | planned / completed / cancelled |

### `training_availability`

Potwierdzenia obecności przed treningiem.

| Kolumna | Opis |
|---------|------|
| `status` | present / absent / unknown |
| `absence_reason` | work, school, injury, travel, illness, other (wymagany gdy absent) |
| `responded_by` | Kto zaktualizował wpis |

Unikalność: `(training_id, player_id)`.

### `training_attendance`

Lista obecności po treningu.

| Kolumna | Opis |
|---------|------|
| `status` | present / absent / late / excused |
| `marked_by`, `marked_at` | Audyt oznaczenia |

### `training_session_notes`

Notatki trenerskie po treningu — opcjonalnie przypisane do zawodnika (`player_id` NULL = ogólna).

### `club_notifications`

Powiadomienia in-app z deduplikacją `(user_id, training_id, reminder_type)`.

| Kolumna | Opis |
|---------|------|
| `reminder_type` | hours_48 / hours_24 / hours_3 |
| `scheduled_at` | Kiedy powiadomienie staje się widoczne |
| `delivery_channels` | JSONB — domyślnie `["in_app"]`, gotowe pod email/sms/push |
| `read_at` | Oznaczenie przeczytania |

## Relacje

```
clubs ──< trainings >── teams
clubs ──< training_availability >── players
clubs ──< training_attendance >── players
clubs ──< training_session_notes >── players (opcjonalnie)
trainings ──< club_notifications >── profiles (user_id)
trainings ── coach_user_id ──> profiles
```

Triggery spójności: `team_id` i `player_id` muszą należeć do tego samego `club_id` co trening.

## Uprawnienia RBAC

| Uprawnienie | Role |
|-------------|------|
| `training:read` | owner, president, sports_director, coach, player, parent |
| `training:manage` | owner, president, sports_director, coach |
| `training:attendance` | owner, president, sports_director, coach |
| `training:availability` | wszyscy z `training:read` |

Zawodnik ustawia własną dostępność przez dopasowanie `players.email` = `profiles.email` (funkcja `player_id_for_user`).

## Polityki RLS

| Tabela | SELECT | INSERT/UPDATE/DELETE |
|--------|--------|----------------------|
| `trainings` | członkowie klubu z `actor_can_read_trainings` | `actor_can_manage_trainings` |
| `training_availability` | jak wyżej | staff LUB własny wpis zawodnika |
| `training_attendance` | jak wyżej | `actor_can_mark_training_attendance` |
| `training_session_notes` | jak wyżej | `actor_can_manage_trainings` |
| `club_notifications` | tylko własne (`user_id = auth.uid()`) | staff tworzy; user aktualizuje `read_at` |

## Powiadomienia

- Przypomnienia generowane przy tworzeniu/edycji treningu (staff) oraz synchronizowane przy wejściu na dashboard (`syncTrainingReminders`).
- Widoczne gdy `scheduled_at <= now()` — dzwonek w nagłówku + `/notifications`.
- Architektura kanałów: pole `delivery_channels` przygotowane pod rozszerzenie o email, SMS i push.

## Statystyki frekwencji

Wskaźnik zaangażowania = `frekwencja × 0.7 + punktualność × 0.3`, gdzie:

- frekwencja = (obecny + spóźniony) / wszystkie wpisy
- punktualność = obecny / (obecny + spóźniony)

Zakres dat: miesiąc bieżący, sezon (od 1 lipca), cała historia.

## Seed testowy

Klub **Piorun Wawrzeńczyce** (`a1b2c3d4-...`):

- Treningi wt/czw mar–sie 2026 (Boisko Wawrzeńczyce, 18:00–19:30)
- Zakończone treningi z frekwencją 25 zawodników Seniorów
- Planowane z dostępnością i przykładowymi powiadomieniami

Uruchomienie: `npm run setup:stage3`

## Trasy

| URL | Opis |
|-----|------|
| `/training` | Kalendarz |
| `/training/new` | Nowy trening |
| `/training/[id]` | Szczegóły, dostępność, obecność, notatki |
| `/training/coach` | Panel trenera |
| `/training/ranking` | Ranking zaangażowania |
| `/notifications` | Centrum powiadomień |
