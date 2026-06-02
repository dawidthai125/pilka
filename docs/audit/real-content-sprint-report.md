# REAL CONTENT SPRINT REPORT

**Klub:** Piorun Wawrzeńczyce · `piorun-wawrzenczyce`  
**Produkcja:** https://pilka-mu.vercel.app  
**Data audytu:** 31 maja 2026  
**Zasada sprintu:** tylko treść i media — bez nowych funkcji, modułów ani przebudowy layoutu

---

## Executive summary

Strona publiczna ma **poprawną architekturę CMS** i kolory klubu, ale użytkownik nadal widzi **klub demo**, nie Pioruna:

- **100% slotów mediów** w `website_media` wskazuje na `demo_asset_key` (pliki stock Unsplash w `public/club-media/`)
- **7 z 8 aktualności** to fikcyjne treści seed (KS Orzeł, Budmax, remont szatni)
- **Sponsorzy, adres, e-mail** — dane testowe systemu FC OS
- **1 wpis** pochodzi z prawdziwego Facebooka (migracja `20260605111300`)
- **Logo** — brak uploadu; fallback monogram „PW”

Pierwszy krok do „prawdziwego klubu”: import zdjęć FB + podmiana treści demo + upload logo — **bez zmian w kodzie**.

---

## PIORUN VISUAL DNA (skrót)

Pełny dokument: [`piorun-visual-dna.md`](./piorun-visual-dna.md)

| Pytanie | Odpowiedź |
|---------|-----------|
| Co wyróżnia Piorun? | Zielony + złoty, energia CAPS + emoji, mecze jako wydarzenia VS, realne zdjęcia boiska i dzieci |
| Co przenieść? | Kolory, hasło, realne foty FB, telefon +48 663 595 991, ton postów |
| Czego nie kopiować? | Layout FB, grafiki AI VS, fake social URL, nadmierne emoji/hashtagi |
| Jak zachować charakter? | Klub redaguje treści; system dostarcza strukturę, nie głos |

---

## FAZA 1 — Audyt mediów

### 1.1 Mapowanie slotów

| Sekcja | Gdzie w systemie | Sloty | W `website_media`? |
|--------|------------------|-------|---------------------|
| **Cover (okładka)** | `website_settings.heroImagePath` + fallback `cover-image.ts` | 1 | ❌ Osobno (branding) |
| **Hero** | `section=hero` | 3 (team, match, stadium) | ✅ |
| **Akademia** | `section=academy` | 3 (training, kids, path) | ✅ |
| **Drużyny** | `section=team` | 7 (Seniorzy + 6 grup akademii) | ✅ |
| **Galeria (homepage bento)** | `section=gallery` | 8 | ✅ |
| **Aktualności (featured)** | `section=news` | do 6 | ✅ |
| **Galeria (/galeria)** | `website_gallery_albums` + `website_gallery_photos` | 4 albumy, 8 wpisów | ❌ Osobny moduł |
| **Logo** | `website_settings.logoPath` | 1 | ❌ Branding |

**Razem slotów `website_media`:** 27 (+ cover + logo + galeria albumowa)

### 1.2 Stan plików `public/club-media/`

| Metryka | Wartość |
|---------|---------|
| Pliki JPG w repo | **25** |
| Źródło obecne (repo) | **Stock Unsplash** (`scripts/fetch-club-demo-photos.mjs`) |
| Skrypt realnych fot FB | `scripts/import-piorun-facebook.mjs` — **gotowy, nie uruchomiony w tym audycie** |
| Plik `placeholder.jpg` | 1 (fallback systemowy) |

### 1.3 Klasyfikacja materiałów (stan docelowy bazy po seed)

| Typ | Cover | Hero | Academy | Team | Gallery | News | **SUMA** |
|-----|-------|------|---------|------|---------|------|----------|
| **Sloty łącznie** | 1 | 3 | 3 | 7 | 8 | 6 | **28** |
| **Prawdziwe (storage_path / FB)** | 0 | 0 | 0 | 0 | 0 | 0 | **0** |
| **Demo placeholder (demo_asset_key)** | 0* | 3 | 3 | 7 | 8 | 6 | **27** |
| **Stock (Unsplash w repo)** | 1 | 3 | 3 | 7 | 8 | 6 | **28** |

\*Cover nie ma rekordu w `website_media` — fallback czyta te same pliki stock z `/club-media/`.

