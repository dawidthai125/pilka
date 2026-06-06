# Cover photo — analiza i poprawka

**Data:** 2026-06-02  
**Zakres:** wyłącznie okładka headera strony publicznej (bez nowych funkcji)

---

## 1. Skąd ładowany jest cover

| Krok | Plik | Co robiło |
|------|------|-----------|
| Layout publiczny | `src/app/(public)/layout.tsx` | Owija strony w `ClubSitePageWrapper` |
| Wrapper | `src/features/website/components/club-site-page.tsx` | **Hardcodował** `coverImageUrl={CLUB_COVER_IMAGE}` |
| Stała | `src/lib/website/constants.ts` | `CLUB_COVER_IMAGE = "/club-media/cover.jpg"` |
| Shell | `src/features/website/components/club-site-shell.tsx` | `<img src={cover} />` z fallbackiem na tę samą stałą |
| Plik | `public/club-media/cover.jpg` | Pobierany skryptem `npm run fetch:club-media` z **Picsum** (`seed/piorun-cover`) |

**CMS:** pole `website_settings.hero_image_path` istnieje w bazie i mapperze (`heroImagePath`), ale **nie było używane** do okładki FB-layoutu.

---

## 2. Dlaczego stock (koń / biurko / laptop)

Skrypt `scripts/fetch-club-demo-photos.mjs` używał:

```txt
https://picsum.photos/seed/piorun-cover/1600/900.jpg
```

Picsum zwraca **losowe zdjęcia spoza piłki nożnej** — seed tylko determinuje które, nie temat. Dla `cover` wylosowało biurko + laptop + konie na ekranie.

Produkcja serwowała ten plik bezpośrednio z `/club-media/cover.jpg`.

---

## 3. Fallbacki (przed poprawką)

1. `coverImageUrl` z wrappera → zawsze `/club-media/cover.jpg` (Picsum)
2. W shell: `coverImageUrl ?? CLUB_COVER_IMAGE` → ten sam plik
3. Brak gradientu, brak piłkarskich alternatyw, brak CMS

---

## 4. Wprowadzona poprawka

### Resolver okładki — `src/lib/website/cover-image.ts`

Kolejność:

1. **CMS** — `settings.heroImagePath` → signed URL z Supabase Storage  
2. **Demo piłkarskie** — `hero-stadium.jpg` → `hero-team.jpg` → `hero-match.jpg`  
3. **Gradient klubowy** — brak `<img>`, tylko gradient w kolorach `--club-primary`

Nigdy nie używamy `cover.jpg` ani losowego Picsum.

### Layout headera — `club-site-shell.tsx`

| Problem | Poprawka |
|---------|----------|
| Cover za wysoki (`h-64`) | `h-36 sm:h-40 md:h-44` |
| Nazwa klubu **na** zdjęciu (tekst zasłonięty) | Nazwa i CTA na **stałym pasku** `bg-[var(--club-primary)]` pod coverem; tylko logo nachodzi na zdjęcie (`-mt-10`) |
| Zły stock | Piłkarskie JPG z Unsplash w `public/club-media/` + skrypt fetch |

### Zmiany plików

- `src/lib/website/cover-image.ts` — nowy
- `src/features/website/components/club-site-page.tsx` — `resolvePublicCoverImageUrl()`
- `src/features/website/components/club-site-shell.tsx` — gradient fallback + layout
- `src/lib/website/constants.ts` — deprecated `cover.jpg`, dashboard też `hero-stadium`
- `src/lib/website/demo-media.ts` — unknown key → `hero-stadium.jpg` zamiast `placeholder.jpg`
- `scripts/fetch-club-demo-photos.mjs` — Unsplash (boisko/drużyna/stadion), nie Picsum
- `public/club-media/*.jpg` — podmienione na piłkarskie kadry

---

## 5. Screenshoty przed / po

| | Plik |
|---|------|
| **PRZED** (prod) | `docs/audit/screenshots/cover-fix/before-header.png` |
| **PO** (local build :3460) | `docs/audit/screenshots/cover-fix/after-header.png` |

**PRZED:** laptop + konie na ekranie, nazwa klubu zasłonięta przez cover.  
**PO:** boisko + piłka, nazwa na zielonym pasku pod okładką, logo nachodzi tylko częściowo.

Regeneracja:

```bash
node scripts/capture-cover-screenshot.mjs https://pilka-mu.vercel.app/ docs/audit/screenshots/cover-fix/before-header.png
npm run build && npm run start -- -p 3460
node scripts/capture-cover-screenshot.mjs http://localhost:3460 docs/audit/screenshots/cover-fix/after-header.png
```

---

## 6. Weryfikacja

```bash
npm run typecheck   # ✅
npm run build       # ✅
```

**Deploy:** wymaga commit + push (Vercel auto-deploy). Po wdrożeniu w CMS `/website/branding` można ustawić własne `hero_image_path` — ma pierwszeństwo nad demo.

---

*Football Club OS · Dawid Thai Thanh*
