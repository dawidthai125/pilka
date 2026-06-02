# PILOT TEST CHECKLIST

**Football Club OS — Release 15.10A**  
**Klub pilotażowy:** Piorun Wawrzeńczyce  
**Środowisko:** https://pilka-mu.vercel.app  
**Czas trwania pilota:** 1–2 tygodnie (zamknięte testy)  
**Zakres:** weryfikacja UX na prawdziwych użytkownikach — **bez nowych funkcji, bez ETAPU 15.11**

---

## Informacje dla uczestników

| Rola | Kto testuje | Szacowany czas |
|------|-------------|----------------|
| Trener | 1 osoba | 45–60 min |
| Zawodnik | 1 osoba | 25–35 min |
| Rodzic | 1 osoba | 25–35 min |

**Urządzenia:** najpierw **telefon** (główny scenariusz), opcjonalnie komputer (porównanie).

**Dane logowania:** otrzymasz od administratora klubu (email + hasło).  
Konta referencyjne do dry-run (tylko zespół techniczny): `trener@piorun.test`, `zawodnik@piorun.test`, `rodzic@piorun.test` — hasło `Piorun2026!`.

**Zasady pilota:**
- Nie usuwaj danych innych użytkowników.
- Przy zgłaszaniu urazu / obecności używaj realistycznych, ale nieszkodliwych przykładów (np. „kontuzja kolana — test pilota”).
- Po każdej roli wypełnij **Formularz feedbacku** (na końcu dokumentu).
- Jeśli coś nie działa — zrób zrzut ekranu i zapisz dokładną ścieżkę (gdzie klikałeś).

**Legenda kliknięć:** liczba dotknięć / kliknięć od poprzedniego kroku (bez wpisywania tekstu w formularzach).

---

# 1. Scenariusz trenera

**Cel:** sprawdzić codzienne narzędzia trenera — od logowania po frekwencję, kadrę meczową, komunikację, urazy, CRM i sprzęt.

**Nawigacja trenera (mobile):** dolny pasek → Start · Mecze · Treningi · Drużyna · **Więcej** (reszta modułów w menu bocznym).

---

## 1.1 Logowanie

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| T1 | Otwórz https://pilka-mu.vercel.app | Strona logowania | 0 |
| T2 | Wpisz email i hasło, zaloguj | Dashboard klubu Piorun | 3 |

**Obserwacje trenera:** *(wypełnij po teście)*

- [ ] Logowanie intuicyjne: TAK / NIE
- [ ] Problemy: _________________________________

---

## 1.2 Dashboard i Coach Day

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| T3 | Na `/dashboard` znajdź sekcję **Coach Day** | Widoczne karty: trening, mecz, kadra, szybkie akcje | 0 |
| T4 | Przeczytaj karty (trening / mecz / RSVP) | Dane sensowne lub komunikat „brak treningu” | 0 |
| T5 | Kliknij **Otwórz trening** (jeśli jest) | Szczegóły treningu | 1 |
| T6 | Wróć na dashboard (Start w dolnym pasku) | Coach Day nadal widoczny | 1 |
| T7 | Wypróbuj 2–3 **szybkie akcje** (np. Frekwencja, Komunikacja, Zgłoś uraz) | Poprawne przejście bez pętli redirect | 2–3 |

**Szacunek kliknięć modułu:** 4–6

**Miejsca do oceny:**

| Obszar | Nieintuicyjne? | Wymaga uproszczenia? | Notatki |
|--------|----------------|----------------------|---------|
| Coach Day — układ kart | | | |
| Szybkie akcje — nazwy | | | |
| Powrót na dashboard | | | |

---

## 1.3 Treningi (Training)

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| T8 | Dolny pasek → **Treningi** (`/training`) | Kalendarz treningów | 1 |
| T9 | Wybierz najbliższy trening z listy / kalendarza | Strona `/training/[id]` | 1 |
| T10 | Sprawdź listę dostępności zawodników | Podsumowanie obecni / nieobecni / nieznani | 0 |
| T11 | (Opcjonalnie) **Panel trenera** z menu → `/training/coach` | Widok trenera / notatki | 2 |

**Szacunek kliknięć modułu:** 3–5

**Miejsca do oceny:**

| Obszar | Nieintuicyjne? | Wymaga uproszczenia? | Notatki |
|--------|----------------|----------------------|---------|
| Kalendarz vs lista | | | |
| Obecność vs dostępność | | | |
| Panel trenera — gdzie go szukać | | | |

