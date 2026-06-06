# PUBLIC WEBSITE 3.0 — DESIGN REVIEW

**Projekt:** Football Club OS — strona publiczna klubu  
**Klub referencyjny:** Piorun Wawrzeńczyce  
**Data:** 2026-06-02  
**Status:** analiza i koncepcja — **bez implementacji**  
**Produkcja:** https://pilka-mu.vercel.app

---

> Ten dokument nie ocenia kodu. Ocenia **wrażenie**, **emocję** i **profesjonalizm** strony klubu piłkarskiego.

---

## Executive summary

Public Website 2.0 **dodało treść**, ale **nie zmieniło języka wizualnego**.

Strona nadal mówi językiem: *panel administracyjny z kolorowym motywem*.  
Nie językiem: *żyjący klub piłkarski, który gramy, trenujemy, wspieramy dzieci i gramy mecze w sobotę*.

Na produkcji (stan po 2.0) w HTML strony głównej **nie ma ani jednego zdjęcia** — zero tagów obrazu. Cała strona to gradienty, obramowane karty i tekst. Tymczasem Facebook Pioruna to **90% zdjęć z boiska, twarzy, emocji i meczu**.

To jest główny powód, dla którego właściciel mówi: *„wygląda praktycznie tak samo”*.

---

# ZADANIE 1 — Dlaczego po 2.0 strona „wygląda tak samo”?

## Brutalna prawda

Public Website 2.0 było ** reorganizacją sekcji**, nie ** redesignem tożsamości**.

| Co obiecano emocjonalnie | Co faktycznie zrobiono |
|--------------------------|-------------------------|
| „Portal sportowy” | Ten sam układ kart co wcześniej, tylko więcej sekcji |
| „Hero z zdjęciem drużyny” | Jedno opcjonalne tło + zielony gradient, jeśli CMS pusty — **pusty gradient** |
| „Galeria jak klub” | Placeholdery, jeśli brak coverów w CMS |
| „Profesjonalizm” | Profesjonalizm **danych**, nie **obrazu** |
| „Cały klub, nie tylko seniorzy” | Lista nazw drużyn w chipach — wygląda jak **filtry w aplikacji**, nie jak **akademia** |

## 7 prawdziwych problemów (nie wymówki)

### 1. Ten sam szablon wizualny co SaaS

Każda sekcja to ten sam schemat:

```
NAGŁÓWEK SEKCJI (uppercase, szary)
podtytuł (muted)
─────────────────────────────
[ karta ] [ karta ] [ karta ]
─────────────────────────────
„Zobacz więcej →”
```

To jest język **TeamSnap / panelu rodzica / CRM** — nie język **klubu, który chce Cię porwać emocją**.

### 2. Brak fotografii = brak klubu

Klub piłkarski **bez zdjęć** to nie klub — to **formularz kontaktowy w zielonym**.

Facebook Pioruna: zdjęcia drużyny przed meczem, dzieci w strojach, boisko, plakat meczowy.  
Strona prod: **0 zdjęć w HTML**. Użytkownik widzi interfejs, nie **ludzi**.

### 3. Hero nie jest „stroną klubu” — jest „banerem modułu”

Hero 2.0 to nadal:
- logo + etykieta „Klub piłkarski” (brzmi jak kategoria w CMS)
- chipy drużyn (wyglądają jak tagi filtrów)
- trzy przyciski obok siebie (Terminarz / Aktualności / Dołącz)
- boczny kafelek meczu (jak widget w dashboardzie)

**Brak:** jednego mocnego kadru, hasła z charakterem, napięcia meczowego, twarzy zawodników.

### 4. Kolory klubu są „malowane na” szary UI

Zielony i złoty są **tłem i akcentem na kartach shadcn** — białe tło, szare obramowania, szare podtytuły dominują.  
Kolorystyka Pioruna na Facebooku jest **immersyjna** (💚⚽, energia, mecz).  
Na stronie — **dekoracja interfejsu**.

### 5. Więcej sekcji ≠ lepsze wrażenie

