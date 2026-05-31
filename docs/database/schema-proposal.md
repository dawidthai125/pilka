# Propozycja schematu bazy danych

## Fundament (migracja `20260531120000_foundation`)

### Tabele core

#### `profiles`
Rozszerzenie `auth.users` — profil użytkownika globalny (ponad klubami).

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | UUID PK | = `auth.users.id` |
| `email` | TEXT | Email |
| `full_name` | TEXT | Imię i nazwisko |
| `avatar_url` | TEXT | URL avatara |
| `phone` | TEXT | Telefon |
| `locale` | TEXT | Domyślnie `pl` |

#### `clubs`
Tenant — klub piłkarski.

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | UUID PK | |
| `slug` | TEXT UNIQUE | Identyfikator URL |
| `public_name` | TEXT | Nazwa publiczna |
| `official_name` | TEXT | Nazwa licencyjna |
| `association` | TEXT | Związek (np. DZPN) |
| `competition_level` | TEXT | Poziom (np. B Klasa) |
| `country` | TEXT | Domyślnie `PL` |
| `voivodeship` | TEXT | Województwo |
| `status` | TEXT | `active` / `inactive` |
| `settings` | JSONB | Ustawienia klubu |

#### `teams`
Drużyny w ramach klubu.

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | UUID PK | |
| `club_id` | UUID FK | Klub |
| `name` | TEXT | Nazwa drużyny |
| `category` | ENUM | `seniors`, `u18`, `u12`, `u10`, `other` |
| `season` | TEXT | Sezon (np. `2025/2026`) |
| `is_active` | BOOLEAN | Aktywna drużyna |

#### `club_memberships`
Powiązanie użytkownik ↔ klub ↔ rola (RBAC).

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | UUID PK | |
| `club_id` | UUID FK | |
| `user_id` | UUID FK | |
| `role` | ENUM | Rola klubowa |
| `status` | ENUM | `active`, `invited`, `suspended`, `archived` |
| `team_id` | UUID FK | Opcjonalny scope drużyny |

### Enumy

- `club_role` — role RBAC
- `membership_status` — status członkostwa
- `team_category` — kategoria wiekowa drużyny

### Funkcje pomocnicze (RLS)

- `user_club_ids()` — aktywne kluby użytkownika
- `user_has_club_role(club_id, roles[])` — sprawdzenie roli
- `handle_new_user()` — trigger tworzenia profilu po rejestracji

## Moduły przyszłe (planowane tabele)

| Moduł | Tabele | Priorytet |
|-------|--------|-----------|
| Zawodnicy | `players`, `player_profiles` | Wysoki |
| Treningi | `training_sessions`, `attendance` | Wysoki |
| Mecze | `matches`, `match_events`, `lineups` | Wysoki |
| Finanse | `transactions`, `budgets` | Średni |
| Sponsorzy | `sponsors`, `sponsor_packages` | Średni |
| Dokumenty | `documents` (+ Storage) | Średni |
| Komunikacja | `announcements`, `notifications` | Średni |
| AI | `ai_conversations`, `ai_tasks` | Niski |

Każdy moduł = osobna migracja SQL + polityki RLS + typy TS.

## Aplikowanie migracji

```bash
# Po uzyskaniu dostępu CLI do projektu Supabase:
supabase link --project-ref pwkqnwqvrdiaycveacxa
supabase db push
```

Alternatywnie: wklej SQL z `supabase/migrations/` w Supabase SQL Editor.

## Typy TypeScript

Ręcznie utrzymywane w `src/types/database.ts` do czasu wygenerowania:

```bash
supabase gen types typescript --project-id pwkqnwqvrdiaycveacxa > src/types/database.generated.ts
```
