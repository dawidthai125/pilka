# VISUAL DIFF — Club Identity Sprint 15.10B

**Porównanie:** commit `5c1a19e` (przed) → `2bab268` (po)  
**Klub:** Piorun Wawrzeńczyce  
**Perspektywa:** użytkownik końcowy (bez opisu implementacji)

---

## Legenda

| Oznaczenie | Znaczenie |
|------------|-----------|
| ✅ **WIDOCZNA ZMIANA** | Użytkownik zauważy różnicę przy normalnym użyciu |
| ⚠️ **CZĘŚCIOWA** | Zmiana tylko w części ekranu, roli lub urządzenia |
| ➖ **BEZ ZMIAN** | Wygląd praktycznie identyczny |
| 🔵 **LOW IMPACT** | Zmiana techniczna lub poza główną ścieżką — mało widoczna |

---

## 1. Login (`/login`)

### Jak wyglądało PRZED

```
┌─────────────────────────────────────────┐
│           białe tło, cały ekran         │
│                                         │
│         ┌───────────────────┐           │
│         │    Logowanie      │           │
│         │ Zaloguj się do    │           │
│         │ Football Club OS  │  ← szara  │
│         │                   │    karta  │
│         │  [email]          │   shadcn  │
│         │  [hasło]          │           │
│         │  [Zaloguj się]    │  ← czarny │
│         └───────────────────┘    przycisk│
│                                         │
└─────────────────────────────────────────┘
```

- Brak logo klubu, brak kolorów Pioruna.
- Dominujący komunikat: **Football Club OS**.
- Wygląd jak generyczna aplikacja SaaS.

### Jak wygląda TERAZ

**Desktop (≥ lg):**

```
┌──────────────────────┬──────────────────────┐
│  CIEMNOZIELONY PANEL │   biały panel        │
│  (#0B3D2E)          │                      │
│                      │   ┌──────────────┐   │
│  [LOGO / PW]         │   │  Logowanie   │   │
│  Panel klubowy       │   │  Wprowadź    │   │
│  Panel Pioruna       │   │  dane konta… │   │
│  Wawrzeńczyce        │   │  [email]     │   │
│                      │   │  [hasło]     │   │
│  GLKS Mietków        │   │ [Zaloguj]    │← │
│  (jeśli różni się)   │   └──────────────┘   │
│                      │      zielony przycisk│
│  opis klubu…         │                      │
│  Wróć na stronę →    │                      │
└──────────────────────┴──────────────────────┘
```

**Mobile:**

```
┌─────────────────────────────┐
│ zielony pasek: [PW] Panel   │
│ Pioruna Wawrzeńczyce        │
├─────────────────────────────┤
│      karta logowania        │
│      (jak wcześniej,        │
│       ale zielony CTA)      │
└─────────────────────────────┘
```

### Elementy, które FAKTYCZNIE zmieniły wygląd

| Element | PRZED | TERAZ | Wpływ |
|---------|-------|-------|-------|
| Tło ekranu | Białe | Zielony panel klubu (desktop) + zielony header (mobile) | ✅ WIDOCZNA |
| Główny tytuł | „Football Club OS” | **„Panel Pioruna Wawrzeńczyce”** | ✅ WIDOCZNA |
| Logo | Brak | Herb z CMS lub monogram **PW** (złote koło) | ✅ WIDOCZNA |
| Przycisk „Zaloguj się” | Czarny/szary | **Zielony klubu** | ✅ WIDOCZNA |
| Opis pod tytułem | FCOS | „Wprowadź dane swojego konta klubowego.” | ✅ WIDOCZNA |
| Link powrotu | Brak | „Wróć na stronę klubu” | ⚠️ CZĘŚCIOWA |

### Elementy nadal wyglądające IDENTYCZNIE

| Element | Uwagi |
|---------|-------|
| Układ pól formularza (email, hasło) | Ta sama karta, te same pola |
| Linki „Zarejestruj się” / „Przypomnij hasło” | Bez zmian wizualnych |
| Komunikat błędu logowania | Czerwony banner — bez zmian |

---

## 2. Dashboard (`/dashboard`)

### Jak wyglądało PRZED

