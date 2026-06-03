# Live sync danych ligowych (mirror)

**Status:** aktywny kanał tymczasowy (do uzyskania API PZPN/DZPN)  
**Klub:** Piorun Wawrzeńczyce / **GLKS Mietków**  
**Liga:** B Klasa — Powiat Wrocławski, Grupa VII — sezon 2025/2026

## Mapowanie nazw

| Kontekst | Nazwa |
|----------|--------|
| 90minut, DZPN, PZPN, Extranet, mPZPN | **GLKS Mietków** |
| Strona klubu, panel FC OS | **Piorun Wawrzeńczyce** |

Konfiguracja w `league_teams`: `league_name = GLKS Mietków`, `display_name = Piorun Wawrzeńczyce`.

## Źródła i wiarygodność

| Źródło | Co pobieramy | Ocena | Uwagi |
|--------|--------------|-------|--------|
| **90minut.pl** (`liga14526`) | Tabela, wyniki kolejek | ★★★★★ | Deklaruje źródło mPZPN + laczynaspilka.pl |
| **regionalnyfutbol.pl** | Tabela, pełny terminarz | ★★★★☆ | Mirror ŁNP, stabilny HTML |
| dzpn.pl (WWW) | — | ★☆☆☆☆ | Brak live API ligowego |
| **regiowyniki.pl** (`GLKS_Mietkow/kadra`) | Kadra sezonowa (29 zaw.) | ★★★★☆ | Statystyki per zawodnik często puste w B Klasie |
| **mPZPN / competition-api-pro** | Kadra + statystyki M/G/ŻK | ★★★★★ | `LNP_ACCESS_TOKEN` + `LNP_TEAM_ID` w `.env.local` |

### Statystyki zawodników — widoczne w przeglądarce, brak w sync

Strona [laczynaspilka.pl](https://www.laczynaspilka.pl/rozgrywki) ładuje dane z `competition-api-pro` **z sesją PZPN** (logowanie klubu / konta). Serwer FC OS nie ma tej sesji — bez nagłówka `Authorization` API zwraca **401**. To nie jest osobna „umowa API”; wystarczy skopiować token JWT z DevTools (F12 → Sieć → filtr `competition-api-pro` → nagłówek `Bearer …`) oraz UUID drużyny z karty GLKS Mietków. Token wygasa — trzeba go odświeżyć co jakiś czas.

```bash
node scripts/discover-lnp-setup.mjs        # instrukcja
node scripts/discover-lnp-setup.mjs --test # test po uzupełnieniu .env.local
node scripts/probe-lnp-team-players.mjs
```

**90minut** (`strzelcy.php`, `skarb.php`) i **regiowyniki** (`/kadra/`, `/statystyki/`) dla B Klasy Wrocław VII **nie zawierają** bramek per zawodnik (tylko nazwiska lub sumy drużynowe).

**Strategia scalania:** tabela z 90minut (primary), terminarz z regionalnyfutbol + wyniki z 90minut. Konflikty punktów logowane w `league_sync_jobs.metadata`.

## Uruchomienie

```bash
# Podgląd bez zapisu do bazy
npm run sync:league-live:dry

# Pełna synchronizacja (wymaga SUPABASE_SERVICE_ROLE_KEY w .env.local)
npm run sync:league-live
```

## Automatyczna aktualizacja

- **Vercel Cron:** codziennie o 06:00 UTC → `GET /api/cron/league-sync`
- **Secret:** `CRON_SECRET` na Vercel (platforma wysyła `Authorization: Bearer …` przy cronie) lub `LEAGUE_SYNC_CRON_SECRET`
- **Wymagane na Vercel:** `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET` (lub `LEAGUE_SYNC_CRON_SECRET`)
- **Ręcznie po protestach:** `npm run sync:league-live` lub POST na endpoint cron

## Co jest synchronizowane

1. `league_tables` — snapshot tabeli
2. `league_matches` — terminarz + wyniki
3. `league_table_entries` — publiczna `/tabela` (z mapowaniem Piorun)
4. `matches` — moduł Mecze (mecze własnego klubu)
5. `league_player_registry` — kadra ligowa GLKS Mietków (statystyki w polu `notes` jako JSON)
6. `players` — tworzy brakujących zawodników z kadr ligowej i powiązuje rejestr; demo seed (`*@piorun.test`) ustawia jako nieaktywni

## Pliki

| Plik | Rola |
|------|------|
| `scripts/lib/league-live-sources.mjs` | Pobieranie + parsery + merge |
| `scripts/lib/league-live-pipeline.mjs` | Import do Supabase |
| `scripts/lib/league-squad-sources.mjs` | Kadra (mirror) + merge statystyk mPZPN |
| `scripts/lib/league-lnp-sources.mjs` | Adapter competition-api-pro |
| `scripts/sync-league-live.mjs` | CLI |
| `src/app/api/cron/league-sync/route.ts` | Cron API |

## Docelowo

Adapter mPZPN (`league-lnp-sources.mjs`) jest podpięty do syncu kadr — wystarczy dodać credentials w `.env.local` / Vercel i ponownie uruchomić `npm run sync:league-live`.

Test po tokenie: `node scripts/probe-lnp-team-players.mjs`
