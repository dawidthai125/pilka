# Sprint 18.6C — Alerts Polish & Deduplication (implementacja)

**Tag:** `pre-18-6c-alerts-polish`  
**Zakres:** tylko warstwa prezentacji i logika pochodna na istniejących danych z `loadPlatformMonitoringBundle()` — **0** nowych zapytań, loaderów, RPC, migracji.

## Cele

| # | Zadanie | Status |
|---|---------|--------|
| 1 | Deduplikacja alertów per klub | ✅ |
| 2 | Priorytety wyświetlania | ✅ |
| 3 | Opisy po polsku (co / gdzie / co sprawdzić) | ✅ |
| 4 | Empty state pozytywny | ✅ |
| 5 | Podsumowanie CRITICAL / WARNING / INFO | ✅ |
| 6 | Ograniczenie szumu klubów testowych | ✅ |

## Zmienione pliki

| Plik | Zmiana |
|------|--------|
| `src/lib/platform/platform-alerts.ts` | Zbieranie surowych alertów → `dedupeAndPolishAlerts`, `isTestClubSlug`, `summarizePlatformAlerts`, pola `factors`, `checkHint`, `priorityGroup` |
| `src/features/platform/components/platform-alerts-panel.tsx` | Siatka podsumowania, empty state, lista czynników, hint operatora |
| `scripts/validate-186b-platform-alerts.mjs` | Test deduplikacji i eksportów 18.6C |
| `docs/architecture/sprint-186c-alerts-polish-implementation.md` | Ten dokument |
| `docs/architecture/sprint-186c-alerts-polish-validation.md` | Raport walidacji |

## Deduplikacja (opis)

1. **Surowe alerty** (`collectRawAlerts`) — jedna reguła = jeden wpis (jak w 18.6B), bez dodatkowych odczytów DB.
2. **Klucz grupy** — `clubId` + `severity` dla typów klubowych: health, freshness, failures, slow sync, running, onboarding.
3. **Alert główny** — w grupie wybierany typ o najwyższym priorytecie wewnętrznym:  
   `sync_failures_critical` → `freshness_critical` → `club_health_critical` → ostrzeżenia → INFO.
4. **Czynniki** — pozostałe opisy z grupy trafiają do `factors[]` (lista pod głównym opisem).
5. **Liga + klub** — `league_health_critical` dla klubu, który już ma zgrupowany alert CRITICAL, jest wchłaniany do `factors` (bez drugiej czerwonej karty).
6. **Kluby testowe** — slugi `pilot-club-test`, prefiks `release-184a-`, prefiks `pilot-club-` nie generują alertów operacyjnych; jeden INFO zbiorczy na końcu listy.

## Kolejność (priorytety)

`sortOrder` z `PlatformAlertPriorityGroup`:

1. `cron` — FAIL / WARNING cronu  
2. `platform` — (rezerwa; brak osobnych typów poza cronem)  
3. `club_critical` — zgrupowane CRITICAL klubu  
4. `league_critical` — CRITICAL źródła ligi (jeśli nie wchłonięte)  
5. `warning` — WARNING klubu / ligi / cron WARNING  
6. `info` — sync w toku, onboarding, kluby testowe

## Operator UX

- **`checkHint`** — krótka wskazówka „co sprawdzić” pod każdym alertem.
- **Podsumowanie** — `summarizePlatformAlerts()` liczy severities z już policzonej tablicy (bez dodatkowych zapytań).

## Świadomie poza zakresem

Ack, mute, historia alertów, e-mail, webhooki, notification center, nowe trasy — zgodnie z briefem 18.6C.