Dodano: Centrum meczowe, Akademia, Klub w liczbach.  
Efekt: **dłuższy scroll tym samym językiem wizualnym**. Użytkownik nie czuje „wow” — czuje „więcej modułów”.

### 6. Akademia i rodzic są „na dole listy”, nie „w sercu marki”

Rodzic wchodzący na stronę widzi:
1. Hero (senior/mecz)
2. Centrum meczowe
3. Drużyny (karty gradientowe)
4. Dopiero potem Akademia

**W 5 sekund** rodzic **nie** czuje: *„tu zapiszę dziecko”*. Czuje: *„to strona klubu seniorów z dodatkiem statystyk”*.

### 7. Produkt FC OS przebija klub

- Header: „Panel klubu” (SaaS)
- Footer: „Powered by Football Club OS”
- Nawigacja: 9 pozycji jak w aplikacji (Tabela, Panel kibica…)

Właściciel klubu nie chce strony, która przypomina **hosting aplikacji** — chce strony, która przypomina **Pioruna**.

---

# ZADANIE 2 — 10 powodów, dla których wyglądamy mniej profesjonalnie

Porównanie z: TeamSnap, PlayMetrics, Spond, SportMember, nowoczesne akademie (np. La Masia style comms, lokalne kluby IV ligi z dobrą stroną), strony klubów profesjonalnych (chociaż niższa liga — **jakość foto i emocja**, nie budżet).

| # | Powód | U nas | U liderów / klubów |
|---|-------|-------|---------------------|
| **1** | **Fotografia jako fundament** | Gradienty, ikony, puste karty | Pełnoekranowe zdjęcia ludzi, meczu, boiska |
| **2** | **Typografia emocjonalna** | Jednolity sans-serif, ten sam rozmiar nagłówków | Duży display na hero, kontrast „gazeta sportowa” |
| **3** | **Hierarchia wizualna** | Wszystkie sekcje równorzędne | Jeden dominant (mecz / akademia / hero), reszta drugoplanowa |
| **4** | **Matchday jako wydarzenie** | Mecz = kafelek z datą | Mecz = plakat: herb, godzina, „vs”, countdown, link bilety/RSVP |
| **5** | **Akademia jako produkt** | Akapit tekstu + strzałki między nazwami | Zdjęcie dzieci + „Zapisz 2018–2019” + telefon trenera |
| **6** | **Sponsorzy jako prestiż** | Nazwy w prostokątach | Duży logo main sponsora na ciemnym tle, jak na koszulce |
| **7** | **Aktualności jak media** | Karty blogowe | Lead story + zdjęcie z boiska, kategoria „MŁODZIKI” |
| **8** | **Gęstość vs pustka** | Dużo białego, cienkie karty, dużo paddingu | Ciasne, redakcyjne układy — treść wypełnia ekran |
| **9** | **Tożsamość lokalna** | Ogólne „Klub piłkarski” | Wawrzeńczyce, Mietków, DZPN, „nasze boisko”, telefon |
| **10** | **Mobile first emocji** | Scroll przez 9 sekcji-szablonów | Hero + mecz + „Zapisz dziecko” w pierwszym ekranie |

---

# ZADANIE 3 — Analiza aktualnego ekranu (stan prod po 2.0)

*Opis oparty na live HTML + strukturze wizualnej strony — bez oglądania kodu.*

## Puste przestrzenie

| Miejsce | Problem |
|---------|---------|
| Między sekcjami | Identyczny rytm `py-10 / py-14` — monotonny oddech, jak raport PDF |
| Hero | Duży zielony blok bez zdjęcia — **pustka emocjonalna**, nie elegancja |
| Karty drużyn | Górna połowa karty to pusty gradient z ikoną ludzi |
| Galeria | Jeśli brak coverów — same zielone prostokąty |
| Tło strony | Biały/szary — **zero atmosfery boiska** |

## Słaba hierarchia

