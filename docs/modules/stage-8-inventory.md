# ETAP 8 — Moduł magazynowy klubu

**Data:** 2026-05-31  
**Status:** wdrożony

---

## 1. Nowe moduły

| Warstwa | Lokalizacja | Opis |
|---------|-------------|------|
| Migracje SQL | `supabase/migrations/20260602100000_inventory_module.sql` | Tabele, enumy, RLS, triggery stanów, storage |
| Seed | `supabase/migrations/20260602101000_seed_inventory.sql` | 100 pozycji, 25 strojów, wydania, uszkodzenia |
| Audit | `supabase/migrations/20260602102000_inventory_audit_hardening.sql` | RPC dashboardu, AI RLS, indeksy |
| Typy | `src/types/inventory.ts` | Domena magazynowa |
| Lib | `src/lib/inventory/` | constants, mappers, insights (AI + alerty), uploads |
| Server actions | `src/features/inventory/actions.ts` | CRUD, wydania, zwroty, raporty |
| Komponenty | `src/features/inventory/components/` | UI panelu magazynu i portalu zawodnika |
| Strony | `src/app/(dashboard)/inventory/` | Panel magazynu + portal zawodnika |
| Setup | `scripts/setup-stage8.mjs` | `npm run setup:stage8` |

### Trasy

| Trasa | Dostęp | Funkcja |
|-------|--------|---------|
| `/inventory` | owner, president, sports_director, coach | Dashboard magazynu + alerty |
| `/inventory/items` | j.w. | Kartoteka sprzętu |
| `/inventory/issues` | j.w. (coach: wydawanie) | Wydania sprzętu |
| `/inventory/returns` | j.w. | Zwroty |
| `/inventory/damages` | j.w. | Rejestr uszkodzeń |
| `/inventory/kits` | manage: owner, president, sports_director | Stroje zawodników |
| `/inventory/stocktakes` | manage | Inwentaryzacja |
| `/inventory/suppliers` | manage | Dostawcy |
| `/inventory/orders` | manage | Zamówienia |
| `/inventory/reports` | manage (+ coach: opublikowane) | Raporty PDF |
| `/inventory/reports/[id]` | j.w. | Widok raportu |
| `/inventory/portal` | player | Własny sprzęt zawodnika |

---

## 2. Nowe tabele

| Tabela | Opis |
|--------|------|
| `inventory_categories` | Słownik 12 kategorii per klub |
| `inventory_suppliers` | Baza dostawców |
| `inventory_items` | Kartoteka sprzętu ze stanami magazynowymi |
| `inventory_transactions` | Wydania sprzętu |
| `inventory_returns` | Zwroty sprzętu |
| `inventory_damages` | Zgłoszenia uszkodzeń |
| `inventory_player_kits` | Rozmiary strojów zawodnika |
| `inventory_kit_assignments` | Historia wydanych kompletów |
| `inventory_stocktakes` | Sesje inwentaryzacji |
| `inventory_stocktake_lines` | Pozycje inwentaryzacji (stan rzeczywisty vs systemowy) |
| `inventory_purchase_orders` | Zamówienia |
| `inventory_purchase_order_lines` | Pozycje zamówień |
| `inventory_reports` | Raporty magazynowe (JSON + status) |

### Enumy

- `inventory_item_category` — 12 kategorii (stroje, piłki, medyczny, …)
- `inventory_item_status` — available, issued, damaged, retired
- `inventory_recipient_type` — player, coach, team_manager
- `inventory_return_condition` — functional, damaged, lost
- `inventory_damage_status` — reported, in_repair, repaired, replacement_needed
- `inventory_order_status` — draft, ordered, in_progress, delivered, cancelled
- `inventory_stocktake_type` — partial, full
- `inventory_report_type` — stock_status, issued_equipment, damaged_equipment, issue_history
- `ai_report_category` — rozszerzono o **inventory**

---

## 3. Relacje

```
clubs
 ├── inventory_categories
 ├── inventory_suppliers
 ├── inventory_items → categories, suppliers
 ├── inventory_transactions → items, players?, profiles (coach/manager)
 ├── inventory_returns → items, transactions?
 ├── inventory_damages → items
 ├── inventory_player_kits → players
 ├── inventory_kit_assignments → players, items, transactions?
 ├── inventory_stocktakes → profiles (conducted_by)
 ├── inventory_stocktake_lines → stocktakes, items
 ├── inventory_purchase_orders → suppliers
 ├── inventory_purchase_order_lines → orders, items?
 └── inventory_reports → profiles (generated_by)
```

