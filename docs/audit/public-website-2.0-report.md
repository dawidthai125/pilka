# PUBLIC WEBSITE 2.0 REPORT

**Projekt:** Football Club OS — Public Website 2.0  
**Klub referencyjny:** Piorun Wawrzeńczyce  
**Data:** 2026-06-02  
**Zakres:** Strona publiczna `/` (multi-club SaaS)

---

## 1. Przed / Po

### PRZED

```
┌─────────────────────────────────────┐
│ Hero — duża pusta przestrzeń        │
│ Tytuł + 2 CTA                       │
├─────────────────────────────────────┤
│ 2 karty meczu (osobna sekcja)       │
│ Aktualności — proste karty tekstowe │
│ Sponsorzy — pasek nazw              │
│ Tabela — pełna sekcja               │
│ Statystyki — tylko seniorzy         │
│ Galeria — gradient bez zdjęć        │
│ CTA „Kadra drużyny”                 │
└─────────────────────────────────────┘
```

- Skupienie na **jednej drużynie seniorów**
- Brak sekcji akademii / wielu grup wiekowych
- Hero z dużym paddingiem, słabe wykorzystanie zdjęcia
- Mecze: ryzyko `00:00` bez danych
- Hardcoded monogram **„PW”** w headerze

### PO

```
┌─────────────────────────────────────┐
│ HERO 2.0 — kompaktowy, zdjęcie      │
│ Logo + nazwa + slogan + chipy drużyn│
│ Najbliższy mecz + 3 CTA             │
├─────────────────────────────────────┤
│ CENTRUM MECZOWE                     │
│ Ostatni | Następny | Tabela (top 6) │
├─────────────────────────────────────┤
│ NASZE DRUŻYNY — karty wszystkich    │
├─────────────────────────────────────┤
│ AKADEMIA — ścieżka rozwoju + CTA    │
├─────────────────────────────────────┤
│ GALERIA — grid ze zdjęciami         │
├─────────────────────────────────────┤
│ AKTUALNOŚCI — portal sportowy       │
├─────────────────────────────────────┤
│ SPONSORZY — 3 poziomy tierów        │
├─────────────────────────────────────┤
│ KLUB W LICZBACH — statystyki dynamic│
└─────────────────────────────────────┘
```

| Metryka | Przed | Po |
|---------|-------|-----|
| Route `/` size | 195 B | 846 B |
| First Load JS | 112 kB | 113 kB |
| Sekcje homepage | 7 | **9** |
| Widoczność wielu drużyn | ❌ | ✅ |
| Empty states meczów | „Brak danych” | Estetyczne placeholdery |

---

## 2. Inspiracje z identyfikacji Pioruna

