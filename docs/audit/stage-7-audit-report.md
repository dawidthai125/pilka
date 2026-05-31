# Raport audytu — ETAP 7 (Moduł finansów)

**Data:** 2026-05-31  
**Zakres:** bezpieczeństwo danych finansowych, RLS, raporty, składki, budżety, eksport PDF, wydajność zapytań, TypeScript, mobile, izolacja danych rodziców  
**Status po audycie:** poprawki wdrożone

---

## Podsumowanie

| Obszar | Ocena przed | Ocena po | Naprawione |
|--------|-------------|----------|------------|
| Bezpieczeństwo danych finansowych | ⚠️ Średnie | ✅ Dobre | 5 |
| Polityki RLS | ⚠️ Średnie | ✅ Dobre | 4 (DB) + 3 triggery |
| Poprawność raportów | ⚠️ Średnie | ✅ Dobre | 3 |
| Poprawność składek | ⚠️ Krytyczne | ✅ Dobre | 5 |
| Poprawność budżetów | ⚠️ Średnie | ✅ Dobre | 1 |
| Eksport PDF | ⚠️ Średnie | ✅ Dobre | 2 |
| Wydajność zapytań | ⚠️ Średnie | ✅ Dobre | 3 |
| TypeScript | ✅ Dobre | ✅ Dobre | 1 (typ RPC) |
| Mobile / responsywność | ⚠️ Średnie | ✅ Dobre | 2 |
| Dostęp rodziców (własne dane) | ⚠️ Średnie | ✅ Dobre | 3 |

**Weryfikacja:** `npm run typecheck` — ✅ | `npm run build` — ✅  
**Migracja audytu:** `20260601102000_finance_audit_hardening.sql` (skrypt: `npm run db:migrate:finance-audit`)

---

## 1. Bezpieczeństwo danych finansowych

### Znalezione problemy

1. **`getFinanceDocumentSignedUrl` pozwalał roli `parent`** — action zwracał URL mimo że Storage RLS i tak blokuje dokumenty staff-only; niespójność warstw.
2. **Brak walidacji kwoty wpłaty w action** — możliwość nadpłaty składki przy obejściu UI (trigger DB nie istniał).
3. **`createFinancePlayerFee` bez weryfikacji zawodnika** — ryzyko powiązania składki z graczem spoza klubu.
4. **`generateFinanceReport` bez walidacji zakresu dat** — `periodEnd < periodStart`.
5. **Brak triggerów spójności `club_id`** na `finance_income`, `finance_documents`, `finance_fee_plans`, `finance_budgets`.

### Wdrożone poprawki

- `getFinanceDocumentSignedUrl` — wyłącznie `canReadFinance` (staff); rodzic nie ma dostępu do dokumentów klubowych.
- `recordFinanceFeePayment` — walidacja pozostałej kwoty przed insertem.
- `createFinancePlayerFee` — weryfikacja `players.club_id`.
- `generateFinanceReport` — walidacja `periodEnd >= periodStart`.
- Migracja: triggery spójności `club_id` na powiązanych tabelach.

---

## 2. Polityki RLS i baza danych

### Stan przed audytem

Moduł miał podstawowe RLS (`actor_can_read_finance`, `actor_can_manage_finance`, `parent_player_ids`), lecz:
- Dyrektor sportowy widział raporty ze statusem `draft`.
- Helper `parent_player_ids` nie wymuszał `user_club_ids()` (defense-in-depth).
- Brak limitu nadpłaty składki na poziomie DB.

### Wdrożone poprawki (`20260601102000_finance_audit_hardening.sql`)

- **`refresh_finance_player_fee_status`** — status `overdue` tylko gdy `due_date < CURRENT_DATE`.
- **`enforce_finance_fee_payment_cap`** — BEFORE INSERT na wpłatach; CHECK `amount_paid <= amount_due`.
- **Triggery spójności `club_id`:** income, documents, fee_plans, budgets.
- **`finance_reports_select`** — dyrektor sportowy: wyłącznie `status = 'published'`; zarząd/skarbnik: pełny dostęp.
- **Wzmocnione helpery RLS** — `user_club_ids()` w `parent_player_ids`, `actor_can_*`.
- **Indeksy:** `finance_player_fee_payments (club_id, payment_date)`, partial index zaległych składek.
- **RPC `get_finance_dashboard_totals(p_club_id)`** — agregaty bez ładowania 5000 wierszy.

---

## 3. Poprawność składek

### Znalezione problemy

1. **Trigger statusu oznaczał przyszłe należności jako `overdue`** — błędne etykiety i liczniki.
2. **Brak limitu nadpłaty** — trigger `apply_finance_fee_payment` mógł przekroczyć `amount_due`.
3. **UI pokazywało „Zaległa” dla składek przed terminem** — oparte na surowym `status` z DB.
4. **Dashboard i raporty liczyły zaległości bez filtra `due_date`**.

### Wdrożone poprawki

- Migracja: poprawiony trigger statusu + cap wpłat + odświeżenie istniejących rekordów.
- `feeStatusLabel()` / `feeStatusVariant()` w `constants.ts` — etykieta „Do zapłaty” dla należności przed terminem.
- `getFinanceDashboardStats`, `buildFinanceReportContent`, `buildFinanceAiContext` — filtr `due_date < today`.
- `recordFinanceFeePayment` — walidacja pozostałej kwoty w action.

---

## 4. Poprawność raportów

### Znalezione problemy