**Galeria albumowa (`/galeria`):** 8 rekordów ze ścieżkami Supabase Storage — **brak plików w bucket** (typowe po seed bez uploadu) = **8 broken placeholders**.

### 1.4 Werdykt Fazy 1

| Obszar | Ocena |
|--------|-------|
| Cover | 🔴 Stock Unsplash (boisko ogólne, nie Wawrzeńczyce) |
| Hero / Team / Academy | 🔴 Te same 4–5 stockowych ujęć powielone |
| Galeria homepage | 🔴 Stock |
| Galeria /galeria | 🔴 Broken paths |
| Logo | 🔴 Brak — monogram PW |
| News images | 🔴 Stock przypisany kategorii, nie do treści |

**Procent realnych materiałów widocznych użytkownikowi: ~0%**

---

## FAZA 2 — Proces importu materiałów klubowych

**Cel:** podmiana demo na prawdziwe fotografie bez zmiany layoutu.

### 2.1 Pipeline techniczny (istniejący)

```
Facebook Pioruna
       ↓
scripts/import-piorun-facebook.mjs   ← pobiera ~12 unikalnych fotek FB
       ↓
public/club-media/*.jpg            ← nadpisuje pliki demo
       ↓
website_media (demo_asset_key)     ← automatycznie serwuje nowe pliki
       ↓
Strona publiczna
```

**Uruchomienie:** `node scripts/import-piorun-facebook.mjs`  
**Uwaga:** URL-e FB CDN wygasają — okresowo odświeżać skrypt.

### 2.2 Pipeline CMS (dla redaktora)

```
Redaktor → /website/branding     → Logo + Grafika hero (cover)
Redaktor → /website/media        → Podmiana slotów (upload zdjęcia)
Redaktor → /website/gallery      → Albumy /galeria
Redaktor → /website/news         → Wpis + zdjęcie wyróżniające
```

### 2.3 Mapowanie kategorii treści → sloty

| Kategoria klubowa | Slot CMS | Plik demo (po imporcie FB) |
|-------------------|----------|----------------------------|
| **Seniorzy** | `team` → drużyna Seniorzy | `team-seniors.jpg` |
| **Młodzicy** | `team` → Młodziki | `team-u12.jpg` / `team-youth.jpg` |
| **Trampkarze** | `team` → Trampkarze | `team-u18.jpg` |
| **Skrzaty** | `team` → Skrzaty + `academy/kids` | `academy-kids.jpg` |
| **Akademia** | `academy/*` (3 sloty) | `academy-*.jpg` |
| **Treningi** | `academy/training` + album „Treningi zimowe” | FB trening |
| **Mecze** | `hero/match` + album „Mecze sezonu” | `hero-match.jpg` |
| **Boisko** | Cover + `hero/stadium` | `cover.jpg`, `hero-stadium.jpg` |
| **Kibice** | `gallery` slot 3, 6 | wybrać z FB |
| **Sponsorzy** | `news/sponsors` + moduł sponsorów CRM | osobna sesja foto/logo |
| **Wydarzenia** | album „Turniej społeczny” | FB event photos |

### 2.4 Procedura krok po kroku (operacyjna)

1. **Pobierz materiały z FB** — uruchom import script lub ręcznie z profilu
2. **Logo** — wyciągnij herb z profilu FB → upload `/website/branding`
3. **Cover** — najlepsze zdjęcie boiska/drużyny → upload „Grafika hero”
4. **Drużyny** — po 1 zdjęciu grupowym na grupę → `/website/media` → Drużyny
5. **Akademia** — 3 zdjęcia dzieci/treningów → sloty Akademia
6. **Galeria homepage** — 8 różnych fotek (nie powielać) → upload + kolejność strzałkami
7. **Galeria /galeria** — utwórz albumy, upload zdjęć (osobny panel)
8. **Aktualności** — usuń/archiwizuj demo news → dodaj realne z FB
9. **Weryfikacja** — przegląd strony incognito, checklista Visual DNA

### 2.5 Czego nie robić w tej fazie

- Nie zmieniać layoutu (`public-facebook-home.tsx`, `club-site-shell.tsx`)
- Nie dodawać nowych sekcji CMS
- Nie commitować wygasłych URL-i FB bez testu

---

## FAZA 3 — CMS (audyt UX dla osoby nietechnicznej)

