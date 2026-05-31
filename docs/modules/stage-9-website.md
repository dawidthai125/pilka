# ETAP 9 — Strona publiczna klubu i panel kibica

**Data:** 2026-05-31  
**Status:** wdrożony

---

## 1. Nowe moduły

| Warstwa | Lokalizacja | Opis |
|---------|-------------|------|
| Migracje SQL | `supabase/migrations/20260603100000_website_module.sql` | Tabele CMS, RLS publiczne, RPC, storage |
| Seed | `supabase/migrations/20260603101000_seed_website.sql` | Ustawienia, newsy, galeria, social, sponsorzy www |
| Typy | `src/types/website.ts` | Domena strony klubu |
| Lib | `src/lib/website/` | constants, mappers, public-data, insights (AI news), uploads, assets |
| Server actions | `src/features/website/actions.ts` | CMS: news, galeria, branding, social |
| Komponenty publiczne | `src/features/website/components/club-*.tsx` | Shell, sekcje strony głównej |
| Komponenty CMS | `src/features/website/components/website-cms-panels.tsx` | Panele zarządzania |
| Strona publiczna | `src/app/(public)/` | `/`, `/aktualnosci`, `/mecze`, … |
| Panel CMS | `src/app/(dashboard)/website/` | Zarządzanie treściami |
| SEO | `src/app/sitemap.ts`, `src/app/robots.ts` | Mapa witryny, robots.txt |
| Setup | `scripts/setup-stage9.mjs` | `npm run setup:stage9` |

### Trasy publiczne (bez logowania — panel kibica)

| Trasa | Funkcja |
|-------|---------|
| `/` | Strona główna (hero, mecz, wynik, news, sponsorzy, tabela, statystyki, galeria) |
| `/aktualnosci` | Lista newsów |
| `/aktualnosci/[slug]` | Wpis z SEO |
| `/mecze` | Terminarz, wyniki, relacje (z modułu meczów) |
| `/druzyna` | Kadra, numery, statystyki (z modułu zawodników) |
| `/tabela` | Tabela ligi (architektura pod DZPN/PZPN) |
| `/sponsorzy` | Sponsorzy główni / wspierający / partnerzy |
| `/galeria`, `/galeria/[slug]` | Albumy zdjęć (Storage) |
| `/kontakt` | Adres, e-mail, telefon, link do mapy |
| `/kibic` | Panel kibica — skrót terminarza, wyników, newsów, statystyk |

### Trasy CMS (autoryzacja)

| Trasa | Dostęp |
|-------|--------|
| `/website` | owner, president, website_admin, sports_director, coach (odczyt CMS) |
| `/website/news` | Tworzenie wpisów: coach+; publikacja: owner, president, website_admin |
| `/website/gallery` | owner, president, website_admin |
| `/website/branding` | owner, president, website_admin |
| `/website/social` | owner, president, website_admin |

---

## 2. Nowe tabele

| Tabela | Opis |
|--------|------|
| `website_settings` | Branding, kolory, hero, kontakt, SEO, flaga `public_site_enabled` |
| `website_news` | Aktualności CMS (status, kategoria, AI, autor) |
| `website_gallery_albums` | Albumy galerii |
| `website_gallery_photos` | Zdjęcia w albumach |
| `website_social_integrations` | Konfiguracja FB/IG/TikTok/YT (API w przygotowaniu) |

### Rozszerzenie istniejącej tabeli

| Tabela | Nowe kolumny |
|--------|--------------|
| `sponsors` | `show_on_website`, `public_tier`, `public_description` |

### Enumy

- `website_news_category` — matches, club, transfers, academy, sponsors, other
- `website_news_status` — draft, pending_review, published, archived
- `website_gallery_category` — matches, trainings, club, events
- `website_sponsor_tier` — main, supporting, partner
- `website_social_platform` — facebook, instagram, tiktok, youtube
- `club_role` — rozszerzono o **website_admin**
- `ai_report_category` — rozszerzono o **website**