- Nagłówek strony (logo + nav) = ta sama waga co sekcje
- „Centrum meczowe”, „Nasze drużyny”, „Akademia” — **ten sam ton, ten sam rozmiar**
- Brak **jednego** elementu, który krzyczy: *TO JEST DZIŚ NAJWAŻNIEJSZE*
- „Klub w liczbach” na dole — wygląda jak stopka analityczna, nie jak dumа klubu

## Typografia

- Wszystko w tym samym rodzaju — brak „głosu klubu”
- Etykiety `uppercase tracking-wide` — język **panelu B2B**, nie **klubu**
- Brak cytatu, hasła, emocjonalnego leadu („Przed nami kolejne wyzwanie!” z FB)
- Liczby w statystykach — OK, ale **bez kontekstu** (40 zawodników **to my, cała rodzina Pioruna**)

## Kolory

- Zielony użyty **równomiernie** — męczy, traci prestiż
- Złoty tylko na przyciskach i akcentach — **nie buduje sceny**
- Białe karty **gaszą** identyfikację — wyglądają jak Notion/shadcn
- Brak ciemnych scen (wieczorny mecz, stadion, sponsor wall) — brak **kontrastu dramaturgii**

## Układ

- Kolumnowy stos sekcji — **zero surprise**
- Desktop: hero 2 kolumny (tekst + widget meczu) — layout **aplikacji**, nie **magazynu sportowego**
- Mobile: długi scroll — rodzic odpada w połowie
- Nawigacja pozioma z 9 linkami — **intranet**, nie strona klubu

## Karty

- Wszędzie: `rounded-xl`, border, białe tło — **ten sam prefabrykat**
- Mecz, drużyna, news, sponsor — **wyglądają jak ten sam komponent**
- Brak kart „redakcyjnych” (pełna szerokość zdjęcia + tytuł na zdjęciu)

## CTA

- „Terminarz”, „Aktualności”, „Dołącz do klubu” — **równy priorytet** → użytkownik nie wie, co kliknąć
- Brak **jednego** głównego CTA w hero (np. „Zapisz dziecko do akademii” LUB „Kup bilet / Obserwuj mecz”)
- „Panel klubu” w headerze — **konkuruje** z celem strony publicznej
- „Zapisz dziecko” schowane w sekcji Akademia, mały link w nagłówku sekcji

---

# ZADANIE 4 & 5 & 6 — Koncepcja Public Website 3.0 (od zera)

## Filozofia redesignu

**Nie poprawiamy sekcji. Zmieniamy scenografię.**

Strona to **jeden meczowy weekend klubu** opowiedziany w 8 aktach:

1. **Wejście na stadion** (Hero)  
2. **Dziś gramy** (Matchday)  
3. **Kim jesteśmy** (Drużyny)  
4. **Twoje dziecko tu rośnie** (Akademia)  
5. **Wspomnienia** (Galeria)  
6. **Co się dzieje** (Aktualności)  
7. **Kto nas wspiera** (Sponsorzy)  
8. **Dołącz / znajdź nas** (Kontakt)

**DNA Pioruna z Facebooka (nie kopia UI):**
- 💚⚽ energia, lokalność, „przed nami wyzwanie”
- Zdjęcia **prawdziwych** zawodników (dzieci + dorośli), nie stock
- Młodzież **równolegle** do seniorów (post o Młodzikach IV ligi!)
- Społeczność: telefon, boisko, „zawsze otwarci”
- Ciepło + ambicja — mały klub z **dużym sercem**

---

## SEKCJA 1 — Hero

**Cel emocjonalny:** W 3 sekundy: *To jest nasz klub. Tu jest życie. Tu gram.*

### Układ (makieta tekstowa)

```
┌─────────────────────────────────────────────────────────────┐
│ [CIEMNY FULL-BLEED — KOLAż 3 ZDJĘĆ]                          │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐               │
│  │ DRUŻYNA  │ │   MECZ / GOL   │ │ STADION  │               │
│  │ (zespół  │ │   (akcja,      │ │ (boisko, │               │
│  │  razem)  │ │    emocja)     │ │  wieczór)│               │
│  └──────────┘ └──────────────┘ └──────────┘               │
│                                                             │
│  [HERB]  PIORUN WAWRZEŃCZYCE                                │
│          „Od Skrzata do Seniora — jedna rodzina, jeden klub” │
│                                                             │
│  [ ZAPISZ DZIECI DO AKADEMII ]   [ NAJBLIŻSZY MECZ → ]      │
│                                                             │
│  scroll ↓                                                   │
└─────────────────────────────────────────────────────────────┘
```