### 3.1 Co działa dziś ✅

| Akcja | Gdzie | Ocena UX |
|-------|-------|----------|
| Dodać zdjęcie do galerii homepage | `/website/media` → formularz na dole | ✅ Proste |
| Usunąć zdjęcie z galerii | `/website/media` → „Usuń z galerii” | ✅ |
| Podmienić zdjęcie slotu | `/website/media` → upload na karcie | ✅ |
| Ustawić logo | `/website/branding` → Logo | ⚠️ Bez podglądu |
| Ustawić cover | `/website/branding` → „Grafika hero” | ⚠️ Nazwa myląca |
| Dodać wpis + zdjęcie | `/website/news` | ✅ |
| Galeria albumowa | `/website/gallery` | ⚠️ Tylko dodawanie |
| Zmienić kolejność galerii | Strzałki góra/dół | ⚠️ Brak drag&drop |

### 3.2 Lista braków UX (bez wdrożenia — tylko raport)

| # | Brak | Wpływ | Priorytet backlogu |
|---|------|-------|-------------------|
| 1 | **Brak sekcji „Okładka”** w `/website/media` — cover ukryty pod „Grafika hero” | Redaktor nie wie, co ustawia okładkę nagłówka | P2 |
| 2 | **Brak podglądu** aktualnego logo/cover przed uploadem | Upload „w ciemno” | P2 |
| 3 | **Dwie galerie** (homepage bento vs `/galeria`) bez wyjaśnienia | Duplikacja pracy, confusion | P1 |
| 4 | **Usuń zdjęcie** w non-gallery przywraca demo zamiast pustego slotu | Redaktor myśli, że usunął — wraca stock | P2 |
| 5 | **Brak usuwania zdjęć** z albumów w panelu galerii | Tylko dodawanie | P2 |
| 6 | **Brak edycji podpisu** albumu po utworzeniu | | P3 |
| 7 | **Trener widzi tylko swoją drużynę** — reszta mediów ukryta | OK dla RBAC, ale brak komunikatu | P3 |
| 8 | **Etykieta „Media demo”** na kartach | Brzmi jak błąd systemu | P1 |
| 9 | **Pola SEO** (title, description) bez pomocy | Przeraża nietechnicznego użytkownika | P3 |
| 10 | **Przycisk „Generuj szkic AI”** na pierwszym planie | Zachęca do treści niefb-autentycznych | P2 |
| 11 | **Brak „Przypnij wpis”** — sekcja „Przypięty post” bierze pierwszy news | Redaktor nie kontroluje | P2 |
| 12 | **Social seed** (Instagram/TikTok/YouTube) — łatwo opublikować fake linki | Ryzyko wizerunkowe | P1 |

---

## FAZA 4 — Content Quality

### 4.1 Inwentaryzacja problemów

| Typ | Gdzie występuje | Przykład | Jak powinno wyglądać |
|-----|-----------------|----------|----------------------|
| **Fikcyjne aktualności** | `website_news` (seed) | „Wygrana u siebie z KS Orzeł 3:1” | Relacje z prawdziwymi rywalami DZPN lub wpisy z FB |
| **Demo sponsorzy** | `sponsors` + news „Podziękowania” | Budmax, AutoSerwis Kowalski | Tylko realni partnerzy klubu |
| **Fake kontakt** | `website_settings` (seed) | `+48 12 345 67 89`, `ul. Sportowa 1` | Tel. +48 663 595 991; prawdziwy adres boiska |
| **Fake e-mail** | seed | `kontakt@piorun-wawrzenczyce.pl` | Zweryfikowany skrzynka klubu lub brak |
| **Stock opisy galerii** | seed gallery | „Mecz domowy z KS Orzeł” | Podpisy z realnych wydarzeń |
| **Hardcoded fallback post** | `public-facebook-home.tsx` L240–248 | „Sobotni mecz za nami!…” gdy brak news | Usunąć po uzupełnieniu newsów |
| **Fake timestamps** | `public-facebook-home.tsx` | „3 dni temu”, „1 dzień temu” jako fallback | Zawsze z `published_at` |
| **Hashtag generator** | `public-facebook-home.tsx` | `#PiorunWawrzeńczyce` doklejany | Opcjonalnie w treści wpisu, nie auto |
| **Opisy sponsorów CRM** | seed `public_description` | „Sponsor główny — logo na strojach…” | Ciepłe podziękowanie (Brand Guide §6) |
| **Szkic w produkcji** | news draft | „Szkic relacji — oczekuje na redaktora” | Nie publikować / usunąć |
| **Fake social URL** | seed social | instagram.com/piorunwawrzenczyce | Tylko aktywne profile |
| **Tekst „Media demo”** | CMS panel | Etykieta techniczna | „Zdjęcie zastępcze — wgraj własne” |
| **AI generator prominent** | `/website/news` | „Generuj szkic AI” | Treści pisane przez klub |
| **Opis akademii generyczny** | `academy_groups.description` | „Przygotowanie do 11-osobowej” | Ciepły opis dla rodziców |
| **Jeden prawdziwy wpis** | migracja FB | „Przed nami kolejne wyzwanie!” (Silesia Mietków) | **Wzorzec** — reszta tak samo |

