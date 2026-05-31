# Raport zmian — ETAP 11.5 (poprawki po audycie)

**Data:** 2026-05-31  
**Commit:** (po wdrożeniu)  
**Zakres:** naprawa krytycznych luk bezpieczeństwa, wydajności i dokumentacji — **bez nowych funkcji biznesowych**

---

## Podsumowanie

| Kategoria | Naprawione | Migracja / pliki |
|-----------|------------|------------------|
| Bezpieczeństwo P0 | Row-level RLS zawodników (rodzic/zawodnik) | SQL + `src/lib/players/access.ts` |
| Bezpieczeństwo P1 | Scope trenera na drużyny | SQL helpers + polityki |
| Bezpieczeństwo P2 | Middleware `/academy`, align permissions scout/treasurer | `middleware.ts`, `permissions.ts` |
| Wydajność P0 | Usunięcie sync-on-read z layout | `session.ts`, `notifications/page.tsx` |
| Wydajność P1 | Cache AI, limity zapytań, parallel loaders | `lib/ai/context.ts`, loaders |
| Indeksy DB | 9 indeksów integracji / powiadomień / players | migracja SQL |
| Dokumentacja | RBAC, README, ten raport | `docs/` |

**Weryfikacja:** `npm run typecheck` · `npm run build`

**Wdrożenie migracji:**
```bash
npm run db:migrate:stage115
# lub pełny setup:
npm run setup:stage11
```

---

## 1. Bezpieczeństwo — baza danych

**Migracja:** `supabase/migrations/20260605110000_stage115_security_performance.sql`

### Nowe funkcje RLS

- `coach_team_ids`, `actor_is_coach_team_scoped`
- `actor_can_read_player_row` / `actor_can_manage_player_row`
- `actor_can_read_team_resource` / `actor_can_manage_team_resource`
- `storage_player_id_from_path`

### Zaktualizowane polityki

| Obszar | Zmiana |
|--------|--------|
| `players` + dokumenty/stats/historia/kontuzje | SELECT przez `actor_can_read_player_row` |
| `trainings`, `matches` | SELECT + manage scoped na `team_id` |
| `match_*`, `training_attendance`, `training_notes` | JOIN do meczu/treningu + team scope |
| Storage `club-assets` (zawodnicy) | Row-level per `player_id` w ścieżce |

### Macierz dostępu (po poprawkach)

| Rola | Zawodnicy | Treningi/mecze |
|------|-----------|----------------|
| Zawodnik | tylko siebie | tylko własna drużyna |
| Rodzic | tylko dzieci | drużyna dziecka |
| Trener (z team_id) | tylko swoja drużyna | tylko swoja drużyna |
| Trener (bez team_id) | cały klub | cały klub |
| Prezes / dyrektor / właściciel | cały klub | cały klub |
| Skaut | brak (moduł skautingu) | brak |
| Sponsor | brak | brak |

---

## 2. Bezpieczeństwo — aplikacja

| Plik | Zmiana |
|------|--------|
| `src/lib/players/access.ts` | **Nowy** — `resolveOwnPlayerIds`, `canAccessPlayerRow` |
| `src/app/(dashboard)/players/[id]/page.tsx` | Guard `notFound()` dla obcych profili |
| `src/lib/academy/loaders.ts` | Re-export access helpers z modułu players |
| `src/config/permissions.ts` | Usunięto `player:read` ze skauta i skarbnika |
| `src/middleware.ts` | Dodano `/academy` do chronionych ścieżek |

Lista `/players` filtrowana automatycznie przez RLS (bez pełnego składu dla rodzica/zawodnika).

---

## 3. Wydajność

| Problem | Rozwiązanie |
|---------|-------------|
| `syncTrainingReminders` przy każdym layout | Przeniesiono na `/notifications` (manager treningów) |
| `syncSponsorContractReminders` przy `/sponsors` | Przeniesiono na `/notifications` (manager sponsorów) |
| `syncAiSuggestions` przy `/ai/suggestions` | Usunięto — sugestie odświeżane akcją użytkownika |
| Pełny `buildAiClubContext` co wiadomość | `unstable_cache` TTL 300s |
| Historia academy w AI bez limitu | `.limit(100)` w `buildAcademyAiContext` |
| `getTalentRanking` sekwencyjnie | `Promise.all` (4 zapytania) |
| `getAcademyGroups` sekwencyjnie | `Promise.all` |
| `getMatchDetail` + sezon frekwencji | `getAttendanceStats` max 30 treningów |
| `getAiReports` bez limitu | `.limit(100)` |
| Mecz: `getPlayers()` cały klub | `getPlayersByTeam(teamId)` |

---

## 4. Indeksy (wydajność zapytań)

Dodane w migracji 11.5:

- `integration_club_mappings (club_id)`
- `sync_logs (sync_job_id)`, `(club_id, integration_id, started_at)`
- `sync_conflicts (sync_log_id)`
- `player_coach_notes (club_id, player_id, created_at)`
- `training_session_notes (club_id, training_id)`
- `club_notifications (club_id, user_id, scheduled_at)`
- `club_memberships (club_id, team_id)` partial
- `player_stats (club_id, season)`
- `match_squad (club_id, player_id)`

---

## 5. Dokumentacja

| Plik | Zmiana |
|------|--------|
| `docs/architecture/rbac.md` | Scope trenera + helpery RLS |
| `docs/README.md` | Linki do audytu 11.5 i raportu poprawek |
| `docs/stage-11.5-fixes-report.md` | Ten dokument |
| `docs/stage-11.5-report.md` | Zaktualizowany status (poprawki wdrożone) |
| `package.json` | Naprawiono zduplikowany klucz `build`; skrypt `db:migrate:stage115` |

---

## 6. Świadomie pozostawione (poza zakresem)

- Rollup `player_stats` ← `match_player_stats` (ETAP 17 w planie)
- Vercel Cron dla reminder sync (ETAP 13)
- Multi-club session picker (ETAP 14)
- CI GitHub Actions
- Frekwencja placeholder 85% w rankingu talentów

---

## 7. Ocena gotowości po poprawkach

| Obszar | Przed | Po |
|--------|-------|-----|
| Bezpieczeństwo | 6/10 | **8/10** |
| Wydajność | 6/10 | **7.5/10** |
| Gotowość produkcyjna | 7/10 | **8/10** |

Projekt gotowy do **pilotażu 1–10 klubów** i dalszego rozwoju (ETAP 12+ plan biznesowy bez duplikacji prac security).
