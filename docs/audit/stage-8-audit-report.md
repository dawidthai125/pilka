# Raport audytu — ETAP 8 (Moduł magazynowy)

**Data:** 2026-05-31  
**Zakres:** stany magazynowe, wydania i zwroty, polityki RLS, bezpieczeństwo danych, raporty PDF, wydajność zapytań, TypeScript, mobile, izolacja danych zawodnika  
**Status po audycie:** poprawki wdrożone

---

## Podsumowanie

| Obszar | Ocena przed | Ocena po | Naprawione |
|--------|-------------|----------|------------|
| Stany magazynowe | ⚠️ Krytyczne | ✅ Dobre | 3 |
| Wydania i zwroty | ⚠️ Średnie | ✅ Dobre | 6 |
| Polityki RLS | ⚠️ Średnie | ✅ Dobre | 4 |
| Bezpieczeństwo danych | ⚠️ Średnie | ✅ Dobre | 5 |
| Raporty PDF | ✅ Dobre | ✅ Dobre | 1 |
| Wydajność zapytań | ⚠️ Średnie | ✅ Dobre | 2 |
| TypeScript | ✅ Dobre | ✅ Dobre | 1 (typ RPC) |
| Mobile / responsywność | ✅ Dobre | ✅ Dobre | 0 |
| Dostęp zawodnika (własny sprzęt) | ⚠️ Średnie | ✅ Dobre | 3 |

**Weryfikacja:** `npm run typecheck` — ✅ | `npm run build` — ✅  
**Migracja audytu:** `20260602103000_inventory_audit_hardening.sql` (skrypt: `npm run db:migrate:inventory-audit`)

---

## 1. Stany magazynowe

### Znalezione problemy

1. **Seed uszkodzeń (`PIORUN-MAG-0001`…`0005`)** — `UPDATE` ustawiał `quantity_damaged = 1` bez przeniesienia sztuki z `quantity_issued` lub `quantity_available`, co naruszało CHECK `quantity_total = available + issued + damaged` na pozycjach już wydanych zawodnikom.
2. **Brak naprawy istniejących baz** — środowiska z już uruchomionym seedem pozostawały z niespójnymi stanami.

### Wdrożone poprawki

- Seed (`20260602101000_seed_inventory.sql`): uszkodzenia przenoszą sztukę z `issued` (gdy `quantity_issued >= 1`) lub z `available` (gdy brak wydań).
- Migracja audytu: korekta rekordów z naruszonym bilansem + `refresh_inventory_item_status` dla klubu testowego.

---

## 2. Wydania i zwroty

### Znalezione problemy

1. **Brak walidacji `transaction_id` ↔ `item_id`** — możliwość powiązania zwrotu z cudzym wydaniem.
2. **Brak limitu zwrotu względem ilości z wydania** — nadpłata zwrotu przy powiązanym `transaction_id`.
3. **`returnInventoryItem` bez walidacji `quantity_issued`** — możliwość zwrotu większej ilości niż wydana (przy obejściu UI).
4. **Seed zwrotów bez `transaction_id`** — zwroty niepowiązane z wydaniami zawodników.

### Wdrożone poprawki

- Triggery DB: `enforce_inventory_return_transaction_consistency`, `enforce_inventory_return_transaction_cap`.
- Actions: walidacja pozycji w klubie, `quantity_issued`, spójność `transaction_id` ↔ `item_id`.
- Seed: zwroty INSERT z `transaction_id` z wydań zawodników (LIMIT 3).
- Indeks `idx_inventory_returns_transaction` na `transaction_id`.

---

## 3. Polityki RLS

### Stan przed audytem

Moduł miał podstawowe RLS, lecz:
- **`inventory_categories_select`** — zawodnik widział pełny słownik kategorii (staff).
- **`actor_can_read_own_inventory`** — brak wymogu roli `player`; każdy członek klubu z powiązanym `player_id` mógł teoretycznie korzystać ze ścieżki „własnych danych”.
- **`inventory_reports_select`** — trener mógł odczytać raporty ze statusem `draft`.
- **`inventory_returns_select`** — wymagał wzmocnienia (app filtrowała po stronie klienta).

### Wdrożone poprawki (`20260602103000_inventory_audit_hardening.sql`)

- **`inventory_categories_select`** — wyłącznie `actor_can_read_inventory` (staff).
- **`actor_can_read_own_inventory`** — wymaga roli `player` + `player_id = player_id_for_user()`.
- **`inventory_returns_select`** — staff LUB zwrot powiązany z wydaniem zawodnika przez `transaction_id`.
- **`inventory_reports_select`** — trener wyłącznie `status = 'published'`; zarząd/dyrektor pełny dostęp.
- Triggery spójności `club_id`: kit assignments, damages, stocktake lines, order lines.

---

## 4. Bezpieczeństwo danych

### Znalezione problemy

1. **`createInventoryItem`** — brak weryfikacji `category_id` w klubie.
2. **`issueInventoryItem`** — brak weryfikacji członkostwa profilu (odbiorca staff) w klubie.
3. **`registerInventoryDamage`** — brak weryfikacji pozycji w klubie.
4. **`upsertInventoryPlayerKit`** — brak weryfikacji zawodnika w klubie.
5. **Portal zawodnika** — zwroty ładowane bez filtra SQL (poleganie na RLS + filtrowanie w app).

