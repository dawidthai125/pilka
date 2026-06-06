# PUBLIC WEBSITE 3.0 — MEDIA REPORT

**Data:** 2026-05-31  
**Zakres:** System mediów demo + CMS dla strony publicznej (bez nowych etapów poza mediami)  
**Weryfikacja:** `npm run typecheck` ✅ · `npm run build` ✅

---

## 1. Jak zarządza się zdjęciami

### Panel CMS

**Ścieżka:** `/website/media` (link „Media” na `/website`)

Panel podzielony na sekcje:

| Sekcja | Sloty | Operacje |
|--------|-------|----------|
| **Hero** | `team`, `match`, `stadium` | dodaj / podmień / usuń własne zdjęcie (powrót do demo) |
| **Drużyny** | 1 zdjęcie na `team_id` | j.w. |
| **Akademia** | `training`, `kids`, `path` | j.w. |
| **Galeria** | 6–12 pozycji (`sort_order`) | dodaj, podmień, usuń, zmiana kolejności (↑↓) |
| **Aktualności** | powiązane z `news_id` | j.w. |

Każda karta mediów oferuje:
- podgląd bieżącego URL (demo lub upload),
- upload pliku (`accept="image/*"`),
- opcjonalny podpis,
- przycisk usunięcia (dla galerii — usunięcie rekordu; dla pozostałych — czyszczenie `storage_path` i powrót do demo).

### Warstwa techniczna

- Tabela: `website_media` (`club_id`, `section`, `slot_key`, `team_id`, `news_id`, `storage_path`, `demo_asset_key`, `sort_order`)
- Upload: bucket `club-assets` → `{clubId}/website/media/{section}/...`
- Demo: statyczne pliki w `/public/demo-media/*.svg` (bez pobierania z internetu)
- Resolver: `storage_path` → signed URL; brak uploadu → `demo_asset_key` → `/demo-media/{key}.svg`; brak obu → gradient placeholder w UI

---

## 2. Jakie role mają dostęp

| Rola | CMS `/website/media` | Zakres edycji |
|------|----------------------|---------------|
| **Owner** | ✅ | wszystkie sekcje |
| **Prezes** | ✅ | wszystkie sekcje |
| **Administrator strony** | ✅ | wszystkie sekcje |
| **Trener** | ✅ | **tylko** sekcja „Drużyny” dla przypisanych `team_id` (`coach_team_ids`) |
| **Rodzic** | ❌ | tylko odczyt strony publicznej |
| **Zawodnik** | ❌ | tylko odczyt strony publicznej |
| **Sponsor** | ❌ | tylko odczyt strony publicznej |

Funkcje uprawnień (aplikacja + RLS):
- `actor_can_manage_website_media(club_id, section, team_id)` w PostgreSQL
- `canAccessWebsiteMediaCms`, `canManageWebsiteMediaSection`, `canManageWebsiteTeamMedia` w `src/config/permissions.ts`

Trener widzi w panelu wyłącznie karty swoich drużyn; owner/prezes/administrator — pełny panel z filtrami sekcji.

---

## 3. Jak wygląda podmiana zdjęć

1. Wejdź w **Panel → Strona klubu → Media** (`/website/media`).
2. Wybierz sekcję (np. Hero → „Mecz”).
3. Kliknij **Wybierz plik** → **Dodaj zdjęcie** / **Podmień zdjęcie**.
4. Opcjonalnie uzupełnij podpis → zapis.
5. Strona główna odświeża się po revalidate (`/`, sekcje publiczne).

**Usunięcie własnego zdjęcia** (Hero, drużyna, akademia, news): przycisk „Usuń własne zdjęcie” czyści `storage_path` — wraca **demo SVG** z seeda.

**Galeria:** „Usuń z galerii” usuwa cały rekord; „Dodaj do galerii” tworzy nowy wpis z uploadem.

**Kolejność galerii:** strzałki ↑↓ na karcie (tylko admin) → `reorderWebsiteMedia`.

---

## 4. Multi-club (SaaS)

- Każdy rekord `website_media` ma **`club_id`** — brak hardcodu Pioruna w kodzie UI.
- Demo assets są **globalne** (klucze typu `hero-team`, `gallery-03`), ale **przypisanie per klub** jest w bazie.
- Seed demo (`20260603104100_seed_website_demo_media.sql`) dotyczy klubu testowego `a1b2c3d4-...` (Piorun); nowy klub startuje bez rekordów → placeholdery w UI, admin dodaje media przez CMS.
- RLS i storage policies używają `actor_can_manage_website` / `coach_team_ids` w kontekście `club_id` z sesji.

---

## 5. Jakie zdjęcia demo są używane

Pliki lokalne: `public/demo-media/` (24 pliki SVG, generowane skryptem `scripts/generate-demo-media.mjs`).

| Klucz demo | Plik | Użycie |
|------------|------|--------|
| `hero-team` | `hero-team.svg` | Hero — slot „drużyna” |
| `hero-match` | `hero-match.svg` | Hero — slot „mecz” |
| `hero-stadium` | `hero-stadium.svg` | Hero — slot „stadion” |
| `team-seniors` | `team-seniors.svg` | Karta drużyny seniorów |
| `team-u18` / `team-u12` / `team-youth` | odpowiednie SVG | Pozostałe grupy wiekowe |
| `academy-training` | `academy-training.svg` | Sekcja Akademia |
| `academy-kids` | `academy-kids.svg` | Sekcja Akademia |
| `academy-path` | `academy-path.svg` | Sekcja Akademia |
| `gallery-01` … `gallery-08` | `gallery-01.svg` … | Bento galerii (8 szt.) |
| `news-matches`, `news-club`, `news-academy`, `news-transfers`, `news-sponsors` | odpowiednie SVG | Zdjęcia wyróżniające aktualności |
| `placeholder` | `placeholder.svg` | Fallback gdy brak klucza |

Wizualnie: zielono-złote gradienty, etykieta sekcji, podpis „Media demo · podmień w panelu CMS”.

---

## Integracja ze stroną publiczną 3.0

Sekcje homepage korzystają z `buildPublicWebsiteMediaBundle()`:

| Sekcja UI | Źródło mediów |
|-----------|----------------|
| **Hero** | 3-slotowy kolaż (`heroImages`) |
| **Nasze drużyny** | `teamImages[team.id]` na karcie |
| **Akademia** | `academyImages` (kids + training) |
| **Galeria** | `galleryImages` — ciemne tło bento, do 12 zdjęć |
| **Aktualności** | `newsImages[news.id]` z priorytetem nad `featured_image_path` |

Brak rekordu lub URL → estetyczny gradient placeholder (bez pustych `<img>`).

---

## Pliki migracji

1. `supabase/migrations/20260605111000_website_media_system.sql` — tabela, RLS, storage dla trenerów, migracja `hero_image_path`
2. `supabase/migrations/20260605111100_seed_website_demo_media.sql` — demo sloty (upsert, bez DELETE)

**Uwaga:** Migracje wymagają `supabase db push` / wdrożenia na środowisko z bazą, aby produkcja pokazała demo z bazy (pliki SVG w `/public` są dostępne od razu po deploy frontendu).

---

## Podsumowanie

System **DEMO MEDIA** spełnia założenia Public Website 3.0 fazy foto: strona ma wizualnie „pełne” sekcje z lokalnymi placeholderami, a panel umożliwia podmianę na prawdziwe zdjęcia per klub z kontrolą ról (w tym trener → swoja drużyna).