---

## 1.4 Frekwencja (Attendance)

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| T12 | Menu **Więcej** → **Frekwencja** (`/attendance`) | Dashboard frekwencji | 2 |
| T13 | Sub-nawigacja → **Kalendarz** | Widok kalendarza | 1 |
| T14 | Sub-nawigacja → **Raporty trenera** | `/attendance/coach` | 1 |
| T15 | Sub-nawigacja → **Dashboard** | Powrót do widgetów | 1 |
| T16 | Jeśli widget „następny mecz” — kliknij link | Przejście do Match Squad lub meczów | 1 |

**Szacunek kliknięć modułu:** 5–7

**Miejsca do oceny:**

| Obszar | Nieintuicyjne? | Wymaga uproszczenia? | Notatki |
|--------|----------------|----------------------|---------|
| Sub-nawigacja (4 zakładki) | | | |
| Różnica Frekwencja vs Treningi | | | |
| Widgety na dashboardzie frekwencji | | | |

---

## 1.5 Match Squad (kadra meczowa)

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| T17 | **Ścieżka A:** Coach Day → **RSVP mecz** | `/attendance/matches/[id]` | 1 |
| T18 | **Ścieżka B:** Mecze → wybierz mecz → link **Match Squad** | Ten sam ekran kadry | 3 |
| T19 | Przejrzyj listę zawodników i statusy RSVP | Widoczne imiona i statusy | 0 |
| T20 | (Jeśli możliwe) zmień status 1 zawodnika | Zapis bez błędu | 2 |

**Szacunek kliknięć modułu:** 3–6

**Miejsca do oceny:**

| Obszar | Nieintuicyjne? | Wymaga uproszczenia? | Notatki |
|--------|----------------|----------------------|---------|
| Jak dotrzeć do kadry (A vs B) | | | |
| Mobile — karty zawodników | | | |
| Nazwa „Match Squad” (EN) | | | |

---

## 1.6 Communication Hub

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| T21 | Menu → **Communication Hub** (`/communication`) | Dashboard komunikacji | 2 |
| T22 | Przeczytaj sekcje: ogłoszenia, komunikaty trenera, czaty | Treść widoczna lub sensowny empty state | 0 |
| T23 | Wejdź w **Ogłoszenia** (`/communication/announcements`) | Lista ogłoszeń | 1 |
| T24 | Wejdź w **Czaty** (`/communication/chats`) | Lista czatów drużynowych | 1 |
| T25 | (Opcjonalnie) **Panel trenera** (`/communication/coach`) | Widok wysyłki komunikatów | 1 |

**Szacunek kliknięć modułu:** 4–6

**Miejsca do oceny:**

| Obszar | Nieintuicyjne? | Wymaga uproszczenia? | Notatki |
|--------|----------------|----------------------|---------|
| Różnica ogłoszenie vs komunikat trenera | | | |
| Empty states | | | |
| Gdzie napisać do drużyny | | | |

---

## 1.7 Injuries (urazy — staff)

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| T26 | Menu → **Injury & Medical** → `/injuries` | Przekierowanie / hub urazów | 2 |
| T27 | Otwórz **Rejestr** (`/injuries/registry`) | Lista urazów klubu | 1 |
| T28 | Kliknij **Zgłoś uraz** (`/injuries/report`) | Formularz zgłoszenia | 1 |
| T29 | (Opcjonalnie) otwórz szczegóły istniejącego urazu | `/injuries/[id]` | 1 |

**Szacunek kliknięć modułu:** 4–5

**Miejsca do oceny:**

| Obszar | Nieintuicyjne? | Wymaga uproszczenia? | Notatki |
|--------|----------------|----------------------|---------|
| Nazwa „Injury & Medical” (EN) | | | |
| Rejestr vs Zgłoś uraz | | | |
| Formularz zgłoszenia | | | |

---

## 1.8 Club CRM

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| T30 | Menu → **Club CRM** (`/crm`) | Dashboard CRM ze statystykami | 2 |
| T31 | Przejrzyj **Kontakty** (`/crm/contacts`) | Lista kontaktów | 1 |
| T32 | Przejrzyj **Zadania** (`/crm/tasks`) | Lista zadań | 1 |

**Szacunek kliknięć modułu:** 4

