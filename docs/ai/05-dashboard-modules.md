# 05 — Moduły panelu klubu (Dashboard)

Panel = wszystko pod `(dashboard)/` po zalogowaniu. Dostęp przez **RBAC** (`src/config/permissions.ts`).

## Rdzeń — codzienna praca klubu

### Dashboard `/dashboard`

- **Coach Day** — skrót operacyjny trenera (treningi, mecze, zadania)
- Szybkie wejścia w moduły
- Pliki: `src/features/dashboard/`, `src/app/(dashboard)/dashboard/`

### Klub `/club`

- Dane klubu: nazwy publiczna/oficjalna, adres, związek
- `features/club/`

### Drużyny `/teams`

- Lista drużyn (Seniorzy, grupy akademii)
- Powiązanie z `teams` w DB

### Zawodnicy `/players`

- **Źródło prawdy operacyjne** kadry FC OS
- Profile, pozycje, numery, statystyki `player_stats`
- Powiązanie z `league_player_registry.player_id` po syncu
- `features/players/`

### Treningi `/training`

- Planowanie treningów, obecności, ranking
- `/training/coach` — widok trenera

### Mecze `/matches`

- Mecze **własnego klubu** (nie cała liga)
- Skład, raport, wydarzenia meczowe
- Sync z League Hub wpisuje tu mecze GLKS → wyświetlane jako Piorun
- `/matches/league-table` — tabela z `league_table_entries`

### Frekwencja `/attendance`

- Obecności na treningach i meczach
- `/attendance/matches/[matchId]`

## League Hub `/league`

Osobny dokument: [07-league-hub-sync.md](./07-league-hub-sync.md)

| Podstrona | Funkcja |
|-----------|---------|
| `/league` | Dashboard ligi |
| `/league/table` | Ostatni snapshot tabeli |
| `/league/fixtures` | `league_matches` |
| `/league/players` | `league_player_registry` |
| `/league/sync` | Joby, logi, status |
| `/league/import` | Import JSON/CSV |
| `/league/teams` | `league_teams` — mapowanie GLKS → Piorun |

## Strona klubu CMS `/website`

| Podstrona | Funkcja |
|-----------|---------|
| `/website` | Przegląd |
| `/website/branding` | Logo, kolory, SEO, hero path |
| `/website/news` | Aktualności (status: draft/published) |
| `/website/gallery` | Albumy publiczne |
| `/website/media` | Sloty zdjęć (hero, team, academy, gallery, news) |
| `/website/social` | Facebook, Instagram, … |

`features/website/actions.ts` — mutacje + `revalidatePath` na public.

## Content Hub `/content`

- Posty wielokanałowe, kalendarz publikacji, AI generacja
- Publikacja do `website_news`
- `features/content/`, `docs/modules/stage-15a-content-hub.md`

## Komunikacja `/communication`

- Ogłoszenia, wiadomości trenera, czaty drużynowe
- `features/communication/`

## Finanse `/finance`

- Przychody, koszty, składki, granty, budżety, dokumenty
- Portal rodzica: `/finance/portal`

## Sponsorzy `/sponsors`

- Baza sponsorów, publikacje, leady
- Portal: `/sponsors/portal` (rola sponsor)

## Magazyn `/inventory` i Equipment `/equipment`

- **Inventory** — starszy moduł magazynowy (stock, zestawy)
- **Equipment** — assets, przydziały, serwis, zestawy meczowe
- Portale zawodnika dla obu ścieżek

## CRM `/crm`

- Kontakty, interakcje, zadania, wydarzenia, darowizny
- `/crm/parents` — relacje rodziców

## Urazy `/injuries`

- Rejestr, kategorie, rehabilitacja, return-to-play
- Portal zawodnika: `/injuries/portal`

## Akademia `/academy`

- Grupy, scouting, talenty, rozwój zawodnika (`/academy/development/[playerId]`)

## AI `/ai`

| Część | Funkcja |
|-------|---------|
| `/ai` | Chat asystenta |
| `/ai/reports` | Raporty generowane |
| `/ai/suggestions` | Sugestie |
| `/ai/manager` | Agent manager (zadania, narzędzia) |
| `/ai/tasks` | Kolejka zadań AI |

Wymaga `OPENAI_API_KEY` na serwerze.

## Wideo `/video`

- Biblioteka, upload, raporty, klipy
- `docs/modules/stage-14-video-center.md`

## Integracje `/integrations`

- UI pod przyszłe: PZPN, Extranet, DZPN, ręczny import
- `features/integrations/`

## System

| Moduł | Funkcja |
|-------|---------|
| `/members` | Zaproszenia, role w klubie |
| `/settings` | Preferencje, PWA |
| `/notifications` | Centrum powiadomień |
| `/profile` | Konto użytkownika |

## Role (skrót)

Definicje: `src/types/rbac.ts`, logika: `permissions.ts`

Przykłady: `owner`, `president`, `sports_director`, `coach`, `player`, `parent`, `sponsor`, `website_admin`, …

Nawigacja mobilna filtrowana per rola — `src/lib/navigation/mobile-nav.ts` (fix 15.10A).

## PWA

- Service worker: Serwist
- Push: wymaga VAPID + cron dispatch
- `docs/modules/stage-12-pwa.md`

## Mapowanie features → kod

| Moduł | `src/features/` |
|-------|-----------------|
| players | `players/` |
| matches | `matches/` |
| training | `training/` |
| league | `league/` |
| website | `website/` |
| finance | `finance/` |
| sponsors | `sponsors/` |
| communication | `communication/` |
| content | `content/` |
| ai | `ai/`, `ai-manager/` |
| … | każdy katalog ≈ jeden moduł biznesowy |
