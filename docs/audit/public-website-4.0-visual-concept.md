# PUBLIC WEBSITE 4.0 — VISUAL CONCEPT

**Klub:** Piorun Wawrzeńczyce  
**Produkt:** Football Club OS (multi-club SaaS)  
**Data:** 2026-06-02  
**Status:** wizja UX / art direction — **bez kodu, bez komponentów, bez migracji**

---

> To nie jest specyfikacja techniczna.  
> To opis **doświadczenia**, które użytkownik ma czuć — szczególnie w **pierwsze 3 sekundy**.

---

## Filozofia 4.0

**3.0 zmieniło układ. 4.0 musi zmienić wiarę.**

Użytkownik wchodzący na stronę nie powinien myśleć: *„ładny system dla klubów”*.  
Powinien myśleć: *„to ci faceci z boiska obok. tu gram. tu zapiszę syna”*.

**Zasada nadrzędna:**  
Strona = **najlepszy post z Facebooka Pioruna**, rozwinięty w cały weekend klubu.

**Zasada SaaS:**  
Wawrzeńczyce, telefon, boisko — z CMS per klub.  
Zero hardcodu nazw w logice — **pełna lokalność w treści i mediach**.

---

## Test 3 sekund (must pass)

Po wejściu użytkownik **musi** wiedzieć:

| # | Pytanie | Odpowiedź wizualna 4.0 |
|---|---------|------------------------|
| 1 | To jest Piorun Wawrzeńczyce? | Herb + nazwa + **zdjęcie z ich boiska** |
| 2 | To klub piłkarski? | Stroje, piłka, murawa, bramka w kadrze |
| 3 | Klub żyje? | Data ostatniego meczu / treningu **dzisiaj / w ten weekend** |
| 4 | Są dzieci? | Twarz dziecka w koszulce Pioruna **w pierwszym ekranie** |
| 5 | Są seniorzy? | Drużyna dorosłych — to samo zdjęcie hero lub sąsiedni kadr |
| 6 | Są mecze? | Plakat meczu z godziną — nigdy „Invalid Date” |
| 7 | Są sponsorzy? | Logo Budmax jak na koszulce — duże, czytelne |
| 8 | Mogę zapisać dziecko? | Złoty CTA + telefon **663 595 991** widoczny od razu |

Jeśli którykolwiek punkt failuje — **4.0 nie jest gotowe do kodu**.

---

## Dlaczego obecna strona (3.0) nadal wygląda słabo

Bez owijania.

### 1. To nie są zdjęcia klubu — to ilustracje systemu

Demo SVG wyglądają jak **placeholder produktu SaaS**, nie jak **Piorun**.  
Użytkownik widzi gradienty z napisem „DRUŻYNA” — nie widzi **Marcina, Kasi ani trenera**.

Facebook Pioruna: twarze, blaty, emocja po golu.  
Strona: stock ilustracja w barwach klubu. **To gorsze niż brak zdjęć** — bo udaje, że są.

### 2. Matchday psuje wiarygodność w 2 sekundy

Na produkcji: *„undefined — undefined Invalid Date”*.  
Nawet najpiękniejszy hero nie ratuje strony, która **nie umie powiedzieć, kiedy jest mecz**.

Kibic odpuszcza. Rodzic odpuszcza. Sponsor myśli: *„nie ogarniają”*.

### 3. Strona pokazuje pusty klub

Jedna karta „Seniorzy — kadra w przygotowaniu”.  
Piorun ma **całą akademię** — strona mówi: *„jesteśmy pustynią”*.

Konkurencja (nawet B klasa UK) pokazuje **15 drużyn z trenerami**.  
My pokazujemy **1 pustą**.

### 4. Zero Wawrzeńczyce — zero duszy

Można podmienić logo i nazwę na dowolny klub zielono-złoty.  
Brak: boiska, gminy, „przed nami wyzwanie”, lokalnych rywali, DZPN.

**To generyczna strona FC OS, nie Piorun.**

### 5. Ten sam oddech sekcji = ten sam szablon

3.0 dodało ciemne tła, ale rytm nadal jest:

```
NAGŁÓWEK → podtytuł → blok → link „Zobacz więcej”
```

Powtarza się 7 razy. Mózg klasyfikuje to jako **aplikację**, nie **magazyn sportowy**.

### 6. Typografia bez głosu