**Uwaga dla trenera:** rola `coach` ma dostęp **tylko do odczytu** CRM (bez tworzenia kontaktów).

**Miejsca do oceny:**

| Obszar | Nieintuicyjne? | Wymaga uproszczenia? | Notatki |
|--------|----------------|----------------------|---------|
| Po co trener widzi CRM | | | |
| Przydatność w codziennej pracy | | | |

---

## 1.9 Equipment & Assets (sprzęt — staff)

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| T33 | Menu → **Equipment & Assets** (`/equipment`) | Dashboard sprzętu | 2 |
| T34 | Otwórz **Zasoby** (`/equipment/assets`) | Lista sprzętu | 1 |
| T35 | Otwórz **Wydania** (`/equipment/assignments`) | Przypisania do zawodników | 1 |

**Szacunek kliknięć modułu:** 4

**Miejsca do oceny:**

| Obszar | Nieintuicyjne? | Wymaga uproszczenia? | Notatki |
|--------|----------------|----------------------|---------|
| Różnica Equipment vs Magazyn (inventory) | | | |
| Nazwy modułów (EN) | | | |

---

## Podsumowanie trenera

| Moduł | ~Kliknięć łącznie |
|-------|-------------------|
| Logowanie | 3 |
| Dashboard + Coach Day | 4–6 |
| Training | 3–5 |
| Attendance | 5–7 |
| Match Squad | 3–6 |
| Communication | 4–6 |
| Injuries | 4–5 |
| CRM | 4 |
| Assets | 4 |
| **RAZEM (orientacyjnie)** | **34–46** |

**Pola zbiorcze (trener):**

- Najbardziej nieintuicyjne miejsca: _________________________________
- Miejsca wymagające uproszczenia: _________________________________
- Moduły zbędne / zbyt skomplikowane dla trenera: _________________________________

---

# 2. Scenariusz zawodnika

**Cel:** sprawdzić portal zawodnika — frekwencję, dostępność, komunikację, urazy i własny sprzęt.

**Nawigacja zawodnika (mobile):** dolny pasek → Start · Treningi · Mecze · Frekwencja · **Więcej**  
(Komunikacja i sprzęt — głównie w menu **Więcej**, nie na dolnym pasku.)

---

## 2.1 Logowanie

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| Z1 | Zaloguj się na https://pilka-mu.vercel.app | Dashboard zawodnika | 3 |

---

## 2.2 Portal (dashboard)

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| Z2 | Przejrzyj `/dashboard` | Widok startowy bez staff-only modułów | 0 |
| Z3 | Menu **Więcej** → sprawdź dostępne pozycje | Treningi, Mecze, Frekwencja, Mój sprzęt, Mój status urazu, Komunikacja | 1 |
| Z4 | Otwórz **Profil klubu** (`/club`) | Informacje o Piorunie | 1 |

**Szacunek kliknięć modułu:** 2

**Miejsca do oceny:**

| Obszar | Niezrozumiałe? | Ukryte? | Wymaga uproszczenia? | Notatki |
|--------|----------------|---------|----------------------|---------|
| Co widzę na starcie | | | | |
| Menu Więcej vs dolny pasek | | | | |

---

## 2.3 Frekwencja

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| Z5 | Dolny pasek → **Frekwencja** | Dashboard frekwencji (widok zawodnika) | 1 |
| Z6 | Sub-nawigacja → **Kalendarz** | Kalendarz wydarzeń | 1 |
| Z7 | Sprawdź, czy widzisz **tylko swoje** dane | Brak danych innych zawodników (staff view) | 0 |

**Szacunek kliknięć modułu:** 2

---

## 2.4 Dostępność (availability)

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| Z8 | Dolny pasek → **Treningi** | Kalendarz | 1 |
| Z9 | Wybierz najbliższy trening | `/training/[id]` | 1 |
| Z10 | Znajdź sekcję **Twoja dostępność** | Przyciski obecny / nieobecny / nieznany | 0 |
| Z11 | Ustaw status i **Zapisz dostępność** | Komunikat sukcesu | 2 |

**Szacunek kliknięć modułu:** 4

**Miejsca do oceny:**

| Obszar | Niezrozumiałe? | Ukryte? | Wymaga uproszczenia? | Notatki |
|--------|----------------|---------|----------------------|---------|
| Gdzie zgłosić nieobecność | | | | |
| Różnica frekwencja vs dostępność | | | | |

