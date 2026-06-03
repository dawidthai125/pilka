# 04 — Strona publiczna (Public Website)

## Cel

Oficjalna witryna klubu dla kibiców, rodziców i sponsorów — **bez logowania**, dane z Supabase, wygląd „klub piłkarski” (dark matchday od 4.0+).

## Ewolucja wersji (dla kontekstu)

| Wersja | Główna zmiana |
|--------|----------------|
| **2.0** | Moduły meczowe, akademia, wiele drużyn na home |
| **3.0** | Scenografia: pełnoekranowy hero, matchday plakat, sponsor wall `#062820` |
| **4.0** | Prawdziwe JPG, naprawa dat meczów, lokalność, akademia wyżej |
| **4.0+** | `PublicLandingHome` + **dark styling** na wszystkich podstronach |

**Aktywny komponent homepage:** `PublicLandingHome` (`src/features/website/components/public-landing-home.tsx`).

**Nieużywany legacy:** `PublicFacebookHome` — nie podpięty do `/`.

## Struktura strony głównej `/`

Kolejność sekcji (Server Component `src/app/(public)/page.tsx`):

1. **Hero** — tytuł, okładka, CTA, statystyki one-liner
2. **Season hub** — następny mecz, ostatnie wyniki, skrót tabeli
3. **News** — ostatnie aktualności (limit 6)
4. **Top strzelcy** — z `getPublicPlayers()` (ciężkie RPC — znany problem P1)
5. **Akademia** — `PublicAcademySection` + `/#akademia`
6. (Wewnątrz `PublicLandingHome`) — tabela, kadra skrót, wartości klubu

Layout wspólny: `ClubSitePageWrapper` — nav, logo, cover, social.

## Podstrony publiczne

| URL | Dane | Kluczowe pliki |
|-----|------|----------------|
| `/druzyna` | `get_public_players` | `public-dark-subpage-content.tsx` |
| `/tabela` | `getPublicLeagueTable` | `public-home-league-table.tsx` |
| `/mecze` | `getPublicMatches` | moduł meczów publiczny |
| `/aktualnosci` | `website_news` | lista + slug |
| `/galeria` | `website_gallery_*` | albumy + zdjęcia |

## Skąd biorą się dane

Centralny moduł: **`src/lib/website/public-data.ts`**

| Funkcja | Typ | Zwraca |
|---------|-----|--------|
| `getPublicWebsiteHome(slug)` | RPC | club, settings, nextMatch, lastResult, counts |
| `getPublicPlayers(slug)` | RPC | kadra + gole/M/G z `player_stats` + registry |
| `getPublicTeamStats(slug)` | RPC | agregaty drużyny |
| `getPublicLeagueTable(clubId)` | 4× SELECT | wpisy tabeli + sezon |
| `getPublicMatches(clubId, filter)` | SELECT | `matches` |
| `getPublicNews` | SELECT | `website_news` |
| `getPublicSponsors` | RPC | sponsorzy `show_on_website` |
| `getPublicTeams` | RPC | drużyny + liczba zawodników |
| `getPublicWebsiteMedia` | SELECT | sloty `website_media` |

Slug domyślny: `siteConfig.defaultClubSlug` → `piorun-wawrzenczyce`.

## Media i zdjęcia

| Mechanizm | Opis |
|-----------|------|
| `website_settings` | `logoPath`, `heroImagePath`, kolory, kontakt |
| `website_media` | Sloty: hero, team, academy, gallery, news |
| `demo_asset_key` | Fallback na `/club-media/*.jpg` |
| `getWebsiteAssetUrl` | Signed URL Supabase Storage `club-assets` |
| `resolvePublicCoverImageUrl` | Hero → signed URL lub demo stadium |

Import FB: `npm run import:facebook` → `scripts/import-piorun-facebook.mjs`

## Wydajność (stan po P0)

| Ustawienie | Wartość |
|------------|---------|
| ISR | **300 s** (`layout.tsx`, `PUBLIC_WEBSITE_REVALIDATE_SECONDS`) |
| Middleware | **Brak** auth na trasach publicznych |
| Problem | ~15–20 zapytań DB + wiele signed URL na jedno `/` |
| Plan P1 | `get_public_home_bundle()` — jeden RPC |

## CMS (panel)

Edycja treści: **`/website/*`** (rola `website_staff` / uprawnienia).

Publikacja newsów z Content Hub może wołać `revalidatePath("/")` — `src/lib/content/publish.ts`.

## Kolory i typografia (public)

| Token | Wartość |
|-------|---------|
| Primary | `#0B3D2E` |
| Secondary | `#F4C430` |
| Scena ciemna | `#062820` (`CLUB_SCENE_DARK`) |
| Font display | Oswald (`--font-club-display`) |
| Font UI | Geist (root layout) |

## Co jest „demo” vs „prawdziwe”

Raport Real Content Sprint: często **demo_asset_key** i fake newsy w seed — P1 import FB wykonany lokalnie; **sprawdź prod Supabase** przed założeniem, że treść jest prawdziwa.

## Pliki must-know

```
src/app/(public)/
src/features/website/components/public-landing-home.tsx
src/features/website/components/club-site-page.tsx
src/lib/website/public-data.ts
src/lib/website/cover-image.ts
src/lib/website/media.ts
src/middleware.ts                    # public bypass
```