Wszystko brzmi jak dashboard: ten sam font, ten sam weight, te same rozmiary.  
Brak **hasła-display** — *„Od Skrzata do Seniora”* powinno wyglądać jak **plakat**, nie jak `h1` z CMS.

### 7. Akademia jest „na papierze”, nie w sercu

CTA „Zapisz dziecko” istnieje — ale **dziecko nie jest widoczne w hero**.  
Rodzic w 3 sekundy widzi seniorów i mecz — nie **swoją ścieżkę**.

Konkurencja: foto dzieci **obok** lub **w** hero.

### 8. Aktualności bez redakcji

Lead story bez prawdziwego zdjęcia z boiska = blog firmowy.  
Tytuł *„Wygrana u siebie z KS Orzeł”* powinien mieć **zdjęcie z tego meczu** — inaczej to fake news wizualnie.

### 9. Mobile = długi scroll modułów

Na telefonie rodzic scrolluje: hero → matchday (broken) → 1 drużyna → akademia…  
**Zapis dziecka** powinien być **przy kciuku** — sticky, złoty, z telefonem.

### 10. FC OS nadal czytelny w DNA

„1 drużyn · 21 zawodników · B Klasa” brzmi jak **statystyka panelu**, nie jak *„31 zawodników, jedna rodzina”*.  
System klubu w stopce — OK. Ale **język całej strony** nadal jest administracyjny.

---

## 10 największych błędów wizualnych (obecna produkcja)

| # | Błąd | Efekt emocjonalny |
|---|------|-------------------|
| **1** | Demo SVG zamiast prawdziwych zdjęć | „To nie prawdziwy klub” |
| **2** | Broken matchday (Invalid Date) | „Nie ogarniają organizacji” |
| **3** | Brak lokalności (Wawrzeńczyce, boisko) | „To szablon” |
| **4** | Jedna pusta drużyna | „Mały, martwy klub” |
| **5** | Modułowy rytm sekcji (SaaS) | „Panel, nie emocja” |
| **6** | Brak twarzy w pierwszym ekranie | „Nie znam nikogo stąd” |
| **7** | Typografia bez charakteru | „Generycznie” |
| **8** | Dzieci niewidoczne w hero | Rodzic: „to nie dla mnie” |
| **9** | News bez foto z wydarzenia | „Tekst, nie gazeta klubu” |
| **10** | FB 10× lepsze wizualnie niż www | Właściciel: „po co ta strona?” |

---

## PUBLIC WEBSITE 4.0 — DOŚWIADCIENIE UŻYTKOWNIKA

### Metafora: „Sobota w Wawrzeńczyce”

Strona to **jeden dzień meczowy** opowiedziany kolejnością emocji — nie listą modułów CRM.

```
RANO:     budzimy się — hero (wszyscy razem)
PRZEDPOŁUDNIE: mecz juniorów — akademia
PO POŁUDNIU:   mecz seniorów — matchday
WIECZÓR:       wspomnienia — galeria
NIEDZIELA:     co nowego — aktualności
CAŁY CZAS:     kto nas wspiera — sponsorzy
```

---

## AKT 1 — WEJŚCIE (Hero)

### Emocja

*„To MY. To TU. W sobotę gramy.”*

### Doświadczenie (3 sekundy)

Pełny ekran telefonu / laptopa wypełnia **jedno prawdziwe zdjęcie** — drużyna na murawie w Wawrzeńczyce, wieczorne światło, herb na piersi.

Na zdjęciu (nie pod spodem):

```
[HERB]  PIORUN WAWRZEŃCZYCE
        „Od Skrzata do Seniora — jedna rodzina”
        📍 Boisko Wawrzeńczyce · B Klasa Śląsk

[ ZAPISZ DZIECI ]     [ SOBOTNI MECZ → ]
```

**Bez:** kolażu 3 demo SVG, statystyk panelowych, chipów drużyn.

### Mobile

- Jedno zdjęcie rotujące co 6 s: **seniorzy → dzieci → stadion** — ale **tylko prawdziwe foto**
- Sticky bar na dole: `📞 Zapisz dziecko · 663 595 991`

### Multi-club

Hasło, adres, zdjęcia — z CMS klubu. Layout identyczny dla każdego tenant.

---

## AKT 2 — MATCHDAY (wydarzenie, nie widget)

### Emocja

*„Dziś coś się dzieje — albo właśnie było.”*

### Doświadczenie

