#!/usr/bin/env node
/**
 * Pomocnik: skąd wziąć LNP_ACCESS_TOKEN i LNP_TEAM_ID gdy widzisz strzelców w przeglądarce.
 *
 * node scripts/discover-lnp-setup.mjs
 * node scripts/discover-lnp-setup.mjs --test   # wymaga .env.local z tokenem
 */
import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getLnpConfig, lnpFetch, fetchLnpSquadAndStats } from "./lib/league-lnp-sources.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(root, ".env.local") });

const test = process.argv.includes("--test");

console.log(`
=== mPZPN / Łączy Nas Piłka — konfiguracja syncu statystyk ===

Dlaczego w przeglądarce widzisz bramki, a sync ma zera?
  • Strona laczynaspilka.pl ładuje dane z API competition-api-pro Z LOGOWANIEM (sesja PZPN).
  • Nasz serwer (Vercel / npm run sync) NIE ma Twojej sesji przeglądarki → API zwraca 401 bez tokenu.
  • To NIE jest osobna „umowa API” — wystarczy skopiować token z DevTools (jak hasło do konta klubu).

Krok 1 — LNP_TEAM_ID (UUID drużyny GLKS Mietków)
  1. Wejdź na https://www.laczynaspilka.pl/rozgrywki
  2. Wyszukaj „GLKS Mietków” lub „Mietków” i otwórz kartę drużyny / statystyki zawodników.
  3. W pasku adresu szukaj UUID, np.:
     .../druzyna/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
     lub w zakładce Sieć (F12) przy żądaniu teams/<UUID>/players

Krok 2 — LNP_ACCESS_TOKEN (Bearer JWT)
  1. F12 → Sieć (Network) → odśwież stronę drużyny / tabeli ligowej.
  2. Filtruj: competition-api-pro
  3. Otwórz dowolne żądanie → Nagłówki → Authorization: Bearer eyJ...
  4. Skopiuj cały token (bez słowa Bearer) do .env.local:
     LNP_ACCESS_TOKEN=eyJ...

Krok 3 — test
  node scripts/probe-lnp-team-players.mjs
  npm run sync:league-live

Uwaga: token JWT z ŁNP często żyje tylko kilka SEKUND (pole exp w tokenie).
  → Odśwież stronę, skopiuj Bearer i OD RAZU uruchom:
     node scripts/lnp-paste-and-sync.mjs "eyJ..."
  albo wklej do .env.local i w tej samej chwili: npm run sync:league-live

90minut.pl: dla B Klasy Wrocław VII skarb/strzelcy NIE zawierają bramek per zawodnik (sprawdzone).
Regiowyniki: kadra ma nazwiska, komórki M/G są puste; /statystyki/ to tylko bramki drużyny łącznie.
`);

if (!test) process.exit(0);

const cfg = getLnpConfig();
if (!cfg.enabled) {
  console.error("Brak LNP_ACCESS_TOKEN lub LNP_TEAM_ID w .env.local — uzupełnij i uruchom z --test");
  process.exit(1);
}

const dict = await lnpFetch(cfg, "seasons/dictionaries");
console.log("seasons/dictionaries:", dict.status, dict.ok ? "OK" : dict.text?.slice(0, 80));

const players = await lnpFetch(cfg, `teams/${cfg.teamId}/players`);
console.log(`teams/${cfg.teamId}/players:`, players.status, players.ok ? `${(players.json?.items ?? players.json ?? []).length || "?"} rekordów` : players.text?.slice(0, 120));

const full = await fetchLnpSquadAndStats(cfg);
console.log("\nSync test:", full.ok ? `${full.count} zaw., hasAnyStats=${full.hasAnyStats}` : full.reason);
for (const p of (full.players ?? []).filter((x) => x.goals > 0).slice(0, 8)) {
  console.log(`  ${p.leaguePlayerName}: ${p.goals} g`);
}
