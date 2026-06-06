# CONTENT BACKLOG — Piorun Wawrzeńczyce

**Powstało z:** Real Content Sprint (31.05.2026)  
**Zasada:** treść i media only — bez nowych modułów w tym backlogu  
**Legenda:** P1 = natychmiast · P2 = ten tydzień · P3 = po wypełnieniu P1

---

## P1 — Krytyczne (użytkownik musi zobaczyć prawdziwy klub)

### Media

| ID | Zadanie | Właściciel | Szacunek | Status |
|----|---------|------------|----------|--------|
| M-01 | Uruchomić `node scripts/import-piorun-facebook.mjs` — podmiana 25 plików w `public/club-media/` | Dev + deploy plików | 30 min | 🔴 |
| M-02 | Upload **logo** klubu (herb z FB) → `/website/branding` | Redaktor | 10 min | 🔴 |
| M-03 | Upload **cover/okładka** (boisko lub drużyna z FB) → Grafika hero | Redaktor | 10 min | 🔴 |
| M-04 | Podmiana zdjęć **7 drużyn** (po 1 realnym group photo) → `/website/media` → Drużyny | Redaktor | 45 min | 🔴 |
| M-05 | Podmiana **3 slotów akademii** (dzieci, trening, ścieżka) | Redaktor | 20 min | 🔴 |
| M-06 | **8 zdjęć galerii homepage** — unikalne, nie powielone | Redaktor | 30 min | 🔴 |
| M-07 | Naprawić **galerię /galeria** — upload realnych zdjęć do 4 albumów | Redaktor | 60 min | 🔴 |

### Treści

| ID | Zadanie | Właściciel | Szacunek | Status |
|----|---------|------------|----------|--------|
| T-01 | Usunąć/zdraftować **7 fikcyjnych newsów** (KS Orzeł, transfer demo, remont…) | Redaktor | 20 min | 🔴 |
| T-02 | Dodać **min. 5 wpisów z FB** (copy + daty + kategoria) | Redaktor | 45 min | 🔴 |
| T-03 | Telefon kontaktowy **+48 663 595 991** — weryfikacja w branding | Redaktor | 5 min | 🟡 częściowo w migracji |
| T-04 | Prawdziwy **adres boiska** zamiast „ul. Sportowa 1” | Zarząd klubu | 10 min | 🔴 |
| T-05 | Wyłączyć **fake profile social** (IG/TikTok/YT jeśli nie istnieją) | Redaktor | 10 min | 🔴 |
| T-06 | Ukryć **sponsorów demo** (Budmax, AutoSerwis…) do czasu realnych partnerów | Admin CRM | 15 min | 🔴 |
| T-07 | Hasło: **„Od Skrzata do Seniora — jedna rodzina, jeden klub”** — weryfikacja hero | Redaktor | 5 min | 🟡 w migracji |

### UX (tylko treść/copy — bez dev)

| ID | Zadanie | Właściciel | Szacunek | Status |
|----|---------|------------|----------|--------|
| U-01 | Dokumentacja dla redaktora: **„Dwie galerie — która gdzie”** (1 strona PDF/Notion) | Product | 30 min | 🔴 |
| U-02 | Zmienić copy w CMS z „Media demo” na **„Zdjęcie zastępcze — wgraj własne”** *(wymaga dev — odłożyć do P2 jeśli strict no-code)* | Dev | 15 min | 🟡 odłożone |

---

## P2 — Wysokie (profesjonalizm i spójność)

### Media

| ID | Zadanie | Właściciel | Szacunek |
|----|---------|------------|----------|
| M-08 | Sesja foto: **każda grupa wiekowa** osobno (Skrzaty–Seniorzy) | Klub | 2–3 h |
| M-09 | **10+ unikalnych** zdjęć meczowych (nie te same co cover) | Klub | ongoing |
| M-10 | Logo i banery **prawdziwych sponsorów** | Zarząd + grafik | 1 h |
| M-11 | Odświeżyć URL-e w `import-piorun-facebook.mjs` (CDN expiry) | Dev | 30 min |

### Treści

