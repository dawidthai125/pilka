# CLUB IDENTITY 15.10B REPORT

**Football Club OS — Club Identity Sprint 15.10B**  
**Klub:** Piorun Wawrzeńczyce  
**Data:** 2026-06-02  
**Zakres:** wyłącznie warstwa wizualna — **bez nowych funkcji, bez ETAPU 15.11**

---

## Podsumowanie

Sprint ujednolicił identyfikację wizualną panelu aplikacji z brandingiem klubu z `website_settings`. Kolory Pioruna (`#0B3D2E` / `#F4C430`) są mapowane na tokeny shadcn; logo klubu (lub monogram PW) pojawia się w kluczowych punktach chrome; etykiety modułów zostały spolonizowane.

---

## P0 — Club Colors

### Mechanizm

| Plik | Rola |
|------|------|
| `src/lib/club/theme.ts` | `resolveClubTheme()`, `getClubThemeCssVariables()` — mapowanie na `--primary`, `--sidebar-*`, `--ring`, `--club-*`, `--pwa-*` |
| `src/components/club/club-theme-styles.tsx` | SSR `<style>` na `:root` — brak flashu neutralnego motywu |
| `src/components/pwa/pwa-theme-meta.tsx` | Client: `theme-color` + synchronizacja CSS vars |
| `src/lib/pwa/branding.ts` | `resolvePwaTheme()` deleguje do `resolveClubTheme()` |

### Źródło danych

- **Dashboard:** `websiteSettings` z `getDashboardContext()` (`primary_color`, `secondary_color`, `accent_color`)
- **Auth (login):** `getAuthClubBranding()` → `getPublicWebsiteHome()`

### Zastosowanie

| Obszar | Zmiana |
|--------|--------|
| **Sidebar (desktop)** | `bg-sidebar text-sidebar-foreground`, aktywna pozycja: `bg-sidebar-primary` (złoty) |
| **Przyciski primary** | `--primary` = zielony klubu |
| **Aktywne menu** | Sidebar: złoty pill; mobile sheet: zielony `bg-primary` |
| **Bottom nav** | Aktywny tab: `text-primary` (zielony klubu) |
| **Ring / focus** | `--ring` = secondary (złoty) |

---

## P0 — Login Branding

| Element | Przed | Po |
|---------|-------|-----|
| Layout | Białe tło, wycentrowana karta | Split: panel klubu (desktop) + formularz |
| Nagłówek | „Zaloguj się do Football Club OS” | „Panel Pioruna Wawrzeńczyce” (z `getAuthClubBranding`) |
| Kolory | Neutral shadcn | `ClubThemeStyles` + zielony panel |
| Mobile | Brak brandingu | Kompaktowy header z logo + tytuł panelu |
| Copy formularza | FCOS | „Wprowadź dane swojego konta klubowego.” |
| Link | — | „Wróć na stronę klubu” → `/` |

**Pliki:** `(auth)/layout.tsx`, `login-form.tsx`, `lib/club/branding-loader.ts`

---

## P1 — Logo

Komponent: `src/components/club/club-logo.tsx`  
Fallback: inicjały z nazwy klubu (np. **PW**), monogram złoty na ciemnym tle.

| Lokalizacja | Status |
|-------------|--------|
| Sidebar desktop | ✅ |
| Dashboard (desktop + mobile banner) | ✅ |
| Login (panel + mobile header) | ✅ |
| Mobile header (hamburger sheet) | ✅ |
| Mobile „Więcej” sheet | ✅ |
| PWA ikony (PNG/SVG/apple-icon) | ✅ monogram **PW** |

Logo z CMS (`website_settings.logo_path`) wyświetlane gdy upload w `/website/branding`.

---

## P1 — Polonizacja (etykiety UI)

| Było | Jest | Gdzie |
|------|------|-------|
| Communication Hub | **Komunikacja** | `navigation.ts`, `communication/page.tsx` |
| League Hub | **Rozgrywki** | `navigation.ts`, `league/page.tsx`, `quick-actions.ts` |
| Content Hub | **Treści** | `navigation.ts`, `content/page.tsx`, `quick-actions.ts`, `i18n.ts` |
| Video Center | **Wideo** | `navigation.ts`, `video/page.tsx`, `quick-actions.ts` |
| Coach Day | **Dziś w klubie** | `coach-day-panel.tsx` |
| Injury & Medical | **Urazy** | `navigation.ts`, `injuries/layout.tsx` |

Nazwy techniczne (trasy, permissions, kod) — **bez zmian**.

---

## PWA / metadata

| Element | Zmiana |
|---------|--------|
| `manifest.ts` | `name`: Piorun Wawrzeńczyce, `short_name`: Piorun |
| `app/layout.tsx` | `applicationName`, `appleWebApp.title` → `siteConfig.shortName` |
| `public/icons/*.svg` | Monogram PW |
| `icons/icon-192`, `icon-512`, `apple-icon` | PW zamiast „+” |

---

## Pliki zmienione (główne)

```
src/lib/club/theme.ts                          (nowy)
src/lib/club/branding-loader.ts                (nowy)
src/components/club/club-logo.tsx              (nowy)
src/components/club/club-theme-styles.tsx      (nowy)
src/lib/pwa/branding.ts
src/components/pwa/pwa-theme-meta.tsx
src/app/(dashboard)/layout.tsx
src/app/(dashboard)/dashboard/page.tsx
src/components/layout/dashboard-nav.tsx
src/components/layout/dashboard-header.tsx
src/components/layout/mobile-dashboard-nav.tsx
src/components/pwa/bottom-navigation.tsx
src/components/pwa/mobile-more-sheet.tsx
src/features/pwa/components/mobile-home.tsx
src/app/(auth)/layout.tsx
src/features/auth/components/login-form.tsx
src/config/navigation.ts
src/features/dashboard/components/coach-day-panel.tsx
src/app/(dashboard)/communication/page.tsx
src/app/(dashboard)/league/page.tsx
src/app/(dashboard)/content/page.tsx
src/app/(dashboard)/video/page.tsx
src/app/(dashboard)/injuries/layout.tsx
src/lib/pwa/quick-actions.ts
src/lib/pwa/i18n.ts
src/app/manifest.ts
src/app/layout.tsx
src/app/apple-icon.tsx
src/app/icons/icon-192/route.tsx
src/app/icons/icon-512/route.tsx
public/icons/*.svg
```

---

## Weryfikacja

| Test | Wynik |
|------|-------|
| `npm run typecheck` | ✅ PASS |
| `npm run build` | ✅ PASS (149 tras) |

---

## Known limitations (poza zakresem 15.10B)

1. **Dynamiczna ikona PWA z uploadu logo** — wymaga route generującego PNG z URL logo (obecnie statyczny monogram PW + kolory seed).
2. **Dark mode** — `globals.css` dark palette nadal ma domyślny niebieski sidebar-primary; runtime vars nadpisują w light; pełna dark club theme — kolejna iteracja.
3. **Angielskie copy w treściach modułów** (AI, komunikaty systemowe, footer public „Powered by FCOS”) — nie objęte sprintem (tylko etykiety nav + h1).
4. **Register / forgot-password** — dziedziczą auth layout z brandingiem klubu; copy formularzy rejestracji nie było w scope.

---

## Werdykt

✅ **Sprint 15.10B zakończony** — identyfikacja wizualna Pioruna spójna między loginem, sidebarem, dashboardem, mobile chrome i PWA.

**ETAP 15.11 nie został rozpoczęty.**

---

*Powiązany dokument analizy:* [`fc-os-visual-identity-review.md`](./fc-os-visual-identity-review.md)
