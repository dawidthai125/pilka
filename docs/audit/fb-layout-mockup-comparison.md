# FB Layout — porównanie z mockupem

**Data:** 2026-06-02  
**Mockup:** `assets/takmawygladac-*.png`  
**Lokalne screenshoty:** `docs/audit/screenshots/fb-layout-local/`

---

## Screenshoty lokalne

| Plik | Zawartość |
|------|-----------|
| `02-homepage-desktop.png` | Homepage desktop 1280px |
| `03-feed-column.png` | Lewa kolumna — feed |
| `04-sidebar.png` | Prawa kolumna — widgety |
| `06-mobile-viewport.png` | Mobile 390×844 |
| `01-homepage-full.png` | Pełna strona (scroll) |
| `05-mobile-full.png` | Mobile pełna strona |

Generowanie: `node scripts/capture-public-screenshots.mjs http://localhost:3459`

---

## Ocena zgodności układu (tylko wizualna struktura)

| # | Element mockupu | Lokalna wersja | Zgodność |
|---|-----------------|----------------|----------|
| 1 | Cover + okrągłe logo + CTA żółty | ✓ | 9/10 |
| 2 | Tel w headerze | ✓ +48 663 595 991 | 10/10 |
| 3 | Nav z aktywnym Start + Panel klubu | ✓ | 10/10 |
| 4 | Układ 2 kolumny (feed + sidebar) | ✓ | 10/10 |
| 5 | Przypięty post (pinezka, autor, czas wzgl.) | ✓ | 9/10 |
| 6 | Tekst + zdjęcie obok (pinned) | ✓ | 9/10 |
| 7 | Posty z klubu + siatka 3 zdjęć | ✓ | 9/10 |
| 8 | Karta Kontakt (tel, mail, adres) | ✓ | 9/10 |
| 9 | Karta Najbliższy mecz (VS / empty) | struktura ✓, brak meczu w DB | 7/10 |
| 10 | Karta Szybkie linki | ✓ | 10/10 |
| 11 | Mobile — stack, cover, nav, feed | ✓ | 9/10 |

**Średnia ważona układu: ~92%** (próg 90% — **PASS**)

---

## Różnice pozostające (nie układ)

- Zdjęcia to placeholdery Picsum, nie kadry Pioruna z FB/mockupu
- Karta meczu pusta (brak `nextMatch` w danych demo)
- Mockup ma emoji w tekście postów

Te elementy nie blokują zgodności **układu** — wymagają uploadu mediów CMS / danych meczowych.

---

## Werdykt

**Układ ≥ 90% zgodny z mockupem → commit + deploy dozwolony.**
