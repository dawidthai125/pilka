# LAYOUT 15.10C BUILD REPORT

**Sprint:** Layout 15.10C — Dashboard Redesign  
**Data:** 2026-06-02  
**Commit bazowy:** `2bab268` (15.10B) + lokalne zmiany 15.10C (niecommitowane)  
**Środowisko:** Windows 10, Node.js v22.22.0, Next.js 15.5.18

---

## 1. Przyczyna błędu

### Objaw pierwotny

```
uncaughtException [RangeError: Array buffer allocation failed]
```

Wystąpił w fazie **„Creating an optimized production build”** (kompilacja webpack / Serwist), **przed** generowaniem stron statycznych. Pełny stack trace Node nie został zapisany — proces zakończył się natychmiast na `RangeError`.

### Diagnoza (KROK 1)

| Element | Wynik |
|---------|--------|
| **typecheck** | ✅ PASS (przed i po) |
| **Moment awarii (pierwszy run)** | Faza kompilacji bundla (`Creating an optimized production build`), tuż po logu Serwist |
| **Ostatni route (pierwszy run)** | Brak — awaria **przed** `Collecting page data` / `Generating static pages` |
| **Build z `--max-old-space-size=8192`** | ✅ PASS, 149 tras, ~115 s |
| **Build bez NODE_OPTIONS (retry)** | ✅ PASS, 149 tras, ~103 s |
| **Route `/dashboard` po 15.10C** | 3.15 kB (First Load JS 115 kB) — **mniejszy** niż przed sprintem (4.7 kB / 130 kB) |

### Źródło problemu

| Hipoteza | Werdykt |
|----------|---------|
| **Kod 15.10C (Hero, Visuals, Coach Day…)** | ❌ **Nie potwierdzona** — komponenty to lekkie Server Components (CSS gradient, brak obrazów z sieci, brak ciężkich bibliotek). Bundle dashboardu **zmalał**. |
| **Dane / Supabase w build time** | ❌ **Nie dotyczy** — `/dashboard` jest `ƒ` (dynamic SSR), nie generuje się statycznie z DB w buildzie. |
| **Next.js / Serwist / webpack** | ⚠️ **Możliwy współuczestnik** — duży projekt (149 tras) + service worker w jednej fazie kompilacji. |
| **Lokalne środowisko (OOM)** | ✅ **Najbardziej prawdopodobne** — przejściowe wyczerpanie pamięci Node na Windows; retry bez zmian w kodzie przechodzi. |

**Wniosek:** Błąd **nie wynika z defektu logiki ani UI 15.10C**. To **lokalny, przejściowy OOM** podczas kompilacji webpack, prawdopodobnie przy równoległych/zablokowanych procesach lub niskim stanie wolnej RAM w momencie pierwszego builda.

---

## 2. Naprawa

### Wykonane w ramach investigacji

| Działanie | Opis |
|-----------|------|
| **Retry build** | Drugi i trzeci run zakończone sukcesem bez zmian architektury |
| **Heap 8 GB (test)** | `NODE_OPTIONS=--max-old-space-size=8192` — build PASS (potwierdzenie charakteru OOM) |
| **ESLint** | Usunięto nieużywane importy w `dashboard-stats-grid.tsx` (warningi, nie blocker) |

### Nie wymagane (brak błędu w 15.10C)

- Refactor Hero / Coach Day / Quick Actions
- Usuwanie placeholderów Club Visuals
- Zmiana loaderów `getDashboardPresentation` / `getCoachDayData`

### Rekomendacja operacyjna (bez commita w tym kroku)

Dla stabilności lokalnych buildów na Windows można (w przyszłości) dodać do dokumentacji dev:

```bash
set NODE_OPTIONS=--max-old-space-size=8192
npm run build
```

Vercel CI ma własny limit pamięci — build 15.10B przechodził na produkcji; 15.10C nie zwiększa obciążenia bundla.

---

## 3. Wynik builda

### Izolacja komponentów 15.10C (KROK 2)

| Komponent | Typ | Ryzyko pamięci | Uwagi |
|-----------|-----|----------------|-------|
| `DashboardHero` | RSC + CSS gradient | Niskie | Brak `<Image>` z dużymi assetami |
| `DashboardClubVisuals` | RSC + CSS placeholdery | Niskie | Opcjonalnie 1 URL hero z CMS |
| `CoachDayPanel` | RSC, 6 kafli | Niskie | Ten sam data model co wcześniej |
| `DashboardStatsGrid` | RSC, 4 kafle | Niskie | Linki + typografia |
| `DashboardQuickActions` | RSC, 4 CTA | Niskie | Lucide icons only |
| `getDashboardPresentation` | Server cache | Niskie | Kilka count queries — runtime, nie build |

**Żaden komponent 15.10C nie wyróżnia się jako „memory hog”.**

### Weryfikacja końcowa (KROK 3)

| Test | Wynik | Czas |
|------|-------|------|
| `npm run typecheck` | ✅ **PASS** | ~15 s |
| `npm run build` (NODE_OPTIONS 8GB) | ✅ **PASS** | ~115 s |
| `npm run build` (domyślny heap, retry) | ✅ **PASS** | ~103 s |
| Trasy wygenerowane | **149 / 149** | — |
| `/dashboard` | `ƒ` dynamic, 3.15 kB | OK |

**Werdykt build:** ✅ **PASS**

---

## 4. Czy sprint można zamknąć?

| Kryterium | Status |
|-----------|--------|
| typecheck | ✅ |
| build | ✅ (po retry; pierwszy fail = OOM środowiska) |
| Bloker w kodzie 15.10C | ❌ brak |
| Commit / push / deploy | ⏸ **Celowo wstrzymane** (zgodnie z instrukcją) |

### Werdykt sprintu (techniczny)

✅ **Sprint 15.10C można zamknąć pod kątem builda** — brak regresji kompilacji; pierwotny FAIL był **przejściowy OOM lokalny**, nie błąd dashboard redesign.

### Do zamknięcia operacyjnego (poza tym raportem)

1. Commit + push zmian 15.10C (gdy użytkownik zatwierdzi)
2. Raport **LAYOUT SPRINT 15.10C REPORT** (funkcjonalny / wizualny)
3. Opcjonalnie: deploy prod i smoke test `/dashboard` na telefonie

---

*Nie wykonano commita, pusha ani deployu (zgodnie z instrukcją).*