### Zasady

- **Trzy zdjęcia obowiązkowo** — drużyna, mecz, stadion/boisko (z CMS / galerii / FB import)
- Kolagen lub slider — **nie** jeden washy gradient
- Hasło emocjonalne (z CMS `hero_subtitle` lub copy klubu) — **nie** „Klub piłkarski”
- **Dwa CTA max:** (1) rodzic — zapis, (2) kibic — mecz
- Mobile: jedno zdjęcie rotujące co 5s, CTA sticky na dole pierwszego ekranu

---

## SEKCJA 2 — Matchday

**Cel:** *Dziś / w ten weekend coś się dzieje.*

```
┌─────────────────────────────────────────────────────────────┐
│  ⚽ DZIŚ W PIORUNIE                                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐  ┌─────────────────────┐   │
│  │  NASTĘPNY MECZ — PLAKAT     │  │  OSTATNI WYNIK      │   │
│  │  [duże VS]                  │  │  3 : 1              │   │
│  │  środa 18:00 · Mietków      │  │  zdjęcie z meczu    │   │
│  │  IV Liga Młodzików          │  │  mini               │   │
│  │  [ SZCZEGÓŁY MECZU ]        │  │                     │   │
│  └─────────────────────────────┘  └─────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ TABELA — top 5 · nasz wiersz podświetlony złotem    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

- Matchday **nie** wygląda jak trzy karty CRM
- Następny mecz = **plakat** (typografia sportowa, duże VS)
- Tabela = **pasek wyników TV**, nie tabela Excel

---

## SEKCJA 3 — Nasze Drużyny

**Cel:** *Cały klub na pierwszy rzut oka.*

```
┌─────────────────────────────────────────────────────────────┐
│  NASZE DRUŻYNY                                              │
│  Seniorzy · Trampkarze · Młodziki · Skrzaty · …              │
├─────────────────────────────────────────────────────────────┤
│  [mobile: horizontal scroll z dużymi kartami]               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ FOTO    │ │ FOTO    │ │ FOTO    │ │ FOTO    │           │
│  │ grupy   │ │ grupy   │ │ grupy   │ │ grupy   │           │
│  │─────────│ │─────────│ │─────────│ │─────────│           │
│  │Skrzaty  │ │Młodziki │ │Trampkarze│ │Seniorzy │           │
│  │12 zaw.  │ │15 zaw.  │ │18 zaw.  │ │22 zaw.  │           │
│  │Trener X │ │Trener Y │ │Trener Z │ │Trener … │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
```

- Każda karta = **zdjęcie grupy** (obowiązkowe w CMS per drużyna / album)
- Bez zdjęcia — **nie pokazuj** karty gradientowej (lepiej mniej, ale prawdziwie)
- Seniorzy nie dominują wizualnie — **równy format** wszystkich grup

---

## SEKCJA 4 — Akademia

**Cel (5 sekund dla rodzica):** *Moje dziecko może tu grać. Wiem jak się zapisać.*

```
┌─────────────────────────────────────────────────────────────┐
│  [FOTO: dzieci na treningu — duże, ciepłe, z bliska]        │
│                                                             │
│  AKADEMIA PIORUNA                                           │
│  „Od 5. roku życia do pierwszej drużyny seniorskiej”        │
│                                                             │
│  Skrzaty → Żaki → Orliki → Młodziki → … → Seniorzy         │
│  (oś wizualna jak timeline, nie chipy filtrów)              │
│                                                             │
│  ┌──────────────────────────────────────┐                   │
│  │ 📞 Zadzwoń: 663 595 991              │                   │
│  │ 📍 Boisko Wawrzeńczyce               │                   │
│  │ [ UMÓW ZAPIS — formularz / kontakt ] │                   │
│  └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