Stany magazynowe (`quantity_total`, `quantity_available`, `quantity_issued`, `quantity_damaged`) aktualizowane automatycznie triggerami przy wydaniu i zwrocie.

---

## 4. Polityki bezpieczeństwa (RLS)

### Funkcje pomocnicze

| Funkcja | Role |
|---------|------|
| `actor_can_manage_inventory(club_id)` | owner, president, sports_director |
| `actor_can_read_inventory(club_id)` | owner, president, sports_director, coach |
| `actor_can_issue_inventory(club_id)` | jak read (trener może wydawać) |
| `actor_can_read_own_inventory(club_id, player_id)` | staff LUB własny zawodnik (`player_id_for_user`) |

### Zasady dostępu

- **Kartoteka, dostawcy, inwentaryzacja, zamówienia** — SELECT dla staff; zarządzanie dla manage.
- **Wydania** — INSERT dla `actor_can_issue_inventory`; SELECT dla staff lub własnych wydań zawodnika.
- **Zwroty** — INSERT dla staff; SELECT dla staff lub zwrotów powiązanych z wydaniami zawodnika.
- **Stroje zawodników** — SELECT przez `actor_can_read_own_inventory`; zarządzanie przez manage.
- **Raporty** — manage: pełny dostęp; coach: tylko `published`.
- **Storage** — `{clubId}/inventory/...` — read: staff; write: manage.
- **Sponsor** — brak dostępu do modułu magazynu.

---

## 5. Alerty magazynowe

Dashboard wykrywa i wyświetla:

- niski stan magazynowy (`quantity_available <= min_stock_level`)
- brak na stanie (`quantity_available = 0`)
- mało piłek (`balls` < 5)
- uszkodzony sprzęt na stanie
- otwarte zgłoszenia usterek
- otwarte zamówienia

RPC: `get_inventory_dashboard_stats(p_club_id)`.

---

## 6. AI Assistant

Kontekst magazynu w `buildInventoryAiContext` — integracja w `buildAiClubContext`.

Przykładowe zapytania:

- pokaż brakujący sprzęt (niski stan)
- pokaż sprzęt do wymiany (uszkodzenia `replacement_needed`)
- pokaż zawodników bez kompletu meczowego
- wygeneruj raport magazynowy (przez `/inventory/reports`)

Kategoria AI: `inventory` w `ai_report_categories`.

---

## 7. Raporty PDF

Typy raportów (druk przeglądarki, `print:`):

- stan magazynu
- wydany sprzęt
- uszkodzony sprzęt
- historia wydań

Generowanie: `generateInventoryReport` → `inventory_reports.content` (JSONB) + opcjonalna narracja AI.

---

## 8. Dane testowe (Piorun Wawrzeńczyce)

| Zasób | Ilość |
|-------|-------|
| Pozycje magazynowe | 100 |
| Kategorie | 12 |
| Dostawcy | 5 |
| Stroje zawodników | 25 |
| Wydania (komplety + piłki) | 26+ |
| Uszkodzenia | 8 |
| Inwentaryzacje | 2 |
| Zamówienia | 3 |
| Raporty | 3 |

---

## 9. Wdrożenie

```bash
npm run setup:stage8
# lub pojedyncza migracja audit:
npm run db:migrate:inventory-audit
```

**Weryfikacja:** `npm run typecheck` | `npm run build`

**Trasy testowe:** `/inventory` (staff) | `/inventory/portal` (zawodnik)

---

## 10. Raport wykonanych prac

Wdrożono kompletny moduł magazynowy ETAP 8 zgodnie z architekturą projektu (wzorzec ETAP 6/7):

- 3 migracje SQL z RLS, triggerami spójności i automatyczną aktualizacją stanów
- 13 komponentów UI + 12 stron App Router (desktop/tablet/mobile)
- Uprawnienia RBAC + izolacja danych zawodnika (portal)
- Alerty dashboardowe + RPC wydajnościowe
- Integracja AI + raporty PDF
- Seed: 100+ elementów, 25 zawodników ze strojami, wydania, uszkodzenia, dostawcy
- Dokumentacja modułu i tabel

Istniejące moduły nie zostały przebudowane — rozszerzono wyłącznie permissions, nawigację, AI context i typy bazy.
