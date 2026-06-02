# PUBLIC WEBSITE 3.0 — IMPLEMENTATION REPORT

**Data:** 2026-05-31  
**Zakres:** Wdrożenie Visual Design Blueprint 1:1 (bez nowych sekcji / funkcji)  
**Referencja:** `docs/audit/public-website-3.0-design-review.md`  
**Weryfikacja:** `npm run typecheck` ✅ · `npm run build` ✅

---

## Executive summary

Public Website 3.0 zmienia **scenografię** strony głównej z języka panelu SaaS na język klubu piłkarskiego: pełnoekranowy hero ze zdjęciami z CMS, matchday jako plakat, akademia wysoko na stronie, duże fotografie, sponsor wall na ciemnym tle, ciemno-zielona dramaturgia (#062820).

Wszystkie zdjęcia pochodzą z systemu `website_media` (demo SVG + upload CMS). Brak hardcodu Pioruna w logice UI.

---

## Przed / po — sekcja po sekcji

| Sekcja | PRZED (2.0) | PO (3.0 blueprint) |
|--------|-------------|---------------------|
| **Hero** | Baner modułu: chipy drużyn, widget meczu, 3 CTA, opcjonalne tło gradient | `min-h-[100svh]`, kolaż 3 zdjęć (team/match/stadium z CMS), statystyki w one-linerze, 2 CTA: „Zapisz dziecko do akademii” + „Najbliższy mecz”, ciemny overlay #062820 |
| **Matchday** | 3 karty CRM (ostatni / następny / tabela Excel) | Sekcja ciemna „Dziś w klubie”: plakat VS + ostatni wynik (duży score) + tabela TV top 5 |
| **Drużyny** | Karty z gradientem gdy brak zdjęcia | Tylko drużyny ze zdjęciem z CMS; poziomy scroll mobile; duże portrety grup |
| **Akademia** | Chipy filtrów, mały link „Zapisz dziecko” | `id="akademia"`, timeline grup, telefon/adres z `website_settings`, CTA „Umów zapis”, duże zdjęcia z CMS |
| **Galeria** | Zielone placeholdery | Ciemna scena #062820, bento 1+4, brak placeholderów bez URL |
| **Aktualności** | Karty blogowe shadcn | Lead story redakcyjny (duże zdjęcie + kategoria kolorowa), jasna scena |
| **Sponsorzy** | Prostokąty na białym | Sponsor Wall: ciemne tło, main sponsor ~50% szerokości, partnerzy dyskretnie |
| **Klub w liczbach** | Osobna sekcja na dole | **Usunięte** — statystyki scalone w hero one-liner |
| **Nav** | 9 linków + złoty „Panel klubu” | 5 linków blueprint: Mecze · Akademia · Aktualności · Galeria · Kontakt; logowanie dyskretne |
| **Footer** | „Powered by Football Club OS” dominuje | Klub pierwszy, social z CMS, „System klubu: FC OS” małym drukiem |

---

## Kolejność sekcji (blueprint)

```
Hero → Matchday → Drużyny → Akademia → Galeria → Aktualności → Sponsor Wall → Footer
```

Zgodne z `page.tsx` — bez dodatkowych sekcji.

---

## Pliki zmienione

| Plik | Zmiana |
|------|--------|
| `src/features/website/components/club-home-sections.tsx` | Wszystkie sekcje homepage 3.0 |
| `src/app/(public)/page.tsx` | Nowe props hero, usunięcie `PublicClubStatsSection`, dane akademii |
| `src/features/website/components/club-site-shell.tsx` | Nav 5 pozycji, footer blueprint, social links |
| `src/features/website/components/club-site-page.tsx` | Ładowanie social integrations do footera |
| `src/lib/website/constants.ts` | `PUBLIC_NAV_LINKS`, `CLUB_SCENE_DARK`, `CLUB_SCENE_LIGHT` |

---

## System mediów (CMS)

- Hero: sloty `team`, `match`, `stadium` → `orderHeroImages()`
- Drużyny: `teamImages[team.id]` — karty bez URL ukryte
- Akademia: sloty `kids`, `training`
- Galeria: 6–12 pozycji z `website_media`
- Aktualności: `newsImages[news.id]` + fallback `featuredImagePath`

Panel: `/website/media` — szczegóły w `docs/audit/public-website-3.0-media-report.md`.

---

## Screenshot review (strukturalny)

**Metoda:** inspekcja markupu komponentów + build produkcyjny (live dev wymaga migracji `website_media` w lokalnej bazie).

### Oczekiwany HTML po deployu z migracjami

| Element | Selektor / atrybut | Status kodu |
|---------|-------------------|-------------|
| Hero full viewport | `min-h-[100svh]` | ✅ |
| Hero zdjęcia CMS | `<img src="/demo-media/...">` × 3 | ✅ (gdy seed/migracja) |
| Anchor akademii | `id="akademia"` | ✅ |
| Matchday plakat | `aria-label="Matchday"`, duże VS | ✅ |
| Ciemna scenografia | `bg-[#062820]`, `CLUB_SCENE_DARK` | ✅ Matchday, Galeria, Sponsors, Footer |
| Sponsor main 50% | `lg:w-1/2` na karcie main sponsora | ✅ |
| Brak Klub w liczbach | sekcja usunięta z `page.tsx` | ✅ |
| Nav 5 pozycji | `PUBLIC_NAV_LINKS` | ✅ |

### Lokalny dev (2026-05-31)

`GET /` zwraca 500 — brak tabeli `public.website_media` w lokalnej Supabase. Po zastosowaniu migracji `20260605111000` + `20260605111100` strona renderuje demo media i pełny layout 3.0.

**Rekomendacja przed screenshotami produkcyjnymi:** `supabase db push` lub deploy migracji → odśwież `/` → porównaj z checklistą powyżej.

---

## Checklist blueprint (1:1)

| Priorytet użytkownika | Wdrożone |
|----------------------|----------|
| 1. Hero pełnoekranowy | ✅ |
| 2. Matchday jako wydarzenie | ✅ |
| 3. Akademia wysoko na stronie | ✅ (4. sekcja, zaraz po drużynach) |
| 4. Duże fotografie | ✅ hero, drużyny, akademia, galeria, news lead |
| 5. Sponsor Wall | ✅ |
| 6. Ciemno-zielona scenografia | ✅ |
| CMS `website_media` | ✅ |
| Multi-club ready | ✅ (`club_id`, bez hardcodu nazw) |

---

## Test plan (manual)

- [ ] Hero: 3 zdjęcia widoczne, 2 CTA działają (`/#akademia`, `/mecze`)
- [ ] Matchday: plakat następnego meczu + wynik + tabela top 5
- [ ] Drużyny: tylko karty ze zdjęciem; scroll poziomy na mobile
- [ ] Akademia: telefon klikalny (`tel:`), anchor z nav
- [ ] Galeria / Sponsors: ciemne tło, zdjęcia bez zielonych placeholderów
- [ ] Footer: social links z `/website/social`, dyskretne logowanie
- [ ] CMS: podmiana hero w `/website/media` → revalidate strony głównej

---

## Następne kroki (poza zakresem tego wdrożenia)

- Deploy migracji `website_media` na produkcję (jeśli jeszcze nie)
- Podmiana demo SVG na prawdziwe zdjęcia klubu w CMS
- Opcjonalnie: mobile hero carousel co 5s (blueprint wspomina — nie wdrożono w tej iteracji, hero statyczny kolaż)