Pełna szerokość, ciemno-zielone tło (#062820), jak **plakat przy szatni**:

```
⚡ W SOBOTĘ GRAMY

    PIORUN  vs  KS ORZEŁ
         15:00
    Boisko Wawrzeńczyce · B Klasa

[ ZOBACZ TERMINARZ ]
```

Obok — **ostatni wynik** z prawdziwym score (3:1), miniaturka zdjęcia z meczu.

**Reguła:** jeśli brak danych meczowych — **pokaż ostatni mecz ze zdjęciem**, nie „Invalid Date”.

### Wzorzec konkurencji

Ekstraklasa: banner sponsorski meczu.  
Piorun 4.0: ten sam **poziom emocji**, lokalna skala.

---

## AKT 3 — CAŁY KLUB (drużyny)

### Emocja

*„Nie tylko seniorzy — cała rodzina.”*

### Doświadczenie

Poziomy scroll (mobile) / rząd (desktop) **wyłącznie kart ze zdjęciem grupy**:

```
[ FOTO Skrzatów ] [ FOTO Młodzików ] [ FOTO Trampkarzy ] [ FOTO Seniorów ]
     imię grupy         trener              12 zawodników
```

**Reguła:** brak zdjęcia = brak karty. Lepiej 3 prawdziwe niż 8 pustych.

Tło: jasna scena (#f7f5f0) — oddech po ciemnym matchday.

---

## AKT 4 — AKADEMIA (produkt dla rodzica)

### Emocja

*„Moje dziecko tu pasuje. Wiem jak zadzwonić.”*

### Doświadczenie

**Największe zdjęcie na stronie poza hero** — dzieci z bliska, uśmiech, koszulki Pioruna.

```
AKADEMIA PIORUNA
„Od 5. roku życia — pierwszy kontakt z piłką”

Skrzaty ── Żaki ── Orliki ── Młodziki ── … ── Seniorzy
         (oś wizualna, nie chipy)

┌─────────────────────────────────┐
│ 📞 663 595 991                  │
│ 📍 Boisko, Wawrzeńczyce         │
│ [ UMÓW ZAPIS — 30 sekund ]      │
└─────────────────────────────────┘
```

Telefon klikalny. Formularz krótki. **Zero** akapitów o „organizacji sportowej”.

### Pozycja na stronie

Bezpośrednio pod matchday lub **split hero** (lewo: seniorzy, prawo: dzieci) — rodzic nie scrolluje do sekcji 4.

---

## AKT 5 — GALERIA (wspomnienia)

### Emocja

*„Tu jest atmosfera — słychać trybuny.”*

### Doświadczenie

Ciemne tło. Bento: **1 ogromne** + 4 mniejsze. Zero ramek. Podpisy: „Derby”, „Trening Skrzatów”, „Turniej”.

Zdjęcia **edge-to-edge** — jak Instagram klubu, nie album w ramkach.

---

## AKT 6 — AKTUALNOŚCI (gazeta, nie blog)

### Emocja

*„Co się właśnie stało?”*

### Doświadczenie

Lead = **pełna szerokość zdjęcia z boiska** + tytuł na zdjęciu:

```
[MŁODZIKI]  Przed nami wyzwanie w Mietkowie!
            Wygrana u siebie — zobacz zdjęcia →
```

Kategorie kolorowe: MECZ = zielony, AKADEMIA = złoty, KLUB = biały.

Miniatury obok — **tylko z realnym thumb**.

---

## AKT 7 — SPONSOR WALL (prestiż)

### Emocja

*„Ten klub ma partnerów — można mu zaufać.”*

### Doświadczenie

Ciemna scena. **Budmax** — logo jak na koszulce, 50% szerokości, złota obwódka.

Pod spodem — partnerzy mniejszą siatką, monochrom, bez kart SaaS.

Opcjonalnie: *„Zostań partnerem →”* dyskretny link.

---

## AKT 8 — FOOTER (ludzie, nie system)

### Emocja

*„Jesteśmy tu. Jesteśmy prawdziwi.”*

### Doświadczenie

```
DOŁĄCZ DO PIORUNA
[zdjęcie boiska z lotu ptaka lub mapa]

Adres · telefon · email · Facebook · Instagram

© Piorun Wawrzeńczyce
   System: Football Club OS (mały, szary)
```

**Klub pierwszy. Produkt ostatni.**

---

## Scenografia kolorów 4.0

| Scena | Tło | Użycie |
|-------|-----|--------|
| **Noc meczowa** | #062820 | Hero overlay, matchday, galeria, sponsorzy |
| **Dzień treningu** | #f7f5f0 | Drużyny, akademia, aktualności |
| **Energia** | #F4C430 (złoty) | CTA rodzic, VS, telefon |
| **Tożsamość** | #0B3D2E (zielony) | Herby, nagłówki, kategorie MECZ |

**Zasada:** nie mieszaj więcej niż **2 scen** na jednym ekranie.

---

## Typografia 4.0 (art direction)

| Rola | Kierunek | Przykład w duchu |
|------|----------|------------------|
| **Display** | Condensed, sportowy, polski | Oswald / Bebas / własny „Piorun Display” |
| **Body** | Czytelny sans | Inter / system |
| **Liczby meczu** | Tabular, ogromne | Score 3:1 jak telewizja |

**Hasło klubu** zawsze display. **Tabele** zawsze czytelne. Nigdy uppercase tracking-wide na wszystkim (język panelu B2B).

---

## Mobile — pierwszy ekran (wireframe emocjonalny)

```
┌─────────────────────────┐
│ [HERB] Piorun           │
│ Mecze · Akademia · …    │
├─────────────────────────┤
│                         │
│   PRAWDZIWE ZDJĘCIE     │
│   drużyny / dzieci      │
│                         │
│ Od Skrzata do Seniora   │
│                         │
│ [ ZAPISZ DZIECI ]       │
│ [ SOBOTNI MECZ ]        │
├─────────────────────────┤
│ 📞 663 595 991  (sticky)│
└─────────────────────────┘
```

Scroll 2: matchday plakat.  
Scroll 3: akademia foto dzieci.

**Rodzic nie powinien scrollować 5 ekranów, żeby zadzwonić.**

---

## Content checklist przed kodem (Piorun)

| Asset | Min. | Źródło |
|-------|------|--------|
| Hero team | 1 | FB / mecz domowy |
| Hero kids | 1 | trening akademii |
| Hero stadium | 1 | boisko wieczorem |
| Team groups | 4+ | po 1 foto grupy |
| Academy | 2 | dzieci z bliska |
| Gallery | 12 | ostatnie 2 miesiące FB |
| News | 3 | cover z wydarzenia |
| Copy lokalne | 1 | hasło + Wawrzeńczyce | 

**Bez tego — nie kodujemy 4.0.** Kolejny layout na demo SVG = Website 3.5, nie 4.0.

---

## Multi-club / SaaS — jak zachować wizję

| Element | Stały (platforma) | Zmienny (CMS klubu) |
|---------|-------------------|---------------------|
| Dramaturgia 8 aktów | ✅ | — |
| Sceny kolorów | ✅ tokeny | barwy klubu |
| Typografia display | ✅ slot fontu | opcjonalnie per klub |
| Zdjęcia | — | **100% klub** |
| Hasło hero | — | CMS |
| Telefon akademii | — | settings |
| Matchday | layout | dane meczów |
| Sponsor wall | layout | logo tierów |

**FC OS dostarcza scenografię. Klub dostarcza duszę.**

---

## Różnica 3.0 → 4.0 (jedno zdanie)

| Wersja | Obietnica |
|--------|-----------|
| **3.0** | „Wyglądamy jak strona klubu **w layoutcie**” |
| **4.0** | „Wyglądamy jak Piorun **z Facebooka** — tylko lepiej” |

---

## Kolejność prac (po akceptacji wizji)

1. ✅ Akceptacja Visual Concept 4.0  
2. Shooting / import z FB → CMS media  
3. Copy lokalne (hasło, telefon, Wawrzeńczyce)  
4. Fix matchday data (jakość, nie layout)  
5. Dopiero wtedy: implementacja layoutu 4.0  

---

## Metryki sukcesu (wrażenie, nie analytics)

| Test | Pass |
|------|------|
| Właściciel: „to wreszcie my” | Tak / Nie |
| Rodzic: wie gdzie zadzwonić w 5 s | Tak / Nie |
| Kibic: wie kiedy mecz w 5 s | Tak / Nie |
| Sponsor: widzi Budmax jak na koszulce | Tak / Nie |
| Porównanie z FB: www ≥ FB wizualnie | Tak / Nie |

---

*Dokument przygotowany bez implementacji. Powiązany: `competitive-visual-research-report.md`, `public-website-3.0-design-review.md`.*
