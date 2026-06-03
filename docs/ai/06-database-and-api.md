# 06 — Baza danych i API (Supabase)

## Źródło prawdy

**`supabase/migrations/*.sql`** — kolejność chronologiczna, nie edytuj ręcznie prod bez migracji.

Typy TS: `src/types/database.ts` (generowane / utrzymywane ręcznie).

## Multi-tenant — wzorzec

Prawie każda tabela biznesowa:

```sql
club_id UUID NOT NULL REFERENCES clubs(id)
```

Dostęp: **RLS** + polityki per rola `authenticated`.

## Tabele fundamentu

| Tabela | Rola |
|--------|------|
| `profiles` | Użytkownik Supabase Auth |
| `clubs` | Tenant (slug, nazwy, status) |
| `club_memberships` | user + club + role |
| `teams` | Drużyny w klubie |
| `players` | Zawodnicy FC OS |
| `player_stats` | Statystyki sezonowe per zawodnik |

## Strona publiczna (website)

| Tabela | Rola |
|--------|------|
| `website_settings` | Branding, hero, kontakt, kolory |
| `website_news` | Aktualności |
| `website_gallery_albums` / `website_gallery_photos` | Galeria |
| `website_social_integrations` | Linki social |
| `website_media` | Sloty mediów (section, slot_key, storage_path, demo_asset_key) |

## Mecze i liga (public + panel)

| Tabela | Rola |
|--------|------|
| `matches` | Mecze modułu Mecze (własny klub) |
| `league_table_entries` | Publiczna `/tabela` |
| `league_seasons` / `league_competitions` | Kontekst sezonu |
| `league_teams` | Mapowanie nazw (GLKS → Piorun) |
| `league_tables` | Snapshoty tabeli (historia) |
| `league_matches` | Mirror terminarza całej ligi |
| `league_player_registry` | Kadra ligowa + `notes` JSON ze statystykami |
| `league_sync_jobs` / `league_sync_logs` | Audyt syncu |
| `league_sources` | Metadane źródeł |
| `league_conflicts` | Konflikty importu |

## RPC publiczne (anon + authenticated)

Wywoływane z `src/lib/website/public-data.ts`:

| Funkcja | Zwraca |
|---------|--------|
| `get_public_website_home(p_club_slug)` | club, settings, next/last match, counts |
| `get_public_players(p_club_slug)` | kadra + statystyki (GREATEST player_stats vs registry) |
| `get_public_team_stats(p_club_slug)` | playersCount, goals, assists, matchesPlayed |
| `get_public_teams(p_club_slug)` | drużyny z liczbą zawodników |
| `get_public_sponsors(p_club_slug)` | sponsorzy na stronie |
| `get_public_club_stats(p_club_slug)` | statystyki klubu |
| `get_public_website_sitemap(p_club_slug)` | slugi news + galeria |

Warunek widoczności: `website_is_public(club_id)` + `clubs.status = active`.

## Inne moduły (tabele — skrót)

| Moduł | Prefiks tabel |
|-------|----------------|
| Treningi | `trainings`, `training_*` |
| Finanse | `finance_*`, fees, budgets |
| Magazyn | `inventory_*` |
| Sponsorzy | `sponsors`, `sponsor_*` |
| AI | `ai_conversations`, `ai_reports`, `ai_tasks`, … |
| Wideo | `videos`, `video_*` |
| Content | `content_posts`, `content_*` |
| Komunikacja | `announcements`, `team_chats`, `chat_*` |
| CRM | `crm_*` |
| Urazy | `injuries`, `rehabilitation_*`, `return_to_play` |
| Equipment | `assets`, `equipment_*` |

Pełna propozycja schematu: `docs/database/schema-proposal.md`

## Storage

| Bucket | Użycie |
|--------|--------|
| `club-assets` | Logo, zdjęcia CMS, galeria |

Signed URLs: `src/lib/website/assets.ts` — ważność 3600 s.

## ID stałe (seed Piorun / liga)

W `scripts/lib/league-live-sources.mjs` → `LEAGUE_CONFIG`:

| Pole | UUID (seed) |
|------|-------------|
| `clubId` | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| `competitionId` | `f9022001-0001-4000-8000-000000000001` |
| `seasonId` | `f9021001-0001-4000-8000-000000000001` |
| `SOURCE_MIRROR_ID` | `f9023004-0004-4000-8000-000000000004` |

**Uwaga:** przy innym klubie / środowisku ID mogą się różnić — sprawdź seed w migracjach.

## league_player_registry.notes (JSON)

Przykładowa struktura zapisywana przez sync:

```json
{
  "season": "2025/2026",
  "syncedAt": "ISO-8601",
  "sources": ["regiowyniki_kadra", "regiowyniki_match_goals"],
  "stats": {
    "appearances": 0,
    "goals": 5,
    "yellowCards": 0,
    "redCards": 0,
    "minutes": 0,
    "benchEntries": 0
  }
}
```

Publiczne RPC czyta to jako fallback gdy `player_stats` puste.

## Migracje ważne dla public / ligi

| Migracja | Temat |
|----------|--------|
| `20260603100000_website_module.sql` | Moduł website + RPC home |
| `20260631200000_public_players_stats_fix.sql` | Fix statystyk publicznych |
| `20260618120000_stage15b_league_hub.sql` | League Hub |
| `20260631190000_public_website_last_result_date_fix.sql` | lastResult bez przyszłych dat |

## Service role — kiedy

| Kontekst | Klient |
|----------|--------|
| Skrypty `scripts/*.mjs` | `createClient` + service role |
| Cron league-sync | env z Vercel |
| Push dispatch | `admin.ts` |

Nigdy w `client.ts` ani w bundle przeglądarki.
