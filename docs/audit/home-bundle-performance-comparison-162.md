# PERFORMANCE COMPARISON REPORT — Sprint 16.2 Etap B

**Data:** 2026-06-03  
**Metoda:** audyt statyczny kodu + smoke HTTP prod (PRZED deploy bundle) + live RPC (wymaga migracji)

---

## FAZA 1 — Audyt homepage PRZED

### Liczba zapytań (render `/`, layout + page)

| Typ | Liczba | Szczegóły |
|-----|--------|-----------|
| **RPC** | **6 unikalnych** | layout: `get_public_website_home`; page: `get_public_sponsors`*, `get_public_teams`, `get_public_club_stats`*, `get_public_team_stats`, `get_public_players` (+ home dedup cache) |
| **SELECT** | **9** | clubs, news×6, league×4 chain, media, matches×8, social (layout) |
| **createSignedUrl** | **~8–15** | logo×2, cover×2, batch media, pojedyncze news |
| **fetch (HTTP zewn.)** | 0 | — |
| **Server Actions** | 0 | — |

\* pobierane w `loadClubHomepageData`, **nieużywane** na landing page.

**Szacowany round-trip Supabase HTTP:** 12–16 (+ storage).

### Największe źródła opóźnień (PRZED)

1. **`get_public_players`** — pełna kadra (~30+) tylko po to, by wyciąć top 5 w TS.
2. **`getPublicLeagueTable`** — 4 osobne SELECT (season, competition, club, entries).
3. **Duplikaty** — `get_public_website_home`, cover, logo.
4. **Batch signed URLs** — wiele równoległych wywołań storage API.
5. **Martwe fetch** — sponsors, clubStats, część media bundle.

### Dane pobierane wielokrotnie

- `get_public_website_home` (layout + `loadClubHomepageData`)
- `resolvePublicCoverImageUrl` (layout + page) — naprawione częściowo: `React.cache()` na cover
- `getWebsiteAssetUrl(logo)` (layout + loader)
- Wyniki meczów: `lastResult` w RPC home vs `getPublicMatches(8)`

---

## FAZA 4 — PO implementacji (architektura)

| Typ | PRZED (page+layout) | PO (page+layout) | Δ page layer |
|-----|---------------------|------------------|--------------|
| **RPC** | 6 | 2 | **−4** na treści `/` |
| **SELECT** | 9 | 1 (social layout) | **−8** na treści `/` |
| **createSignedUrl** | 8–15 | 2–6 (batch) | **~−50–70%** |
| **Server Actions** | 0 | 0 | — |
| **Round-trip HTTP (szac.)** | 12–16 | 3–4 | **~−70%** |

### Warstwa page (izolowana)

| | PRZED | PO |
|---|-------|-----|
| Supabase RPC/SELECT | ~11 | **1 RPC** |
| Hydrate (storage) | rozproszone | 1 batch |

---

## TTFB i czas renderu

| Pomiar | PRZED | PO (lokalnie) | Uwagi |
|--------|-------|---------------|-------|
| **TTFB prod `/`** | 1109 ms (HEAD, ten test) | — | Prod **bez** bundle; wcześniejszy P0: ~830 ms warm |
| **TTFB prod `/`** (audit script GET) | 3296 ms | — | cold / sieć; nie porównywalne 1:1 |
| **RPC `get_public_home_bundle`** | — | FAIL* | *migracja nie na Supabase |
| **Build `/`** | 1.37 kB page | 1.37 kB page | bez zmian UI bundle |

**TTFB PO deploy:** wymaga migracji + deploy + ponowny pomiar (cel: −200–400 ms warm TTFB vs baseline P0 ~830 ms, zależnie od liczby signed URLs).

---

## PRZED vs PO — podsumowanie liczbowe

| Metryka | PRZED | PO (docelowo) |
|---------|-------|---------------|
| Zapytania RPC (homepage content) | 5–6 | **1** |
| SELECT (homepage content) | 7–8 | **0** |
| Łączne round-trip Supabase (layout+page) | 12–16 | **3–4** |
| createSignedUrl (typowo) | 8–15 | **2–6** |
| TTFB prod (zmierzony dziś, stary kod) | ~1100 ms HEAD | do pomiaru po migracji |

---

## Rekomendacja deploy

**NO DEPLOY** dopóki:

1. Migracja `20260703140000_public_home_bundle_162.sql` nie jest na prod Supabase.
2. Live probe: `node scripts/audit-public-home-performance.mjs --live` → `ok: true`.
3. Smoke lokalny/staging `/` po migracji (treść widoczna, nie pusty `return null`).

**Po spełnieniu powyższego:** **GO deploy** — zmiana tylko warstwy danych, build PASS, brak regresji UI.

---

## Jak powtórzyć pomiary

```bash
node scripts/audit-public-home-performance.mjs --live
npm run build
```

Smoke (prod lub staging):

```
GET /, /aktualnosci, /mecze, /tabela, /galeria → 200
```