---

## 3. Relacje

```
clubs
 ├── website_settings (1:1)
 ├── website_news → profiles (author)
 ├── website_gallery_albums
 │    └── website_gallery_photos
 ├── website_social_integrations
 ├── sponsors (+ public_tier dla strony www)
 │
 ├── [istniejące — odczyt publiczny]
 ├── matches, league_table_entries, players, player_stats, match_events
 └── teams
```

Dane meczów, tabeli, kadry i sponsorów **nie są duplikowane** — strona publiczna czyta je z istniejących modułów przez polityki RLS `anon`.

---

## 4. Polityki bezpieczeństwa

### Helpery RLS

| Funkcja | Opis |
|---------|------|
| `website_is_public(club_id)` | Czy strona klubu jest włączona |
| `actor_can_manage_website` | owner, president, website_admin |
| `actor_can_read_website_cms` | + sports_director, coach |
| `actor_can_create_website_news` | owner, president, website_admin, coach |
| `actor_can_publish_website_news` | = manage website |

### Dostęp publiczny (anon)

- `website_news` — tylko `status = published`
- `website_gallery_*` — tylko `is_published`
- `website_settings` — odczyt gdy `public_site_enabled`
- `matches`, `league_table_entries`, `players` (active), `player_stats`, `match_events` (completed), `sponsors` (`show_on_website`)
- Storage `{clubId}/website/**` — odczyt anon; zapis tylko CMS staff

### CMS

- Trener tworzy wpisy (draft / pending_review), **nie publikuje** bez zatwierdzenia
- AI generuje szkice ze statusem `pending_review`
- Kibic — wyłącznie odczyt publiczny (brak konta)

### RPC (SECURITY DEFINER)

- `get_public_website_home(slug)` — agregaty strony głównej
- `get_public_team_stats(slug)` — statystyki drużyny

---

## 5. Identyfikacja wizualna

Konfigurowalna z `/website/branding`:

- Logo (`logo_path`, opcjonalnie `logo_dark_path`)
- Kolory: `primary_color`, `secondary_color`, `accent_color`
- Hero: tytuł, podtytuł, grafika
- SEO: `seo_title`, `seo_description`, `og_image_path`

Domyślne kolory Pioruna: zielony `#0B3D2E`, złoty `#F4C430`.

---

## 6. Integracje

| Źródło | Wykorzystanie na stronie |
|--------|--------------------------|
| Moduł meczów | Terminarz, wyniki, relacje (`coach_notes`) |
| Tabela ligowa | `/tabela` — gotowość pod sync DZPN/PZPN |
| Zawodnicy + statystyki | `/druzyna`, sekcja statystyk |
| Sponsorzy CRM | `/sponsorzy` z `public_tier` |
| OpenAI | Szkice aktualności (wymagają zatwierdzenia) |
| Social media | Konfiguracja URL — auto-sync w przyszłości |

---

## 7. Dane testowe (Piorun Wawrzeńczyce)

- Ustawienia strony z danymi kontaktowymi Wawrzeńczyce
- 7 opublikowanych aktualności + 1 szkic
- 4 albumy galerii (8 zdjęć — ścieżki Storage)
- 4 integracje social (włączone FB/IG/YT)
- Sponsorzy z tierami main/supporting/partner

**Setup:** `npm run setup:stage9` (wymaga `SUPABASE_DB_PASSWORD`)

**Konta:** `wlasciciel@piorun.test`, `prezes@piorun.test`, `trener@piorun.test` (CMS/news), opcjonalnie `webadmin@piorun.test` (website_admin)

---

## 8. SEO

- `generateMetadata` na każdej podstronie publicznej
- Open Graph (title, description, locale)
- `/sitemap.xml` — trasy statyczne
- `/robots.txt` — allow public, disallow panel/dashboard

Zmienna opcjonalna: `NEXT_PUBLIC_APP_URL` (domyślnie `https://piorun-wawrzenczyce.pl`).