Analiza profilu [Piorun Wawrzeńczyce (Facebook)](https://www.facebook.com/profile.php?id=61560486822886):

| Element marki | Jak przeniesiono na stronę |
|---------------|----------------------------|
| **Kolory klubu** (zielony + złoty) | `website_settings` → CSS vars `--club-primary`, `--club-secondary` |
| **Energia i lokalność** | Hero z hasłem klubu, chipy drużyn, sekcja „Klub w liczbach” |
| **Mecze jako wydarzenia** | Centrum meczowe z wyróżnionym następnym spotkaniem |
| **Zdjęcia z boiska / drużyny** | Hero image + galeria z coverami z CMS |
| **Akademia młodzieżowa** | Osobna sekcja + ścieżka grup wiekowych z `teams` + `academy_groups` |
| **Społeczność** | CTA „Dołącz do klubu”, kontakt dla zapisów do akademii |

**Nie kopiujemy Facebooka** — layout jest własny (portal klubowy FC OS), ale charakter marki (aktywność, młodzież, mecze, lokalność) jest widoczny.

---

## 3. Jak pokazano seniorów i akademię

| Mechanizm | Źródło danych |
|-----------|---------------|
| **Chipy drużyn w Hero** | `getPublicTeams()` — wszystkie aktywne `teams` |
| **Sekcja „Nasze drużyny”** | Karty: nazwa, sezon, liczba zawodników, trener, opis z `academy_groups` |
| **Sekcja „Akademia”** | Sortowanie drużyn po `category` (u10 → seniors), bez hardcodowanych nazw |
| **Linki** | Seniorzy → `/druzyna`, młodzież → `/kontakt` (zapisy) |

Dla Pioruna widoczne m.in.: Skrzaty, Żaki, Orliki, Młodziki, Trampkarze, Juniorzy, Seniorzy — **z bazy**, nie z kodu.

---

## 4. Jak przygotowano architekturę SaaS

| Zasada | Implementacja |
|--------|---------------|
| Brak hardcodu klubu | `resolvePublicClubId(slug)` + `siteConfig.defaultClubSlug` |
| Kolory / logo / hero | `website_settings` + signed URLs (`getWebsiteAssetUrl`) |
| Sponsorzy | `get_public_sponsors` RPC, tier `main` / `supporting` / `partner` |
| Galeria | `website_gallery_albums` + cover paths |
| Drużyny | Nowy RPC `get_public_teams` (+ fallback `teams` SELECT) |
| Statystyki klubu | Nowy RPC `get_public_club_stats` (+ fallback counts) |
| Monogram header | `ClubLogo` — inicjały z `clubName`, nie „PW” |

**Nowe pliki:**

- `supabase/migrations/20260603103000_public_website_v2.sql`
- `src/lib/website/match-display.ts`
- Typy: `PublicTeamCard`, `PublicClubStats`, `PublicGalleryPreviewItem`, `PublicNewsPreviewItem`

**Komponenty:** `club-home-sections.tsx` — 9 sekcji Public Website 2.0

---

## 5. Co zobaczy użytkownik w pierwszych 5 sekundach

1. **To jest klub piłkarski** — hero z logo, nazwą, kolorystyką, etykietą „Klub piłkarski”
2. **Klub jest aktywny** — najbliższy mecz w hero + centrum meczowe
3. **Działa akademia** — chipy drużyn (Skrzaty…Seniorzy) od razu pod tytułem
4. **Są drużyny dziecięce i młodzieżowe** — widoczne w chipach i sekcji drużyn
5. **Są mecze** — kafel „Najbliższy mecz” + centrum meczowe
6. **Profesjonalizm** — layout portalu sportowego, sponsorzy tierowi, statystyki
7. **Społeczność lokalna** — CTA kontakt / dołącz, galeria, aktualności ze zdjęciami

---

## 6. Największe zmiany UX/UI

| # | Zmiana | Wpływ |
|---|--------|-------|
| 1 | **Hero 2.0** — mniejszy padding, zdjęcie full-bleed, mecz inline | Szybsze „first impression”, mniej pustej przestrzeni |
| 2 | **Centrum meczowe** — 3 kolumny (ostatni / następny / tabela) | Jeden punkt wejścia do wyników i tabeli |
| 3 | **Empty states** — brak `undefined`, `null`, `00:00` | Profesjonalny wygląd przy braku danych |
| 4 | **Nasze drużyny** | Klub = wiele grup, nie tylko seniorzy |
| 5 | **Akademia + CTA rodzica** | Konwersja zapisów młodzieży |
| 6 | **Aktualności portalowe** | Wyróżniony artykuł + miniatury |
| 7 | **Galeria grid** | Prawdziwe cover zdjęcia z albumów CMS |
| 8 | **Sponsorzy tierowi** | Main / supporting / partner |
| 9 | **Mobile first** | Grid 1→2→3/4 kolumn, horizontal nav, min-h-11 CTA |
| 10 | **ClubLogo w headerze** | Multi-club — inicjały z nazwy klubu |

---

## Weryfikacja techniczna (FAZA 10)

| Test | Wynik |
|------|-------|
| `npm run typecheck` | ✅ PASS |
| `npm run build` | ✅ PASS (149 tras) |
| Route `/` | 846 B / 113 kB First Load JS |

### Wymagane na produkcji

Migracja DB: `20260603103000_public_website_v2.sql` (RPC `get_public_teams`, `get_public_club_stats`) — bez niej działa fallback (teams bez liczby zawodników/trenerów).

---

## Werdykt

✅ **Public Website 2.0 — GOTOWE** (kod + build)

Strona publiczna prezentuje **cały klub** w modelu SaaS — dane z `clubs`, `website_settings`, `teams`, `sponsors`, `website_gallery_*`, `website_news`, `matches`.

**Nie rozpoczęto nowych etapów poza Public Website 2.0.**
