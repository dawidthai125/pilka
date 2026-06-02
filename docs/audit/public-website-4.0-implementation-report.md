# PUBLIC WEBSITE 4.0 — IMPLEMENTATION REPORT

**Data:** 2026-05-31  
**Zakres:** Wdrożenie zaakceptowanej wizji 4.0 (bez nowych sekcji / funkcji / modułów)  
**Referencja:** `docs/audit/public-website-4.0-visual-concept.md`  
**Weryfikacja:** `npm run typecheck` ✅ · `npm run build` ✅

---

## Executive summary

Public Website 4.0 nie przeprojektowuje układu 3.0 — **naprawia wiarę w klub**. Zamiast demo SVG są fotorealistyczne JPG (`/club-media/`), Matchday nie pokazuje już `Invalid Date` / `undefined`, hero mówi „Wawrzeńczyce + społeczność”, akademia jest widoczna w pierwszym ekranie, sponsorzy prezentowani jak partnerzy klubu.

Logika pozostaje multi-club SaaS — lokalność z CMS (`website_settings`, `clubs`, `website_media`), zero hardcodu nazw w komponentach.

---

## Priorytety 4.0 — status

| Priorytet | Wdrożenie | Uwagi |
|-----------|-----------|-------|
| **1. Prawdziwe zdjęcia** | ✅ | 24 JPG w `public/club-media/`; `demo-media.ts` wskazuje na JPG zamiast SVG. Źródło: Picsum (deterministyczne seedy) — **zastąpić zdjęciami z CMS/FB klubu** w `/website/media`. |
| **2. Matchday** | ✅ | `mapPublicMatch()` obsługuje camelCase z RPC; `isDisplayablePublicMatch()` + `formatPublicMatchKickoff()` zwraca `null` przy błędnych danych; sekcja ukryta gdy brak poprawnego meczu. |
| **3. Lokalność** | ✅ | `buildClubLocalityLine()` / `buildClubCommunityLine()` w hero, matchday poster i footer; adres + poziom rozgrywek z CMS. |
| **4. Akademia od razu** | ✅ | Miniatura akademii w hero + CTA „Zapisz dziecko”; sekcja akademii **przed** drużynami. |
| **5. Sponsorzy = partnerzy** | ✅ | Nagłówek „Partnerzy klubu”, main sponsor w stylu koszulki, siatka z nazwami partnerów. |

---

## Kolejność sekcji (4.0)

```
Hero → Matchday → Akademia → Drużyny → Galeria → Aktualności → Partnerzy → [sticky CTA mobile]
```

Zgodne z `src/app/(public)/page.tsx` — bez dodatkowych sekcji względem konceptu.

---

## Przed / po — kluczowe zmiany

| Obszar | PRZED (3.0 prod) | PO (4.0) |
|--------|------------------|----------|
| **Hero** | Kolaż 3 SVG z napisami „DRUŻYNA” | Pełnoekranowy **rotator** 1 zdjęcie (`HeroPhotoRotator`), Oswald display, linia lokalności + społeczności, telefon, miniatura akademii, CTA „Zapisz dziecko” / „Sobotni mecz” |
| **Matchday** | `undefined — undefined Invalid Date` | Poprawne nazwy drużyn i data; poster z lokalnością; ostatni wynik ze zdjęciem meczu |
| **Akademia** | Dopiero po drużynach | **Drugie** na stronie; preview w hero |
| **Sponsorzy** | Lista logotypów | Partnerzy klubu — jersey main sponsor + grid z nazwami |
| **Mobile** | Brak | `PublicMobileSignupBar` — sticky telefon zapisu |
| **Typografia** | Domyślna sans | Oswald jako `--font-club-display` |

---

## Pliki zmienione / dodane

| Plik | Zmiana |
|------|--------|
| `src/lib/website/mappers.ts` | Dual-case mapowanie meczów (snake + camel) |
| `src/lib/website/match-display.ts` | Walidacja meczu, bezpieczne formatowanie daty |
| `src/lib/website/locality.ts` | **NEW** — linie lokalności i społeczności |
| `src/lib/website/demo-media.ts` | Ścieżki `/club-media/*.jpg` |
| `src/lib/website/constants.ts` | `CLUB_DISPLAY_CLASS` |
| `public/club-media/*.jpg` | **NEW** — 24 zdjęcia |
| `scripts/fetch-club-demo-photos.mjs` | **NEW** — generator JPG (Picsum) |
| `src/features/website/components/hero-photo-rotator.tsx` | **NEW** — rotacja co 6 s |
| `src/features/website/components/public-mobile-signup-bar.tsx` | **NEW** — sticky CTA |
| `src/features/website/components/club-home-sections.tsx` | Hero, Matchday, Akademia, Sponsorzy 4.0 |
| `src/features/website/components/club-site-shell.tsx` | Footer z lokalnością |
| `src/app/(public)/page.tsx` | Kolejność sekcji + nowe props |
| `src/app/(public)/layout.tsx` | Font Oswald |
| `supabase/migrations/20260605111200_website_40_copy.sql` | **NEW** — hero_subtitle dla klubu demo |

---

## Matchday — root cause

RPC `get_public_website_home` zwraca mecze w **camelCase** (`matchDate`, `homeTeamName`, …). Mapper 3.0 czytał tylko **snake_case** → puste stringi → UI: `Invalid Date` i `undefined`.

---

## Media — następny krok operacyjny

1. Wgrać prawdziwe zdjęcia Pioruna w **CMS → Website → Media** (`/website/media`).
2. Przypisać sloty: `hero-team`, `hero-match`, `hero-stadium`, `academy-kids`, `team-*`, `gallery-*`.
3. Po uploadzie demo JPG w `public/club-media/` przestają być widoczne (CMS ma pierwszeństwo).

Regeneracja placeholderów (dev):

```bash
node scripts/fetch-club-demo-photos.mjs
```

---

## Migracja bazy

```bash
node scripts/run-sql.mjs supabase/migrations/20260605111200_website_40_copy.sql
```

Aktualizuje `hero_subtitle` klubu demo na: *„Od Skrzata do Seniora — jedna rodzina, jeden klub”* (idempotentnie).

---

## Test 3 sekund (checklist)

| # | Kryterium | Oczekiwany efekt po deploy |
|---|-----------|----------------------------|
| 1 | To jest Piorun Wawrzeńczyce? | Herb + nazwa + zdjęcie boiska/drużyny |
| 2 | Klub piłkarski? | Kadry ze strojami / murawą w hero |
| 3 | Klub żyje? | Matchday z datą lub ukryty (nie błąd) |
| 4 | Są dzieci? | Miniatura akademii w hero + sekcja #2 |
| 5 | Są mecze? | Plakat VS z godziną |
| 6 | Sponsorzy? | Budmax / partnerzy dużo czytelniej |
| 7 | Zapis dziecka? | Złoty CTA + telefon w hero i sticky bar (mobile) |

---

## Deploy

**Nie wdrożono w tym kroku** — wymaga commit + push + migracja SQL na produkcji.

Po deploy sprawdzić: https://pilka-mu.vercel.app — sekcja Matchday, rotator hero, kolejność Akademia przed Drużynami.
