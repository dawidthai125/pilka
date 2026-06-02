# P1 Import Report — Piorun Real Content

**Data:** 31 maja 2026  
**Status:** wykonane lokalnie · **bez commita · bez deployu na produkcję**

---

## Podsumowanie

| Zadanie P1 | Status |
|------------|--------|
| Import materiałów z Facebooka | ✅ 26 plików w `public/club-media/` |
| Zastąpienie treści demo | ✅ migracja SQL na bazie dev |
| Naprawa galerii `/galeria` | ✅ ścieżki `club-media/*` + fallback w `assets.ts` |
| Usunięcie fake newsów | ✅ 8 wpisów demo usuniętych |
| Ukrycie demo sponsorów | ✅ `show_on_website = false` dla wszystkich |
| Screenshoty lokalne | ✅ 4 pliki PNG |

---

## 1. Import mediów z Facebooka

### Metoda

Bezpośrednie pobieranie URL-i CDN (`fetch` / `page.request`) zwraca **HTTP 403** — Facebook blokuje serwerowe requesty.

**Rozwiązanie:** Playwright ładuje profil klubu i przechwytuje odpowiedzi sieciowe (`page.on("response")`) podczas renderowania strony w przeglądarce.

```bash
npm run import:facebook
```

Skrypt: `scripts/import-piorun-facebook.mjs`

### Wynik importu

| Metryka | Wartość |
|---------|---------|
| Unikalne zdjęcia z FB (media ID) | **10** (9 slotów + logo profilowe) |
| Pliki w `public/club-media/` | **26** (9 primary + 16 derived + logo) |
| Źródło | [Facebook Piorun](https://www.facebook.com/profile.php?id=61560486822886) |
| Rozdzielczość | miniatury/post graphics (~6–13 KB) — wystarczające na sloty strony; pełne foto wymaga uploadu CMS |

### Uwaga techniczna

Import wymaga **Playwright + Chromium** (`npx playwright install chromium`). Przy następnym imporcie URL-e CDN mogą wygasnąć — wystarczy ponownie uruchomić skrypt (automatyczny scrape z FB).

---

## 2. Treści — migracja bazy

Plik: `supabase/migrations/20260631120000_piorun_p1_real_content.sql`  
Zastosowano: `node scripts/run-sql.mjs supabase/migrations/20260631120000_piorun_p1_real_content.sql`

### Branding / kontakt

| Pole | Wartość |
|------|---------|
| `hero_subtitle` | Od Skrzata do Seniora — jedna rodzina, jeden klub |
| `hero_image_path` | `club-media/cover.jpg` |
| `logo_path` | `club-media/club-logo.jpg` |
| `contact_phone` | +48 663 595 991 |
| `contact_address` | GLKS Mietków, ul. Bystrzycka, Mietków (Wawrzeńczyce) |
| `contact_email` | NULL (usunięty fake) |

### Aktualności

**Usunięto (8):** KS Orzeł, transfer demo, dzień otwarty demo, podziękowania Budmax, remont szatni, podsumowanie kolejki, wolontariat, szkic relacji.

**Opublikowano (5) — treści z FB / klubu:**

| Slug | Tytuł | Kategoria |
|------|-------|-----------|
| `przed-nami-kolejne-wyzwanie-mlodzicy` | Przed nami kolejne wyzwanie! | mecze |
| `zapowiedz-trampkarze-gwarek-walbrzych` | Kolejny mecz trampkarzy — Gwarek Wałbrzych | mecze |
| `zapowiedz-seniorzy-sparta-pustkow` | Zapowiedź: Sparta Pustków vs Piorun | mecze |
| `zapowiedz-trampkarze-zdroj-jedlina` | Dzień meczowy trampkarzy | mecze |
| `akademia-pioruna-zapisy` | Akademia Pioruna — zapisy cały rok | akademia |

### Sponsorzy

Wszyscy sponsorzy seed (Budmax, AutoSerwis Kowalski itd.) → **`show_on_website = false`**.  
Sekcja sponsorów na stronie publicznej pusta do czasu realnych partnerów.

### Social

Aktywny tylko **Facebook** (prawidłowy URL profilu). Instagram / TikTok / YouTube wyłączone.

---

## 3. Naprawa galerii

**Problem:** `website_gallery_photos.image_path` wskazywał na Supabase Storage (`club_id/website/gallery/...`) — pliki nie istniały → „Zdjęcie niedostępne”.

**Rozwiązanie:**

1. Migracja SQL — `image_path` → `club-media/gallery-XX.jpg` (i powiązane assety)
2. `src/lib/website/assets.ts` — ścieżki `club-media/*` serwowane jako `/club-media/*` (statyczne pliki z importu FB)

**Albumy zaktualizowane:**

| Slug | Tytuł | Zdjęcia |
|------|-------|---------|
| `mecze-2026` | Mecze sezonu 2025/2026 | 3 |
| `treningi-zima` | Treningi i przygotowania | 2 |
| `zycie-klubu` | Nasz klub | 1 |
| `turniej-spoleczny` | Akademia i młodzież | 2 |

---

## 4. Zmiana kodu (minimalna)

| Plik | Zmiana |
|------|--------|
| `src/lib/website/assets.ts` | Fallback `club-media/` → URL publiczny |
| `scripts/import-piorun-facebook.mjs` | Playwright network capture (zamiast martwych CDN URL) |
| `scripts/capture-p1-screenshots.mjs` | Nowy — screenshoty lokalne |

---

## 5. Screenshoty lokalne

Katalog: `docs/audit/screenshots/p1-real-content/`

| Plik | URL | Opis |
|------|-----|------|
| `homepage.png` | `/` | Logo klubu, cover FB, prawdziwe posty, tel. 663 595 991 |
| `aktualnosci.png` | `/aktualnosci` | Lista 5 wpisów klubowych |
| `akademia.png` | `/aktualnosci/akademia-pioruna-zapisy` | Wpis o akademii + zdjęcie dzieci |
| `galeria.png` | `/galeria/mecze-2026` | 3 grafiki meczowe z FB (naprawione) |

**Ponowne wykonanie screenshotów:**

```bash
npm run dev
node scripts/capture-p1-screenshots.mjs
```

---

## 6. Weryfikacja wizualna (homepage)

Po imporcie strona pokazuje:

- ✅ Herb klubu (z FB) zamiast monogramu PW
- ✅ Grafiki meczowe Silesia Mietków / Piorun (z FB)
- ✅ Prawdziwy telefon i adres
- ✅ Brak fake newsów (Orzeł, Budmax)
- ⚠️ „Najbliższy mecz” — nadal pusty (brak danych w terminarzu CRM, poza zakresem P1 treści)

---

## 7. Następne kroki (po review)

1. **Review** screenshotów i treści przez klub
2. **Commit** — pliki do stage:
   - `public/club-media/*`
   - `supabase/migrations/20260631120000_piorun_p1_real_content.sql`
   - `src/lib/website/assets.ts`
   - `scripts/import-piorun-facebook.mjs`
   - `scripts/capture-p1-screenshots.mjs`
   - `docs/audit/p1-*`
3. **Deploy** — migracja na produkcję + pliki statyczne
4. **P2** — realni sponsorzy, pełna rozdzielczość zdjęć, terminarz meczów

---

*Powiązane:* [`p1-imported-materials.md`](./p1-imported-materials.md) · [`content-backlog.md`](./content-backlog.md)