```
┌─ sidebar (biały) ─┬─ main ─────────────────────────┐
│ Piorun (label)    │ Dashboard                         │
│ Piorun Wawrzeńczyce│ Witaj… podsumowanie klubu        │
│                   │                                   │
│ szare menu        │ [szary baner mobile]              │
│                   │ Football Club OS                  │
│                   │                                   │
│                   │ Coach Day  ← angielski tytuł      │
│                   │ [6 białych kart shadcn]         │
│                   │                                   │
│                   │ [Klub][Drużyny][Uprawnienia]…     │
│                   │ szare outline przyciski           │
└───────────────────┴───────────────────────────────────┘
```

- Kolorystyka: **szaro-biała** (shadcn default).
- Brak logo na dashboardzie.
- Baner mobile: produkt **Football Club OS**, nie klub.

### Jak wygląda TERAZ

```
┌─ sidebar (ZIELONY) ─┬─ main ──────────────────────────┐
│ [PW] Piorun…        │ [LOGO] Dashboard               │
│                     │ Witaj… podsumowanie Pioruna…   │
│ złote aktywne menu  │                                │
│                     │ [zielony baner + LOGO]         │
│                     │ Piorun Wawrzeńczyce            │
│                     │                                │
│                     │ Dziś w klubie  ← polski       │
│                     │ [karty — layout jak wcześniej] │
│                     │                                │
│                     │ zielone primary / szare outline│
└─────────────────────┴────────────────────────────────┘
```

### Elementy, które FAKTYCZNIE zmieniły wygląd

| Element | PRZED | TERAZ | Wpływ |
|---------|-------|-------|-------|
| Baner mobile u góry | Szary gradient + „Football Club OS” | **Zielony gradient + nazwa klubu + logo** | ✅ WIDOCZNA (mobile) |
| Nagłówek sekcji trenera | **Coach Day** | **Dziś w klubie** | ✅ WIDOCZNA |
| Logo przy powitaniu | Brak | **Monogram/herb obok „Dashboard”** (≥ sm) | ⚠️ CZĘŚCIOWA (desktop/tablet) |
| Tekst powitania | „…podsumowanie klubu” | „…podsumowanie **Piorun Wawrzeńczyce**” | 🔵 LOW IMPACT |
| Przyciski primary (np. w kartach) | Czarne | **Zielone Pioruna** | ⚠️ CZĘŚCIOWA (gdzie użyty variant primary) |

### Elementy nadal wyglądające IDENTYCZNIE

| Element | Uwagi |
|---------|-------|
| Siatka kart statystyk (klub, drużyny, role, uprawnienia) | Ten sam układ, te same białe karty |
| Karty Coach Day / Dziś w klubie | **Ten sam układ 6 kart** — zmieniony tylko tytuł sekcji |
| Szybkie akcje (outline) | Nadal szare obramowanie |
| Szybkie akcje mobile (kafelki) | Ten sam grid 2×3 |
| Alert offline / dokumenty | Bez zmian wizualnych |

---

## 3. Sidebar (desktop, ≥ md)

### Jak wyglądało PRZED

```
┌─────────────────────┐
│ PIORUN  (szary caps)│  ← etykieta produktu
│ Piorun Wawrzeńczyce │
│ Nazwa oficjalna…    │
├─────────────────────┤
│ ■ Dashboard    ← cz│  aktywny: czarny/szary
│   Profil użytk.     │  tło na białym sidebarze
│   Communication Hub │
│   League Hub        │  ← angielskie nazwy
│   Injury & Medical  │
│   …                 │
└─────────────────────┘
  białe tło (bg-card)
```

### Jak wygląda TERAZ

```
┌─────────────────────┐
│ [PW] Piorun Wawrzeń │  ← logo + biały tekst
│      czyce          │     na zielonym tle
│ GLKS Mietków        │
├─────────────────────┤
│ ■ Dashboard    ← ZŁ│  aktywny: złoty pill
│   Komunikacja       │  nieaktywny: biały tekst
│   Rozgrywki         │  ← polskie nazwy
│   Urazy             │
│   …                 │
└─────────────────────┘
  ciemnozielone tło (#0B3D2E)
```

### Elementy, które FAKTYCZNIE zmieniły wygląd