---

## 2.5 Komunikacja

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| Z12 | Menu **Więcej** → **Communication Hub** | Lista ogłoszeń / czatów | 2 |
| Z13 | Otwórz jedno ogłoszenie lub czat | Treść czytelna | 1 |

**Szacunek kliknięć modułu:** 3

**Uwaga:** komunikacja **nie jest** na dolnym pasku zawodnika — sprawdź, czy użytkownik ją znajduje bez pomocy.

---

## 2.6 Injuries portal

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| Z14 | Menu **Więcej** → **Mój status urazu** (`/injuries/portal`) | Lista własnych urazów lub empty state | 2 |
| Z15 | Przeczytaj status / daty powrotu (jeśli są) | Zrozumiałe informacje | 0 |

**Szacunek kliknięć modułu:** 2

---

## 2.7 Własny sprzęt

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| Z16 | Menu → **Mój sprzęt** — sprawdź obie pozycje jeśli widoczne: | | |
| Z16a | `/inventory/portal` (Magazyn — strój klubowy) | Wydania / zwroty | 2 |
| Z16b | `/equipment/portal` (Equipment — ETAP 15.9) | Stroje i przypisania | 2 |

**Szacunek kliknięć modułu:** 2–4

**Uwaga dla obserwatora:** oba moduły mogą nosić nazwę **„Mój sprzęt”** — zapisz, czy to mylące.

**Miejsca do oceny:**

| Obszar | Niezrozumiałe? | Ukryte? | Wymaga uproszczenia? | Notatki |
|--------|----------------|---------|----------------------|---------|
| Dwa „Mój sprzęt” | | | | |
| Co jest strojem, co sprzętem | | | | |

---

## Podsumowanie zawodnika

| Moduł | ~Kliknięć łącznie |
|-------|-------------------|
| Logowanie | 3 |
| Portal | 2 |
| Frekwencja | 2 |
| Dostępność | 4 |
| Komunikacja | 3 |
| Injuries portal | 2 |
| Własny sprzęt | 2–4 |
| **RAZEM (orientacyjnie)** | **18–20** |

**Pola zbiorcze (zawodnik):**

- Najbardziej niezrozumiałe: _________________________________
- Najbardziej ukryte (trudne do znalezienia): _________________________________
- Miejsca wymagające uproszczenia: _________________________________

---

# 3. Scenariusz rodzica

**Cel:** sprawdzić portal rodzica — składki, frekwencję dziecka, urazy dziecka i komunikację.

**Nawigacja rodzica (mobile):** dolny pasek → Start · Składki · Frekwencja · Urazy · **Więcej**  
(Komunikacja może być na dolnym pasku lub w **Więcej**, zależnie od liczby zakładek.)

---

## 3.1 Logowanie

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| R1 | Zaloguj się | Dashboard rodzica | 3 |

---

## 3.2 Portal rodzica (składki)

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| R2 | Dolny pasek → **Składki** (`/finance/portal`) | Panel „Moje składki” | 1 |
| R3 | Sprawdź dane **swojego dziecka** (Marcin Lewandowski w seedzie) | Składki / wpłaty / saldo | 0 |
| R4 | Upewnij się, że **nie** widzisz finansów całego klubu | Brak dashboardu skarbnika | 0 |

**Szacunek kliknięć modułu:** 1

**Miejsca do oceny (UX):**

| Obszar | Problem UX? | Brakujący link? | Niejasna nazwa? | Notatki |
|--------|-------------|-----------------|-----------------|---------|
| „Składki” vs „Moje składki” | | | | |
| Zrozumiałość salda | | | | |

---

## 3.3 Frekwencja dziecka

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| R5 | Dolny pasek → **Frekwencja** | Dashboard frekwencji (dane dziecka) | 1 |
| R6 | Sub-nawigacja → **Kalendarz** | Kalendarz wydarzeń | 1 |
| R7 | Sprawdź, czy widzisz frekwencję **dziecka**, nie całej drużyny | Ograniczony widok | 0 |

**Szacunek kliknięć modułu:** 2

---

## 3.4 Urazy dziecka

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| R8 | Dolny pasek → **Urazy** / **Mój status urazu** (`/injuries/portal`) | Status urazów powiązanych z dzieckiem | 1 |
| R9 | Przeczytaj szczegóły (jeśli są) | Daty, status powrotu | 0 |

