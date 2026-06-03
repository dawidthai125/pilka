# SECURITY REVIEW — `get_public_home_bundle` Sprint 16.2

**Data:** 2026-06-03  
**Werdykt:** **PASS** (projekt + implementacja) — z warunkiem zastosowania migracji na prod

---

## Anon access

| Check | Wynik |
|-------|--------|
| `GRANT EXECUTE … TO anon, authenticated` | ✅ Tak (migracja) |
| Guard `website_is_public(club_id)` | ✅ Jak `get_public_website_home` |
| Guard `clubs.status = active` | ✅ |
| Brak wymogu JWT / session | ✅ Public homepage |

---

## RLS i SECURITY DEFINER

| Check | Wynik |
|-------|--------|
| Funkcja `SECURITY DEFINER` + `search_path = public` | ✅ Spójne z innymi public RPC |
| Wejście tylko przez slug klubu | ✅ Multi-tenant ready |
| Klub niepubliczny → `NULL` | ✅ Brak payloadu |

---

## Brak wycieku danych prywatnych

| Obszar | W bundle? | Werdykt |
|--------|-----------|---------|
| E-maile / telefony zawodników | ❌ | PASS |
| Adresy / PESEL / dokumenty | ❌ | PASS |
| CRM (contacts, pipeline) | ❌ | PASS |
| Finanse / inventory | ❌ | PASS |
| Panel auth / role | ❌ | PASS |
| `coach_notes` meczów | ❌ | PASS |
| Pełna treść newsów (`content`) | ❌ | Tylko excerpt + metadane |
| Kadra | ✅ | Tylko pola publiczne: imię, nazwisko, numer, pozycja, statystyki sezonu (jak `get_public_players`) |
| Sponsorzy | ✅ | Tylko `show_on_website` + status active/expiring (jak istniejący RPC) |

---

## Porównanie z istniejącymi public RPC

Bundle **składa** dane już eksponowane przez:

- `get_public_website_home`
- `get_public_players`
- `get_public_team_stats`
- `get_public_teams`
- `get_public_sponsors`
- public SELECT meczów / tabeli / news

**Nie dodaje** nowych pól wrażliwych względem poprzedniego homepage.

---

## Storage signed URLs

- Nadal po stronie TS (`hydratePublicHomeBundle`) — tylko ścieżki z `website_media` / branding klubu.
- Ścieżki `club-media/*` serwowane statycznie bez signed URL.
- Brak signed URL dla prywatnych bucketów poza `club-assets` (jak wcześniej).

---

## Ryzyka resztkowe (akceptowalne)

1. **Pełna kadra w JSON** — jak dotychczas na `/` (sekcja składu); top 5 strzelców precomputed nie zwiększa ekspozycji.
2. **Layout nadal woła `get_public_website_home`** — ten sam surface co przed 16.2.
3. **SECURITY DEFINER** — wymaga utrzymania `website_is_public` jako jedynej bramki (bez zmian względem 15.x).

---

## Werdykt końcowy

| Sekcja | Status |
|--------|--------|
| Anon access | **PASS** |
| RLS / public guard | **PASS** |
| Brak CRM / prywatnych danych | **PASS** |
| Brak nowej ekspozycji vs stary `/` | **PASS** |

**FAIL:** brak — pod warunkiem że migracja nie obejdzie guardów (review kodu SQL: OK).
