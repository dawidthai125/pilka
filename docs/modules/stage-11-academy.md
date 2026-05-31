# ETAP 11 — Akademia, rozwój zawodników, skauting

Moduł `/academy` rozszerza Football Club OS o pełną ścieżkę rozwoju od Skrzatów po Seniorów oraz warstwę skautingu.

## Trasy

| Ścieżka | Opis |
|---------|------|
| `/academy` | Przegląd, statystyki, grupy |
| `/academy/groups` | 7 grup wiekowych |
| `/academy/development` | Lista zawodników → profil rozwoju |
| `/academy/development/[playerId]` | Oceny, cele, testy, wykresy, awanse |
| `/academy/talents` | Ranking talentów klubu |
| `/academy/scouting` | Obserwowani, raporty, baza klubów |
| `/academy/opponents` | Analiza przeciwników |

Profil zawodnika (`/players/[id]`) ma zakładkę **Rozwój** z linkiem do pełnego profilu.

## Tabele

| Tabela | Opis |
|--------|------|
| `academy_groups` | Grupy wiekowe (enum `academy_age_group`) |
| `academy_group_staff` | Kadra przypisana do grup |
| `player_development` | Potencjał, poziom, ocena ogólna (1–100) |
| `player_development_history` | Historia zmian profilu |
| `player_assessments` | Oceny trenerskie 9 kategorii (1–10) |
| `player_goals` | Cele rozwojowe (active/completed/cancelled) |
| `fitness_tests` | Testy motoryczne |
| `player_team_transitions` | Awansy / przejścia między grupami |
| `scouting_players` | Baza obserwowanych zawodników |
| `scouting_clubs` | Kluby obserwowane |
| `scouting_reports` | Raporty skautingowe |
| `opponent_analysis` | Analiza przeciwników |

## Relacje

- Wszystkie tabele: `club_id` → `clubs`
- Rozwój: `player_id` → `players`
- Grupy: opcjonalnie `team_id` → `teams`
- Raporty: `scouting_player_id` → `scouting_players`
- Analiza: opcjonalnie `scouting_club_id` → `scouting_clubs`

## Uprawnienia (aplikacja)

| Rola | Akademia | Skauting |
|------|----------|----------|
| Właściciel | pełny | pełny |
| Prezes | odczyt | odczyt |
| Dyrektor sportowy | pełny | pełny |
| Trener | pełny | pełny |
| Skaut | — | pełny |
| Zawodnik | własny rozwój | — |
| Rodzic | rozwój dziecka | — |

Permisje: `academy:read`, `academy:manage`, `academy:read_own`, `scouting:read`, `scouting:manage`.

## RLS (baza)

- `actor_can_read_academy` / `actor_can_manage_academy`
- `actor_can_read_scouting` / `actor_can_manage_scouting`
- `actor_can_read_development_row` — staff lub własny zawodnik / dziecko rodzica

## AI

Kontekst `academy` w `buildAiClubContext()` — top talenty, regresje, cele, skauting.  
Kategorie raportów: `academy`, `scouting`.

## Migracje

1. `20260605100000_academy_module.sql`
2. `20260605101000_seed_academy.sql`
3. `20260605102000_academy_audit_hardening.sql`

```bash
npm run setup:stage11
# lub
npm run db:migrate:academy-audit
```

## Seed (Piorun Wawrzeńczyce)

- 7 grup akademii + 6 drużyn młodzieżowych
- Profile rozwoju, historie, oceny, cele, testy dla 25 seniorów
- 5 obserwowanych zawodników, 3 raporty, 3 kluby, 2 analizy przeciwników
- Przejścia Junior → Senior (np. Dawid Pawłowski)
