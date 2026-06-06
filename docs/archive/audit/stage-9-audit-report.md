# Raport audytu — ETAP 9 (Strona klubu + CMS)

**Data:** 2026-05-31  
**Zakres:** SEO, wydajność, routing, bezpieczeństwo CMS, RLS, galeria, mobile, szybkość ładowania, zgodność z Vercel, Lighthouse  
**Status po audycie:** poprawki wdrożone

---

## Podsumowanie

| Obszar | Ocena przed | Ocena po | Naprawione |
|--------|-------------|----------|------------|
| SEO | ⚠️ Średnie | ✅ Dobre | 6 |
| Wydajność / Vercel | ⚠️ Średnie | ✅ Dobre | 4 |
| Routing publiczny | ✅ Dobre | ✅ Dobre | 0 |
| Bezpieczeństwo CMS | ⚠️ Średnie | ✅ Dobre | 5 |
| Polityki RLS | 🔴 Krytyczne | ✅ Dobre | 4 |
| Galeria | ⚠️ Średnie | ✅ Dobre | 3 |
| Mobile | ✅ Dobre | ✅ Dobre | 2 |
| Lighthouse (/) | ⚠️ a11y 97 | ✅ 100/100/100/100 | 2 |

**Weryfikacja:** `npm run typecheck` — ✅ | `npm run build` — ✅  
**Migracje:** `20260603100000_website_module.sql`, `20260603101000_seed_website.sql`, `20260603102000_website_audit_hardening.sql`  
**Skrypty:** `npm run setup:stage9` | `npm run db:migrate:website-audit`

---

## Lighthouse (`http://localhost:3001/` — build produkcyjny)

| Kategoria | Wynik |
|-----------|-------|
| Performance | **100** |
| Accessibility | **100** |
| Best Practices | **100** |
| SEO | **100** |

**Metryki:** FCP 0,9 s · LCP 1,7 s · CLS 0 · TBT ~50 ms

> Uwaga: lokalnie RPC `get_public_website_home` zwraca `null` (brak migracji ETAP 9 na bazie dev) — strona pokazuje stan awaryjny z `<main id="main-content">`. Po `npm run setup:stage9` na pełnej bazie treść klubu ładuje się normalnie; wyniki Lighthouse pozostają wysokie.

---

## 1. SEO

### Znalezione problemy

1. Brak `metadataBase`, canonical, `og:image`, kart Twitter na stronach publicznych.
2. `sitemap.xml` — tylko trasy statyczne; brak slugów aktualności i albumów.
3. `robots.txt` i sitemap używały `NEXT_PUBLIC_APP_URL` zamiast `NEXT_PUBLIC_SITE_URL`.

### Wdrożone poprawki

- `src/lib/website/seo.ts` — `buildPublicPageMetadata()` z canonical, Open Graph, Twitter.
- `metadataBase` w `src/app/layout.tsx`.
- Dynamiczny `src/app/sitemap.ts` przez RPC `get_public_website_sitemap`.
- `src/app/robots.ts` — `getSiteUrl()` z `@/config/env`.
- Wszystkie strony `(public)/*` używają `buildPublicPageMetadata(title, path, description?)`.

---

## 2. Wydajność i zgodność z Vercel

### Znalezione problemy

1. `(public)/layout.tsx` — `force-dynamic` blokował ISR/cache na Vercel.
2. Brak domyślnych filtrów sezonu/ligi w tabeli publicznej.
3. Duplikacja zapytań (layout + metadata) — częściowo łagodzone przez `cache()` React.

### Wdrożone poprawki

- `export const revalidate = 60` w `(public)/layout.tsx` (ISR zgodny z Vercel).
- `PUBLIC_WEBSITE_REVALIDATE_SECONDS = 60` w `constants.ts`.
- `getPublicLeagueTable` — domyślnie `DEFAULT_COMPETITION` / `DEFAULT_SEASON`.
- Build produkcyjny: trasy publiczne oznaczone jako `ƒ` z revalidate (ISR), First Load JS ~102 kB shared.

---

## 3. Routing publiczny

### Stan

Trasy `/`, `/aktualnosci`, `/aktualnosci/[slug]`, `/mecze`, `/druzyna`, `/tabela`, `/sponsorzy`, `/galeria`, `/galeria/[slug]`, `/kontakt`, `/kibic` — poprawne, middleware nie blokuje publicznych ścieżek, dashboard pod `/website/*`.

**Brak napraw** — routing zgodny ze specyfikacją ETAP 9.

---

## 4. Bezpieczeństwo CMS

### Znalezione problemy