| ID | Zadanie | Właściciel | Szacunek |
|----|---------|------------|----------|
| T-08 | Opisy **6 grup akademii** — ciepły język (Brand Guide §4) | Redaktor | 45 min |
| T-09 | **Podziękowania sponsorom** — osobne wpisy z realnymi nazwami | Redaktor | 30 min |
| T-10 | Relacje meczowe z **prawdziwymi wynikami** (import ligi / ręcznie) | Redaktor | ongoing |
| T-11 | Strona **O klubie** — historia, zarząd, misja (jeśli istnieje route) | Redaktor | 60 min |
| T-12 | Zweryfikować **e-mail kontaktowy** — działająca skrzynka | Zarząd | 15 min |
| T-13 | SEO title/description — **po polsku, bez żargonu** | Redaktor | 20 min |

### UX gaps (wymagają dev — zgłoszone, nie wdrożone)

| ID | Zadanie | Szacunek dev |
|----|---------|--------------|
| U-03 | Osobna sekcja **„Okładka strony”** w CMS mediów | 2 h |
| U-04 | **Podgląd** logo + cover przed uploadem | 2 h |
| U-05 | Wyjaśnienie **homepage galeria vs /galeria** w UI | 1 h |
| U-06 | Kontrola **„Przypiętego posta”** (wybór wpisu) | 3 h |
| U-07 | Ukryć/degradować **„Generuj AI”** dla roli redaktora klubu | 1 h |
| U-08 | Usuwanie zdjęć z **albumów galerii** w panelu | 2 h |

---

## P3 — Po wypełnieniu P1 (dopracowanie)

### Media

| ID | Zadanie |
|----|---------|
| M-12 | Wideo z meczów (Reels FB → embed lub link) |
| M-13 | Zdjęcia **kibiców i wydarzeń** (min. 15 do archiwum) |
| M-14 | Aktualizacja zdjęć **co sezon** (procedura w Brand Guide) |

### Treści

| ID | Zadanie |
|----|---------|
| T-14 | Archiwum aktualności — **min. 20 wpisów** z ostatniego roku |
| T-15 | Komunikat **zapisy do akademii** — stały wpis przypięty |
| T-16 | **FAQ rodziców** (treningi, opłaty, kontakt) |
| T-17 | Profile **trenerów** — krótkie bio + zdjęcie |
| T-18 | Kalendarz **wydarzeń klubowych** (dni otwarte, turnieje) |

### UX / jakość

| ID | Zadanie |
|----|---------|
| U-09 | Drag & drop kolejności galerii |
| U-10 | Ukrycie pól SEO za **„Zaawansowane”** |
| U-11 | Edycja podpisów albumów po utworzeniu |
| U-12 | Komunikat RBAC dla trenera: „Edytujesz tylko swoją drużynę” |

---

## Macierz zależności

```
M-01 (import FB) ──→ M-02, M-03, M-04, M-05, M-06
T-01 (usuń fake news) ──→ T-02 (dodaj realne)
T-06 (ukryj demo sponsorów) ──→ T-09 (prawdziwi sponsorzy)
M-07 (/galeria upload) ──→ T-10 (relacje z fotami)
```

---

## Definition of Done — „Prawdziwy klub na stronie”

Sprint uznajemy za zakończony gdy:

- [ ] **0%** stock Unsplash na stronie głównej
- [ ] Logo = herb Pioruna (nie monogram PW)
- [ ] Cover = boisko/drużyna z Wawrzeńczyce
- [ ] **≥ 5** aktualności z prawdziwą treścią (FB lub relacje)
- [ ] **0** fikcyjnych newsów (Orzeł, transfer demo)
- [ ] Telefon = +48 663 595 991
- [ ] Sponsorzy = tylko realni partnerzy lub sekcja ukryta
- [ ] Social = tylko aktywne profile (FB minimum)

---

## Szacunek łączny

| Priorytet | Zadania | Czas redaktora | Czas dev |
|-----------|---------|----------------|----------|
| **P1** | 14 | ~4–5 h | ~30 min (import + deploy) |
| **P2** | 16 | ~6 h | ~12 h (UX — osobny sprint) |
| **P3** | 12 | ongoing | opcjonalnie |

---

*Powiązane:* [`real-content-sprint-report.md`](./real-content-sprint-report.md) · [`piorun-brand-content-guide.md`](./piorun-brand-content-guide.md)