### 4.2 Teksty brzmiące jak CRM / SaaS

| Lokalizacja | Tekst | Problematyczne słowo |
|-------------|-------|---------------------|
| CMS media panel | „Media demo można w każdej chwili podmienić…” | demo, system |
| Social panel | „integracja automatyczna w przygotowaniu” | integracja, API |
| Sponsor seed | „Partner techniczny — serwis autobusu drużyny” | brzmi jak CRM |
| News AI form | „Publikacja wymaga zatwierdzenia administratora” | workflow SaaS |
| Footer (prod) | FC OS attribution | OK — product, nie klub |

---

## FAZA 5 — PIORUN BRAND CONTENT GUIDE

Pełny dokument: [`piorun-brand-content-guide.md`](./piorun-brand-content-guide.md)

Sekcje 1–7 gotowe:

1. Kim jest Piorun Wawrzeńczyce  
2. Styl komunikacji  
3. Jak pisać aktualności  
4. Jak pisać o akademii  
5. Jak pisać o meczach  
6. Jak prezentować sponsorów  
7. Jak prezentować społeczność klubu  

---

## FAZA 6 — Quick Wins (< 1 h każdy)

| # | Zmiana | Czas | Efekt |
|---|--------|------|-------|
| 1 | Uruchomić `import-piorun-facebook.mjs` + deploy plików | 15 min | Wszystkie sloty demo → prawdziwe foty FB |
| 2 | Upload **logo** herbu z FB w `/website/branding` | 10 min | Koniec monogramu PW |
| 3 | Upload **cover** (zdjęcie boiska z FB) jako Grafika hero | 10 min | Nagłówek = prawdziwy klub |
| 4 | Zaktualizować **telefon** na +48 663 595 991 (jeśli seed nadpisany) | 5 min | Kontakt zgodny z FB |
| 5 | **Usunąć / zdraftować** 7 fikcyjnych newsów (Orzeł, transfer demo) | 20 min | Koniec fake news |
| 6 | **Opublikować** 3–5 postów skopiowanych z FB (treść + daty) | 45 min | Feed = prawdziwy klub |
| 7 | Wyłączyć **fake social** (Instagram/TikTok/YouTube) w `/website/social` | 10 min | Brak martwych linków |
| 8 | Podmienić **hero_subtitle** na hasło klubowe (już w migracji) | 5 min | Spójność z FB |
| 9 | Ukryć sponsorów demo (`show_on_website=false`) do czasu realnych | 15 min | Koniec Budmax na stronie |
| 10 | Poprawić **adres** kontaktowy na prawdziwy (boisko Wawrzeńczyce) | 10 min | Zaufanie lokalnych kibiców |

---

## Rekomendowany następny krok

1. **P1 z backlogu** (media + treści krytyczne) — ~1 dzień pracy redaktora  
2. **Import FB** — natychmiast, bez kodu  
3. **Sprint 2 (osobny)** — poprawki UX CMS z backlogu P2  

---

## Załączniki

| Dokument | Opis |
|----------|------|
| [`piorun-visual-dna.md`](./piorun-visual-dna.md) | Analiza wizualna FB |
| [`piorun-brand-content-guide.md`](./piorun-brand-content-guide.md) | Przewodnik redaktora |
| [`content-backlog.md`](./content-backlog.md) | Backlog P1/P2/P3 |

---

*Audyt wykonany bez commita i deployu — zgodnie z zasadą sprintu.*
