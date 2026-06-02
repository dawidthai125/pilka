# Lista zaimportowanych materiałów — Piorun Wawrzeńczyce

**Import:** 31.05.2026 · `npm run import:facebook`  
**Katalog:** `public/club-media/`  
**Źródło:** [Facebook — Piorun Wawrzeńczyce](https://www.facebook.com/profile.php?id=61560486822886)

---

## Primary — pobrane z Facebooka (9 + logo)

| Plik | FB Media ID | Opis materiału | Użycie na stronie |
|------|-------------|----------------|-------------------|
| `cover.jpg` | `709844503` | Grafika klubowa / zapowiedź | Cover nagłówka (`hero_image_path`) |
| `club-logo.jpg` | *(profil)* | Avatar / herb strony FB | Logo w nagłówku (`logo_path`) |
| `hero-team.jpg` | `711680094` | Zapowiedź meczu młodzików (Silesia vs Cukrownik) | Slot hero „Drużyna” |
| `hero-match.jpg` | `711426046` | Grafika meczowa (VS layout) | Slot hero „Mecz” |
| `hero-stadium.jpg` | `707928973` | Boisko / otoczenie klubu | Slot hero „Stadion”, fallback cover |
| `team-seniors.jpg` | `709636527` | Drużyna / grafika meczowa seniorów | Slot drużyny Seniorzy |
| `team-u18.jpg` | `711406268` | Trampkarze — grafika meczowa | Slot Trampkarze / U18 |
| `team-u12.jpg` | `707946466` | Młodzicy — zapowiedź AP13 | Slot Młodziki / U12 |
| `team-youth.jpg` | `709448253` | Trampkarze — dzień meczowy | Slot młodzieżowy (Żaki, Orliki…) |
| `academy-kids.jpg` | `709680263` | Młodzi zawodnicy na boisku | Slot akademii „Dzieci” |

---

## Derived — skopiowane z primary (16)

Te pliki wskazują na te same piksele co primary (ograniczona pula ~9 unikalnych fotek na FB).

| Plik | Źródło | Slot CMS |
|------|--------|----------|
| `academy-training.jpg` | `team-seniors.jpg` | Akademia — trening |
| `academy-path.jpg` | `team-u18.jpg` | Akademia — ścieżka rozwoju |
| `news-matches.jpg` | `hero-team.jpg` | Aktualność — mecze |
| `news-club.jpg` | `hero-stadium.jpg` | Aktualność — klub |
| `news-academy.jpg` | `academy-kids.jpg` | Aktualność — akademia |
| `news-transfers.jpg` | `cover.jpg` | Aktualność — transfery |
| `news-sponsors.jpg` | `hero-match.jpg` | Aktualność — sponsorzy |
| `gallery-01.jpg` | `hero-team.jpg` | Galeria homepage + album mecze |
| `gallery-02.jpg` | `hero-match.jpg` | Galeria homepage + album mecze |
| `gallery-03.jpg` | `team-u18.jpg` | Galeria homepage + album mecze |
| `gallery-04.jpg` | `cover.jpg` | Galeria homepage |
| `gallery-05.jpg` | `team-seniors.jpg` | Galeria homepage |
| `gallery-06.jpg` | `academy-kids.jpg` | Galeria homepage + album treningi |
| `gallery-07.jpg` | `team-u12.jpg` | Galeria homepage |
| `gallery-08.jpg` | `team-youth.jpg` | Galeria homepage |
| `placeholder.jpg` | `hero-stadium.jpg` | Fallback systemowy |

---

## Mapowanie albumów galerii (`/galeria`)

| Album | Pliki | Podpisy |
|-------|-------|---------|
| **mecze-2026** | `gallery-01`, `gallery-02`, `gallery-03` | Zapowiedź młodzików, grafika ligowa, trampkarze |
| **treningi-zima** | `academy-training`, `academy-kids` | Trening drużyny, młodzi piłkarze |
| **zycie-klubu** | `team-seniors` | Drużyna na boisku |
| **turniej-spoleczny** | `team-youth`, `team-u12` | Młodzież, młodzicy |

---

## Powiązanie wpisów → zdjęcia wyróżniające

| Wpis | `demo_asset_key` |
|------|------------------|
| Przed nami kolejne wyzwanie! | `news-matches` |
| Trampkarze — Gwarek Wałbrzych | `news-sponsors` |
| Seniorzy — Sparta Pustków | `news-transfers` |
| Trampkarze — Zdrój Jedlina | `news-club` |
| Akademia — zapisy | `news-academy` |

---

## Statystyki

| Metryka | Wartość |
|---------|---------|
| Pliki JPG łącznie | **26** |
| Unikalne piksele FB | **~10** |
| Rozmiar łączny | ~280 KB |
| Stock Unsplash | **0** (zastąpione) |

---

## Ograniczenia importu

1. **Rozdzielczość** — przechwycone miniatury z feedu FB, nie oryginały 1080p. Do pełnej jakości: upload przez CMS.
2. **Powtarzalność** — FB publikuje ~10 unikalnych grafik; derived slots dzielą te same pliki.
3. **Wygaśnięcie CDN** — skrypt nie polega na stałych URL; przy każdym uruchomieniu ładuje profil na nowo.

---

*Powiązane:* [`p1-import-report.md`](./p1-import-report.md)
