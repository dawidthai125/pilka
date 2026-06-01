# Raport: błąd produkcyjny „Wyloguj się” (Base UI error #31)

**Data:** 2026-06-01  
**Środowisko:** https://pilka-mu.vercel.app  
**Objaw:** Po kliknięciu „Wyloguj się” w menu użytkownika — `Application error: a client-side exception has occurred`  
**Console:** `Base UI error #31` (stack: `onMouseDown` → Dropdown/Menu)

---

## 1. Identyfikacja błędu Base UI #31

W pakiecie `@base-ui/react@1.5.0` kod produkcyjny `#31` mapuje się na:

> **MenuGroupContext is missing. Menu group parts must be used within `<Menu.Group>` or `<Menu.RadioGroup>`.**

Źródło: `node_modules/@base-ui/react/esm/menu/group/MenuGroupContext.js`

```js
throw new Error(
  process.env.NODE_ENV !== "production"
    ? "Base UI: MenuGroupContext is missing. Menu group parts must be used within <Menu.Group> or <Menu.RadioGroup>."
    : _formatErrorMessage(31)
);
```

Komponent `DropdownMenuLabel` w `src/components/ui/dropdown-menu.tsx` opakowuje `MenuPrimitive.GroupLabel`, który **wymaga** kontekstu z `MenuPrimitive.Group` (`DropdownMenuGroup`).

---

## 2. Przyczyna w kodzie aplikacji

Plik: `src/components/layout/dashboard-header.tsx`

### Błąd główny (error #31)

```tsx
// PRZED (błędne)
<DropdownMenuContent>
  <DropdownMenuLabel>Moje konto</DropdownMenuLabel>
  ...
</DropdownMenuContent>
```

`DropdownMenuLabel` renderowany **poza** `DropdownMenuGroup` → brak `MenuGroupContext` → wyjątek przy montowaniu zawartości menu (portal Base UI).

W dev pełny komunikat:  
`Base UI: MenuGroupContext is missing...`  
W produkcji: `Base UI error #31`.

Stack trace wskazuje `onMouseDown` w Menu, ponieważ błąd ujawnia się w interakcji z menu (otwarcie / klik pozycji), a nie w samym triggerze.

### Błąd wtórny (antywzorzec interakcji)

```tsx
// PRZED (błędne)
<DropdownMenuItem className="p-0">
  <SignOutButton />  {/* <Button> wewnątrz Menu.Item */}
</DropdownMenuItem>
```

- `Menu.Item` (DropdownMenuItem) jest elementem interaktywnym (`role="menuitem"`, handlery `onMouseDown` / `onClick`).
- `SignOutButton` renderował `@base-ui/react/button` wewnątrz pozycji menu → zagnieżdżony interaktywny element, konflikt handlerów przy `onMouseDown`.

Analogiczny antywzorzec w linkach:

```tsx
<DropdownMenuItem>
  <Link href="...">...</Link>
</DropdownMenuItem>
```

---

## 3. Analiza komponentów (zgodnie z zakresem audytu)

| Komponent | Plik | Status przed fixem |
|-----------|------|-------------------|
| UserMenu | `dashboard-header.tsx` (DropdownMenu) | Label bez Group → **#31** |
| Navbar | `dashboard-header.tsx` + `mobile-dashboard-nav.tsx` | Mobile nav OK (Sheet, bez DropdownMenuLabel) |
| Profile menu | pozycje w DropdownMenuContent | Linki zagnieżdżone w Item |
| Dropdown | `dropdown-menu.tsx` | Wrapper Base UI poprawny; brak wymuszenia Group przy Label |
| Logout | `sign-out-button.tsx` | Button w Menu.Item |
| Base UI | `@base-ui/react/menu` | Wymaga Group dla GroupLabel |

### Sprawdzone hipotezy

| Hipoteza | Wynik |
|----------|-------|
| invalid Trigger | OK — `DropdownMenuTrigger` w `Menu.Root` |
| invalid Anchor | OK — Positioner w Portal |
| invalid Portal | OK — Portal w `DropdownMenuContent` |
| invalid ref forwarding | OK |
| asChild / render | Linki i logout wymagały `render` zamiast zagnieżdżania |
| DropdownMenuItem / MenuItem | OK jako API; błędne użycie (dzieci interaktywne) |
| Popover / Dialog | Nie dotyczy tego menu |

---

## 4. Związek z ETAP 15.5 (Component Standardization)

ETAP 15.5 **nie modyfikował** bezpośrednio:

- `dashboard-header.tsx`
- `sign-out-button.tsx`
- `dropdown-menu.tsx`

Te pliki pochodzą z ETAP 1 (Base UI Menu). ETAP 15.5 konsolidował m.in. `Button`, layouty i moduły domenowe — **używał już istniejących wrapperów Base UI**, ale nie naprawił struktury menu użytkownika.

Błąd był **latentny od migracji na Base UI Menu**; mógł ujawnić się po deployu produkcyjnym (minifikacja → `#31`) lub po regresji w flow użytkownika. Nie jest regresją funkcjonalną ETAP 15.5, lecz **niespełnionym wymogiem API Base UI** w istniejącym kodzie.

---

## 5. Wdrożona poprawka

### 5.1 `dashboard-header.tsx`

- `DropdownMenuLabel` owinięty w `DropdownMenuGroup`.
- Linki: `DropdownMenuItem render={<Link href="..." />}` (jeden interaktywny element).
- Logout: `SignOutMenuItem` zamiast `SignOutButton` w `DropdownMenuItem`.

### 5.2 `sign-out-button.tsx`

- Wydzielono `useSignOutAction()` (wspólna logika PWA + `signOut()`).
- `SignOutMenuItem` — pozycja menu bez zagnieżdżonego `Button`.
- `SignOutButton` — bez zmian semantyki poza refaktorem hooka (do użycia poza menu).

---

## 6. Weryfikacja

| Test | Wynik |
|------|-------|
| `npm run typecheck` | PASS |
| Dev server (`npm run dev`, port 3002) | Uruchomiony |
| Struktura Menu vs Base UI docs | Zgodna po fixie |

**Test manualny po deployu:**

1. Zaloguj się na `/dashboard`.
2. Kliknij avatar / menu użytkownika — menu otwiera się bez błędu.
3. Kliknij „Wyloguj się” — przekierowanie na `/login`, brak error boundary.
4. Sprawdź linki „Profil” i „Powiadomienia”.

---

## 7. Podsumowanie

| | |
|---|---|
| **Root cause** | `DropdownMenuLabel` bez `DropdownMenuGroup` → Base UI error **#31** (`MenuGroupContext is missing`) |
| **Contributing factor** | `SignOutButton` (`Button`) zagnieżdżony w `DropdownMenuItem` — konflikt handlerów menu |
| **Fix** | Group wrapper + `SignOutMenuItem` + `render={<Link />}` dla nawigacji |
| **Zakres** | Tylko naprawa błędu, bez nowych funkcji |