- **Pierwszy ekran mobile** — rodzic musi zobaczyć Akademię **przed** statystykami
- Telefon z FB widoczny **od razu**
- Język: *Twoje dziecko*, nie *rozwój młodzieży w organizacji*

---

## SEKCJA 5 — Galeria

**Cel:** *Poczuj atmosferę — mecze, treningi, turnieje, dzieci.*

```
┌─────────────────────────────────────────────────────────────┐
│  GALERIA                                                    │
│  [ masonry / bento — 1 duże + 4 małe ]                      │
│  zdjęcia BEZ ramek — edge-to-edge w sekcji ciemnym tle       │
│  kategorie: Mecze | Treningi | Akademia | Klub              │
└─────────────────────────────────────────────────────────────┘
```

- Galeria na **ciemnym tle** (#062820) — zdjęcia „świecą”
- Zero zielonych placeholderów

---

## SEKCJA 6 — Sponsorzy

**Cel:** *Prestiż i zaufanie.*

```
┌─────────────────────────────────────────────────────────────┐
│  [ciemne tło, złote akcenty]                                │
│  SPONSOR GŁÓWNY — [duże logo, jak na koszulce]              │
│  ─────────────────────────────────────────                  │
│  Partnerzy: [logo] [logo] [logo]                            │
└─────────────────────────────────────────────────────────────┘
```

- Main sponsor = **50% szerokości sekcji**
- Reszta = dyskretna

---

## SEKCJA 7 — Aktualności

**Cel:** *Gazeta klubu, nie blog firmowy.*

```
┌─────────────────────────────────────────────────────────────┐
│  AKTUALNOŚCI                                                │
│  ┌────────────────────────────┐ ┌──────┐ ┌──────┐          │
│  │ LEAD: duże zdjęcie + tytuł │ │ news │ │ news │          │
│  │ „Przed nami wyzwanie!”     │ │      │ │      │          │
│  │ kategoria: MŁODZIKI        │ │      │ │      │          │
│  └────────────────────────────┘ └──────┘ └──────┘          │
└─────────────────────────────────────────────────────────────┘
```

- Lead story = **pełna szerokość**, zdjęcie obowiązkowe
- Kategorie kolorowe (mecz = zielony, akademia = złoty)

---

## SEKCJA 8 — Kontakt

**Cel:** *Jesteśmy tu, jesteśmy prawdziwi.*

```
┌─────────────────────────────────────────────────────────────┐
│  DOŁĄCZ DO PIORUNA                                          │
│  [mapa / zdjęcie boiska]                                    │
│  Adres · telefon · email · godziny treningów                │
│  [ Facebook ] [ Instagram ]                                 │
│  mały stop: „System klubu: FC OS” — nie dominuje            │
└─────────────────────────────────────────────────────────────┘
```

- Footer **nie** zaczyna się od „Powered by Football Club OS”
- Klub pierwszy, produkt w stopce małym drukiem

---

# MAKIETA TEKSTOWA — CAŁA STRONA (mobile)

```
┌──────────────────────┐
│ [logo] Piorun    ☰   │
├──────────────────────┤
│ HERO: foto meczu     │
│ Piorun Wawrzeńczyce  │
│ hasło emocjonalne    │
│ [ZAPISZ DZIECI]      │
│ [MECZ W ŚRODĘ]       │
├──────────────────────┤
│ MATCHDAY plakat      │
├──────────────────────┤
│ ← Skrzaty Młodziki → │  (scroll drużyn)
├──────────────────────┤
│ AKADEMIA + telefon   │
├──────────────────────┤
│ GALERIA bento        │
├──────────────────────┤
│ NEWS lead            │
├──────────────────────┤
│ SPONSORZY            │
├──────────────────────┤
│ KONTAKT + mapa       │
└──────────────────────┘
```

**Usunięte z homepage 3.0 (scalenie, nie nowe sekcje):**
- „Klub w liczbach” → wchodzi w Hero lub Matchday jako **jedna linia** („7 drużyn · 120 zawodników · od 201X”)
- Duplikat meczu (hero + centrum) → **jeden** Matchday, hero tylko emocja + CTA

---

# ZADANIE 7 — Plan wdrożenia (bez kodu)

## Faza A — Treść i foto (bloker wizualny)

| Krok | Działanie | Odpowiedzialny |
|------|-----------|----------------|
| A1 | Minimum **9 zdjęć**: hero×3, każda grupa wiekowa×1, mecz×1, trening dzieci×1 | Klub / trener |
| A2 | Upload do galerii CMS + przypisanie do drużyn / hero | Klub |
| A3 | Hasło hero emocjonalne (np. styl FB: „Od Skrzata do Seniora”) | Klub |
| A4 | Telefon i adres na wierzchu sekcji Akademia | Już na FB |

**Bez zdjęć redesign 3.0 nie ma sensu** — to nie problem layoutu, to problem **materiału**.

## Faza B — Design system klubu (nie shadcn)

| Krok | Działanie |
|------|-----------|
| B1 | Moodboard: FB Pioruna + 2 referencje akademii |
| B2 | Typografia: 1 font display (sportowy/narracyjny) + 1 body |
| B3 | Paleta scen: **ciemna** (hero, sponsorzy, galeria) + **jasna** (aktualności, kontakt) |
| B4 | Zakaz białych kart z border na homepage — zastąpić **sekcjami-atmosferą** |

## Faza C — Implementacja sekcji (kolejność)

| # | Sekcja | Priorytet |
|---|--------|-----------|
| 1 | Hero (kolagen 3 foto) | P0 |
| 2 | Matchday (plakat) | P0 |
| 3 | Akademia (rodzic + telefon) | P0 |
| 4 | Drużyny (karty foto) | P1 |
| 5 | Galeria (ciemne tło) | P1 |
| 6 | Aktualności (lead) | P1 |
| 7 | Sponsorzy (wall) | P2 |
| 8 | Kontakt + footer | P2 |

## Faza D — Weryfikacja emocjonalna

Test z właścicielem klubu — **jedno pytanie:**

> „Czy to wygląda jak strona klubu, w którym chcesz zapisać dziecko i któremu kibicujesz w sobotę?”

Nie: „Czy wszystkie sekcje działają?”

---

# Podsumowanie dla właściciela projektu

## 1. Co jest źle

Strona **technicznie** pokazuje drużyny, mecze i akademię.  
Strona **wizualnie** nadal wygląda jak **aplikacja do zarządzania klubem** — białe karty, brak zdjęć, ten sam szablon sekcji, produkt FC OS na pierwszym planie.

## 2. Dlaczego wygląda amatorsko

Bo **amatorski klub na Facebooku** pokazuje **pasję przez zdjęcia**.  
**Profesjonalna strona** bez zdjęć wygląda **gorzej** niż Facebook — użytkownik wraca na FB, nie na stronę.

## 3. Jak powinno wyglądać

Jak **weekend na boisku**: zdjęcia, mecz, dzieci, telefon trenera, sponsor na koszulce — **opowieść**, nie **dashboard**.

## 4. Makieta

Patrz sekcje Hero → Matchday → Drużyny → Akademia → Galeria → Sponsorzy → Aktualności → Kontakt powyżej.

## 5. Plan

Najpierw **zdjęcia i copy**, potem **design system klubu**, potem **implementacja od Hero**.

---

## Werdykt dokumentu

Ten raport **nie broni** Public Website 2.0 — uczciwie mówi, że **2.0 nie zmieniło odczucia**, bo nie zmieniło **języka wizualnego**.

Jeśli po wdrożeniu 3.0 według tej koncepcji właściciel powie:

> **„Tak, dokładnie o to mi chodziło”**

— wtedy redesign jest udany.

---

*Nie rozpoczęto implementacji. Nie dodano sekcji, funkcji ani modułów.*