### Wdrożone poprawki

- Walidacje w `src/features/inventory/actions.ts` dla wszystkich powyższych operacji.
- `getPlayerInventoryPortalData` — zwroty pobierane wyłącznie z `.in("transaction_id", issueIds)` własnych wydań.
- Portal chroniony przez `requireInventoryPortalAccess` + mapowanie gracza po email profilu.

---

## 5. Raporty PDF

### Stan przed audytem

Widok raportu miał podstawowe style `print:` (max-width, border, bg, text-black, break-inside-avoid).

### Wdrożone poprawki

- `inventory-report-view.tsx` — sekcja statystyk z nagłówkiem H2 „Statystyki” i osobnym gridem (czytelniejszy druk/PDF).

**Potwierdzenie:** przycisk „Drukuj / PDF” ukryty w druku; treść raportu drukowana na białym tle bez obramowania karty.

---

## 6. Wydajność zapytań

### Znalezione problemy

1. **`buildInventoryReportContent`** — ładowało wszystkie `inventory_items` + transakcje + uszkodzenia bez limitu.
2. **Brak filtra okresu dla uszkodzeń** w agregatach raportu (`damages_count`, `replacement_needed`).

### Wdrożone poprawki

- RPC `get_inventory_report_summary(p_club_id, p_period_start, p_period_end)` — agregaty w jednym wywołaniu SQL z filtrem okresu dla wydań i uszkodzeń.
- `buildInventoryReportContent` korzysta z RPC zamiast wielu zapytań po tabelach.

*(Dashboard magazynu korzystał już z RPC `get_inventory_dashboard_stats` z migracji `20260602102000`.)*

---

## 7. Dostęp zawodnika wyłącznie do własnego sprzętu

### Potwierdzenie po poprawkach

| Zasób | Mechanizm izolacji |
|-------|-------------------|
| Strój zawodnika (`inventory_player_kits`) | RLS: `actor_can_read_own_inventory(club_id, player_id)` + filtr app `player_id` |
| Przypisania strojów | RLS + filtr app `player_id` |
| Wydania sprzętu | RLS: `player_id = player_id_for_user()` + filtr app |
| Zwroty | RLS przez `transaction_id` → wydanie zawodnika; app: `.in(transaction_id, ownIssueIds)` |
| Kategorie, dostawcy, inwentaryzacja, zamówienia | Brak SELECT dla roli player (poza portalowymi zapytaniami staff-only) |
| Raporty magazynowe | Brak dostępu player; trener tylko `published` |
| Portal | `/inventory/portal` — `canAccessInventoryPortal` + dane tylko dla `players.email = profile.email` |

**Potwierdzenie:** zawodnik (`zawodnik@piorun.test`) widzi wyłącznie własny strój, przypisania, wydania i zwroty powiązane z jego wydaniami. Brak dostępu do dashboardu magazynu staff ani słownika kategorii.

---

## 8. Mobile / responsywność

### Stan

Panele magazynowe (`items`, `issues`, `returns`, `damages`, `kits`, `stocktakes`, `orders`, `suppliers`, `reports`) mają `min-h-[44px]` na polach formularzy i przyciskach. Layout portalu zawodnika — kolumnowy na wąskich ekranach.

**Brak wymaganych poprawek** — spełnia wytyczne dotykowe.

---

## 9. TypeScript

### Wdrożone poprawki

- Typ RPC `get_inventory_report_summary` w `src/types/database.ts`.

**Wynik:** `npm run typecheck` — brak błędów.

---

## 10. Pliki zmienione

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/20260602103000_inventory_audit_hardening.sql` | Triggery zwrotów, RLS, RPC raportów, naprawa seed, indeks |
| `supabase/migrations/20260602101000_seed_inventory.sql` | Poprawne stany uszkodzeń, zwroty z `transaction_id` |
| `src/features/inventory/actions.ts` | Walidacje klub/pozycja/zawodnik/transakcja |
| `src/lib/auth/session.ts` | Portal: zwroty filtrowane po własnych wydaniach |
| `src/lib/inventory/insights.ts` | RPC `get_inventory_report_summary` |
| `src/features/inventory/components/inventory-report-view.tsx` | Sekcja statystyk PDF |
| `src/types/database.ts` | Typ RPC |
| `scripts/setup-stage8.mjs` | Migracja audytu w setup |
| `package.json` | `db:migrate:inventory-audit` → plik `030` |
| `docs/audit/stage-8-audit-report.md` | Ten raport |

---

## 11. Instrukcja wdrożenia migracji

```bash
npm run db:migrate:inventory-audit
# lub pełny setup ETAP 8 (nowe środowisko):
npm run setup:stage8
```

**Konta testowe:** `dyrektor@piorun.test` / `trener@piorun.test` (staff), `zawodnik@piorun.test` (portal: `/inventory/portal`).

Wymagane zmienne: `SUPABASE_DB_PASSWORD` (migracje), opcjonalnie `OPENAI_API_KEY` (narracja raportów AI).

---

## 12. Werdykt

**ETAP 8 — audyt zakończony.** Moduł magazynowy spełnia wymagania spójności stanów, poprawności wydań/zwrotów, izolacji danych zawodnika, RLS, wydajności raportów oraz użyteczności mobilnej. Brak nowych funkcji — wyłącznie poprawki audytowe.