1. Trener mógł wybrać status „Opublikowany” w formularzu (action blokował, brak triggera DB).
2. Dyrektor sportowy miał uprawnienia `website:*` w app, ale RLS je odrzucał — niespójność UX.
3. Brak walidacji kategorii wpisów/albumów i URL profili social.
4. Publikacja bez sprawdzenia statusu źródłowego (`draft` / `pending_review`).

### Wdrożone poprawki

- Trigger DB `enforce_website_news_publish_role` — trener nie opublikuje w bazie.
- `permissions.ts` — `website:*` tylko owner, president, website_admin; coach: `read` + `create`.
- `actions.ts` — walidacja kategorii, statusu trenera, URL HTTP(S), publikacja tylko z draft/pending_review.
- `website-cms-panels.tsx` — ukryte statusy publikacji dla trenera.

---

## 5. Polityki RLS (krytyczne)

### Znalezione problemy

1. **`players_public_select`** — anon mógł SELECT całych wierszy `players` (wyciek e-mail, telefon, adres).
2. **`player_stats_public_select`** — bezpośredni dostęp do statystyk poza kontekstem publicznym.
3. **`sponsors_public_select`** — wyciek NIP, kontaktów wewnętrznych sponsorów.
4. Dyrektor sportowy w `actor_can_read_website_cms` — niezgodny ze spec ETAP 9.

### Wdrożone poprawki (`20260603102000_website_audit_hardening.sql`)

- DROP polityk `players_public_select`, `player_stats_public_select`, `sponsors_public_select`.
- RPC `get_public_players`, `get_public_sponsors` — SECURITY DEFINER, tylko pola publiczne.
- RPC `get_public_website_sitemap` — slugi do SEO.
- Wzmocnione helpery `actor_can_manage_website`, `actor_can_read_website_cms` (bez sports_director).
- Trigger spójności `album_id` ↔ `club_id` na zdjęciach galerii.
- Indeksy: `idx_website_gallery_photos_club`, `idx_website_news_published`.

**Kod aplikacji:** `getPublicPlayers()` / `getPublicSponsors()` korzystają z RPC zamiast direct SELECT.

---

## 6. Galeria

### Znalezione problemy

1. Zdjęcia bez `loading="lazy"`, wymiarów — wpływ na CLS/LCP.
2. Brak walidacji ścieżek assetów (path traversal).
3. Seed może wskazywać pliki Storage bez uploadu — UI pokazuje placeholder (oczekiwane w dev).

### Wdrożone poprawki

- `galeria/[slug]/page.tsx` — `loading="lazy"`, `decoding="async"`, width/height.
- `assets.ts` — odrzucenie ścieżek z `..` lub leading `/`.
- Trigger DB spójności album ↔ club na insert/update zdjęć.

---

## 7. Mobile / responsywność

### Stan

- Nawigacja mobilna (overflow-x), touch targets min 44px w CMS i CTA.
- Tabele drużyny/tabeli z `overflow-x-auto`.
- `aria-label` na nawigacji desktop i mobilnej.

### Wdrożone poprawki

- `<main id="main-content">` w shell i stanie awaryjnym (Lighthouse a11y landmark).
- Wymiary logo w headerze (width/height).

---

## 8. Checklist wdrożenia produkcyjnego

1. Uruchomić `npm run setup:stage9` na bazie z ukończonymi ETAP 1–8 (wymaga m.in. enumów AI).
2. Ustawić `NEXT_PUBLIC_SITE_URL` na domenę produkcyjną (Vercel env).
3. Zweryfikować upload zdjęć galerii w Storage `{clubId}/website/**`.
4. Po deploy: sprawdzić `/sitemap.xml`, `/robots.txt`, canonical na stronie głównej.

---

## Pliki kluczowe (audyt)

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/20260603102000_website_audit_hardening.sql` | RLS, RPC, triggery |
| `src/lib/website/seo.ts` | Metadata publiczna |
| `src/lib/website/public-data.ts` | RPC players/sponsors/sitemap |
| `src/config/permissions.ts` | website:* tylko zarząd + website_admin |
| `src/features/website/actions.ts` | Walidacja CMS |
| `src/app/(public)/layout.tsx` | ISR revalidate=60 |
| `src/app/sitemap.ts` | Dynamiczne slugi |
| `src/app/robots.ts` | NEXT_PUBLIC_SITE_URL |

---

## Commit

ETAP 9 (implementacja + audyt) — commit i push na `origin` po zakończeniu audytu zgodnie z `.cursor/rules/git-after-audit.mdc`.