| Element | PRZED | TERAZ | Wpływ |
|---------|-------|-------|-------|
| Tło sidebaru | Białe | **Ciemna zieleń klubu** | ✅ WIDOCZNA |
| Aktywna pozycja menu | Czarny/szary prostokąt | **Złoty (#F4C430) pill** | ✅ WIDOCZNA |
| Logo w nagłówku | Brak | **PW / herb** | ✅ WIDOCzNA |
| Etykieta „PIORUN” (caps) | Widoczna | **Usunięta** — zastąpiona logo + nazwą | ✅ WIDOCZNA |
| Nazwy modułów (6 pozycji) | EN (Hub, Center…) | **PL** (Komunikacja, Rozgrywki…) | ✅ WIDOCZNA |
| Tekst nieaktywnych pozycji | Szary na białym | **Biały/jasny na zielonym** | ✅ WIDOCZNA |

### Elementy nadal wyglądające IDENTYCZNIE

| Element | Uwagi |
|---------|-------|
| Liczba i kolejność pozycji menu | Bez zmian |
| Ikony Lucide przy pozycjach | Te same ikony |
| Pozycje nadal po angielsku (np. Club CRM, Equipment & Assets, AI Club Manager) | ➖ **BEZ ZMIAN** — tylko 6 etykiet spolonizowano |
| Szerokość sidebaru (~256 px) | Bez zmian |

---

## 4. Mobile (header + bottom nav + menu)

### Jak wyglądało PRZED

**Header:**
```
[≡]  Klub                    [🔔] [avatar]
     Piorun Wawrzeńczyce
```
- Hamburger otwiera **biały** sheet z szarym nagłówkiem „Piorun” + lista menu.

**Bottom nav:**
```
[Start][Mecze][Treningi][Frekwencja][Więcej]
   szary tekst, aktywny tab: ciemnoszary
   neutralny biały pasek
```

**Sheet „Więcej”:**
```
Football Club OS
Piorun Wawrzeńczyce
─────────────────
lista menu (szara aktywna)
```

### Jak wygląda TERAZ

**Header:**
```
[≡]  [PW]  Klub              [🔔] [avatar]
           Piorun…           (logo też na md+)
```
- Hamburger: **zielony nagłówek** sheetu + logo + nazwa klubu.

**Bottom nav:**
```
[Start][Mecze][Treningi][Frekwencja][Więcej]
   aktywny tab: ZIELONY (kolor klubu)
   delikatna zielona obwódka paska
```

**Sheet „Więcej”:**
```
[PW] Piorun Wawrzeńczyce
     Menu klubu
─────────────────
lista menu (zielona aktywna pozycja)
```

### Elementy, które FAKTYCZNIE zmieniły wygląd

| Element | PRZED | TERAZ | Wpływ |
|---------|-------|-------|-------|
| Logo w headerze mobile | Brak | **PW / herb** (md+: też w headerze) | ✅ WIDOCZNA |
| Aktywny tab dolny | Ciemnoszary | **Zielony klubu** | ✅ WIDOCZNA |
| Sheet hamburger — nagłówek | Biały + „Piorun” label | **Zielony + logo + nazwa klubu** | ✅ WIDOCZNA |
| Sheet „Więcej” — nagłówek | „Football Club OS” | **Nazwa klubu + „Menu klubu”** | ✅ WIDOCZNA |
| Baner role na dashboard (mobile) | FCOS | **Klub + logo** | ✅ WIDOCZNA |

### Elementy nadal wyglądające IDENTYCZNIE

| Element | Uwagi |
|---------|-------|
| Struktura bottom nav (4 taby + Więcej) | Bez zmian |
| Podwójne menu (hamburger + Więcej) | **Nadal dwa wejścia** — ten sam UX |
| Ikony tabów | Te same ikony Lucide |
| Wysokość paska (~56 px) | Bez zmian |
| Avatar i dzwonek powiadomień | Bez zmian |

### LOW IMPACT (mobile)

| Element | Uwagi |
|---------|-------|
| Etykieta „Content” → „Treści” (rola sponsor) | 🔵 Widoczne tylko sponsorowi w bottom nav |

---

## 5. Public website (`/`, `/aktualnosci`, …)

### Jak wyglądało PRZED

```
┌─────────────────────────────────────────┐
│ ZIELONY HEADER  [logo/PW] Piorun…       │  ← już zbrandowany
│ Terminarz | Aktualności | …  [Panel klubu]│
├─────────────────────────────────────────┤
│ HERO zielony + zdjęcie boiska           │
│ karty aktualności (białe, szare border) │
│ stopka zielona · Powered by FCOS       │
└─────────────────────────────────────────┘
```

Strona publiczna **już przed sprintem** używała kolorów Pioruna (`--club-primary`, `--club-secondary`).

### Jak wygląda TERAZ

```
┌─────────────────────────────────────────┐
│  IDENTYCZNY układ i kolory strony       │
│  publicznej — brak zmian w HTML/CSS     │
│  stron publicznych w tym commicie       │
└─────────────────────────────────────────┘
```

**Po kliknięciu „Panel klubu” → login:** użytkownik trafia na **nowy** ekran logowania (patrz sekcja 1) — to jedyna widoczna różnica w ścieżce public → app.

### Elementy, które FAKTYCZNIE zmieniły wygląd

| Element | Wpływ |
|---------|-------|
| Strona główna, aktualności, galeria, kontakt | ➖ **BEZ ZMIAN** |
| Header / footer / hero publiczny | ➖ **BEZ ZMIAN** |
| Przejście „Panel klubu” → login | ✅ WIDOCZNA (nowy login — sekcja 1) |

### LOW IMPACT (public / PWA — poza przeglądarką)

| Element | PRZED | TERAZ |
|---------|-------|-------|
| Ikona po „Dodaj do ekranu początkowego” | Zielone tło + symbol „+” / FCOS | Zielone tło + **PW** |
| Nazwa skrócona aplikacji (manifest) | FCOS | **Piorun** |
| Pełna nazwa PWA | Football Club OS | **Piorun Wawrzeńczyce** |

🔵 Widoczne dopiero na ekranie głównym telefonu — nie na stronie www w przeglądarce.

---

## Macierz wpływu — podsumowanie

| Obszar | Ocena wizualna | Największa różnica |
|--------|----------------|-------------------|
| **Login** | ✅ **WYSOKI** | Split-screen klubowy, logo, usunięcie FCOS |
| **Sidebar** | ✅ **WYSOKI** | Zielone tło + złote aktywne menu + logo |
| **Mobile chrome** | ✅ **ŚREDNI–WYSOKI** | Logo, zielony active tab, zielone sheety |
| **Dashboard treść** | ⚠️ **ŚREDNI** | Baner mobile, logo, tytuł „Dziś w klubie”; karty bez zmian layoutu |
| **Public website** | ➖ **BRAK** (strony) | Bez zmian; tylko login po CTA i ikona PWA |

---

## Co użytkownik zobaczy od razu vs co nie

### Zauważy od razu (pierwsze 10 sekund)

1. **Login** — zielony panel zamiast białego ekranu z FCOS  
2. **Sidebar** — ciemnozielony z złotym podświetleniem  
3. **Przyciski primary** — zielone zamiast czarnych  
4. **Mobile** — logo klubu w headerze i banerze  

### Prawdopodobnie nie zauważy

1. Karty statystyk na dashboardzie (ten sam wygląd)  
2. Układ Coach Day / Dziś w klubie (tylko nagłówek)  
3. Strona publiczna w przeglądarce  
4. Zmiana manifestu PWA (dopóki nie zainstaluje aplikacji)  
5. Spolonizowanie h1 wewnątrz modułów (Komunikacja, Wideo…) — widoczne dopiero po wejściu w moduł  

### Nadal wygląda jak „panel administracyjny”

- Białe karty shadcn w treści modułów  
- Tabele, formularze, CRM, AI — **neutralny UI bez rebrandingu wewnętrznych ekranów**  
- Część menu po angielsku (Club CRM, Equipment & Assets, AI Club Manager)  
- Karta „Uprawnienia aktywne” na dashboardzie  

---

## Werdykt VISUAL DIFF

Sprint **15.10B realnie zmienia pierwsze wrażenie** (login, chrome aplikacji, sidebar, mobile shell) i **spinaja wizualnie** panel ze stroną publiczną przez kolory Pioruna.

**Treść wewnętrzna modułów** (formularze, tabele, większość kart) pozostaje wizualnie **identyczna** z okresem przed sprintem.

**Strona publiczna** w przeglądarce: **identyczna**; zmiana odczuwalna dopiero przy logowaniu i instalacji PWA.

---

*Porównanie commitów `5c1a19e` → `2bab268`. Bez opisu kodu — wyłącznie efekt wizualny dla użytkownika.*