1. **Licznik zaległych składek w raporcie** — bez filtra terminu; przyszłe należności wliczane do statystyki.
2. **Dyrektor sportowy mógł odczytać drafty raportów** — polityka RLS zbyt szeroka.
3. **Brak walidacji okresu** przy generowaniu raportu.

### Wdrożone poprawki

- `buildFinanceReportContent` — zaległe składki: `due_date < periodEnd` AND `due_date < today`.
- RLS `finance_reports_select` — sports_director tylko `published`.
- `generateFinanceReport` — walidacja dat okresu.

---

## 5. Poprawność budżetów

### Znalezione problemy

- **`getFinanceBudgets` — N+1** — osobne zapytanie `computeBudgetExecution` per budżet (do 50 zapytań).

### Wdrożone poprawki

- `computeBudgetExecutionsBatch()` — jedno zapytanie wydatków na wspólny zakres dat; mapowanie w pamięci.
- Trigger spójności `team_id` ↔ `club_id` na `finance_budgets`.

---

## 6. Eksport PDF

### Znalezione problemy

- Słabsze style druku w `finance-report-view.tsx` względem modułu sponsorów.

### Wdrożone poprawki

- `print:max-w-none`, `print:border-0`, `print:bg-white`, `print:text-black`, `break-inside-avoid`.
- Nagłówek `font-bold`, stopka z instrukcją PDF (ukryta w druku).
- Tekst sekcji zaległych składek doprecyzowany: „po terminie płatności”.

---

## 7. Wydajność zapytań

### Znalezione problemy

1. **`getFinanceDashboardStats`** — dwa zapytania po 5000 wierszy income/expenses + drugie 5000 fees.
2. **`getFinanceBudgets`** — N+1 computeBudgetExecution.
3. **Brak indeksów** na wpłatach składek i zaległościach.

### Wdrożone poprawki

- RPC `get_finance_dashboard_totals` — agregaty w jednym wywołaniu SQL.
- Batch execution budżetów.
- Indeksy w migracji audytu.

---

## 8. Dostęp rodziców wyłącznie do własnych danych

### Potwierdzenie po poprawkach

| Zasób | Mechanizm izolacji |
|-------|-------------------|
| Składki zawodnika | RLS: `player_id IN parent_player_ids(club_id)` + weryfikacja `user_club_ids()` |
| Wpłaty składek | RLS: EXISTS fee powiązane z `parent_player_ids`; app filtruje po `player_id` |
| Przychody/koszty/budżety/raporty | Brak SELECT dla roli parent |
| Dokumenty finansowe | Storage RLS: `actor_can_read_finance`; signed URL tylko staff |
| Portal rodzica | `requireFinancePortalAccess` + `getParentFinancePortalData` wymaga wpisu w `player_guardians` |

**Potwierdzenie:** rodzic (`rodzic@piorun.test`) widzi wyłącznie składki i wpłaty powiązane z Marcinem Lewandowskim (seed ETAP 7). Brak dostępu do dashboardu skarbnika ani dokumentów klubu.

---

## 9. Mobile / responsywność

### Wdrożone poprawki

- `finance-fees-panel.tsx` — `min-h-[44px]` na polu kwoty wpłaty i przycisku Zapisz.
- Formularze planów/składek — już miały `min-h-[44px]`; portal rodzica — layout `flex-col` na mobile.

---

## 10. TypeScript

### Wdrożone poprawki

- Typ RPC `get_finance_dashboard_totals` w `src/types/database.ts`.
- Usunięto nieużywane importy (`FinanceFeePayment`, `mapFinanceBudget` w insights).

**Wynik:** `npm run typecheck` — brak błędów.

---

## 11. Pliki zmienione

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/20260601102000_finance_audit_hardening.sql` | RLS, triggery, indeksy, RPC |
| `src/lib/auth/session.ts` | RPC dashboard, batch budżety, filtr zaległości, portal access |
| `src/features/finance/actions.ts` | Walidacje fee, player, period, signed URL |
| `src/lib/finance/insights.ts` | Filtr zaległości, batch budżetów |
| `src/lib/finance/constants.ts` | `feeStatusLabel`, `feeStatusVariant` |
| `src/features/finance/components/finance-fees-panel.tsx` | Etykiety, touch targets |
| `src/features/finance/components/parent-finance-portal.tsx` | Etykiety statusów |
| `src/features/finance/components/finance-report-view.tsx` | Style `print:` |
| `src/types/database.ts` | Typ RPC |
| `scripts/setup-stage7.mjs` | Migracja audytu w setup |
| `package.json` | `db:migrate:finance-audit` |
| `docs/audit/stage-7-audit-report.md` | Ten raport |

---

## 12. Instrukcja wdrożenia migracji

```bash
npm run db:migrate:finance-audit
# lub pełny setup ETAP 7 (nowe środowisko):
npm run setup:stage7
```

**Konta testowe:** `skarbnik@piorun.test` (treasurer), `rodzic@piorun.test` (portal: `/finance/portal`).

Wymagane zmienne: `SUPABASE_DB_PASSWORD` (migracje), opcjonalnie `OPENAI_API_KEY` (narracja raportów AI).

---

## 13. Werdykt

**ETAP 7 — audyt zakończony.** Moduł finansów spełnia wymagania bezpieczeństwa danych, izolacji per rodzic, poprawności składek i raportów, wydajności oraz użyteczności mobilnej. Brak nowych funkcji — wyłącznie poprawki audytowe.