**Szacunek kliknięć modułu:** 1

**Miejsca do oceny:**

| Obszar | Problem UX? | Brakujący link? | Niejasna nazwa? | Notatki |
|--------|-------------|-----------------|-----------------|---------|
| „Mój status urazu” vs uraz dziecka | | | | |
| Brak powiadomienia o nowym urazie | | | | |

---

## 3.5 Komunikacja

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| R10 | Dolny pasek lub **Więcej** → **Communication Hub** | Ogłoszenia klubu | 1–2 |
| R11 | Przeczytaj ostatnie ogłoszenie | Treść czytelna | 1 |

**Szacunek kliknięć modułu:** 2–3

---

## 3.6 Dodatkowe (opcjonalnie)

| # | Co zrobić | Oczekiwany wynik | ~Kliknięć |
|---|-----------|------------------|-----------|
| R12 | Menu → **Relacje klubu** (`/crm/parents`) | Portal relacji rodzic–klub | 2 |
| R13 | Menu → **Mój sprzęt** (`/equipment/portal`) | Sprzęt przypisany dziecku | 2 |

**Szacunek kliknięć modułu:** 4

**Uwaga:** te pozycje są **poza dolnym paskiem** — sprawdź, czy rodzic je odkrywa.

---

## Podsumowanie rodzica

| Moduł | ~Kliknięć łącznie |
|-------|-------------------|
| Logowanie | 3 |
| Portal składek | 1 |
| Frekwencja dziecka | 2 |
| Urazy dziecka | 1 |
| Komunikacja | 2–3 |
| Opcjonalnie CRM + sprzęt | 4 |
| **RAZEM (orientacyjnie)** | **9–14** (+ opcjonalnie 4) |

**Pola zbiorcze (rodzic):**

- Problemy UX: _________________________________
- Brakujące linki (gdzie szukałeś, czego nie było): _________________________________
- Niejasne nazwy: _________________________________

---

# 4. Formularz feedbacku (każda rola osobno)

**Imię / rola:** _________________________________  
**Data testu:** _________________________________  
**Urządzenie:** telefon / tablet / komputer — model: _____________

---

### 1. Co było dobre?

*(Co działało sprawnie, co było czytelne, co oszczędziło Ci czasu?)*

_________________________________  
_________________________________  
_________________________________

---

### 2. Co było niezrozumiałe?

*(Gdzie nie wiedziałeś, co kliknąć? Jakie nazwy / ekrany były mylące?)*

_________________________________  
_________________________________  
_________________________________

---

### 3. Co było wolne?

*(Które strony długo się ładowały? Gdzie czekałeś więcej niż 3 sekundy?)*

_________________________________  
_________________________________  
_________________________________

---

### 4. Czego brakowało?

*(Funkcji, informacji, skrótów, powiadomień — **nie proś o nowe funkcje w pilocie**, opisz tylko lukę)*

_________________________________  
_________________________________  
_________________________________

---

### 5. Ocena ogólna

**Jak oceniasz Football Club OS po tym teście?**

| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|
| ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

**Czy poleciłbyś aplikację innemu trenerowi / rodzicowi?** TAK / NIE — dlaczego: _____________

---

# 5. Instrukcja dla koordynatora pilota

1. **Przed startem:** upewnij się, że użytkownicy mają konta i powiązania (zawodnik ↔ profil, rodzic ↔ dziecko).
2. **Rozdaj checklistę** każdej roli — trener pierwszy (najdłuższy scenariusz).
3. **Zbierz formularze** w ciągu 48 h od testu (świeże wrażenia).
4. **Agreguj feedback** w jednym dokumencie — bez implementacji w trakcie pilota.
5. **Znane ograniczenia** (nie blokują pilota, warto wspomnieć):
   - Powiadomienia push PWA mogą nie działać (brak konfiguracji VAPID na produkcji).
   - Część nazw modułów jest po angielsku (Injury & Medical, Match Squad, Club CRM).
   - Zawodnik ma dwa wejścia „Mój sprzęt” (`/inventory/portal` i `/equipment/portal`).

**Po zakończeniu pilota:** przekaż zebrane formularze zespołowi produktowemu — decyzja o ETAPIE 15.11 dopiero po analizie wyników.

---

*Dokument przygotowany na start pilota użytkowników FC OS 15.10A. Bez implementacji zmian w kodzie.*
