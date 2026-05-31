# ETAP 7 — Moduł finansów klubu

**Data:** 2026-06-01  
**Status:** wdrożony

---

## 1. Nowe moduły

| Warstwa | Lokalizacja | Opis |
|---------|-------------|------|
| Migracje SQL | `supabase/migrations/20260601100000_finance_module.sql` | Tabele, enumy, RLS, storage |
| Seed | `supabase/migrations/20260601101000_seed_finance.sql` | 56+ operacji, składki, budżety, raporty |
| Typy | `src/types/finance.ts` | Domena finansowa |
| Lib | `src/lib/finance/` | constants, mappers, insights (AI), uploads |
| Server actions | `src/features/finance/actions.ts` | CRUD, upload, raporty |
| Komponenty | `src/features/finance/components/` | UI dashboardu, formularze, portal rodzica |
| Strony | `src/app/(dashboard)/finance/` | Panel skarbnika + portal rodzica |
| Setup | `scripts/setup-stage7.mjs` | `npm run setup:stage7` |

### Trasy

| Trasa | Dostęp | Funkcja |
|-------|--------|---------|
| `/finance` | owner, president, treasurer, sports_director (odczyt) | Dashboard skarbnika |
| `/finance/income` | j.w. | Przychody |
| `/finance/expenses` | j.w. | Koszty + załączniki |
| `/finance/fees` | j.w. | Składki zawodników |
| `/finance/grants` | j.w. | Dotacje |
| `/finance/budgets` | j.w. | Budżety (plan / wykonanie / różnica) |
| `/finance/documents` | j.w. | Faktury, rachunki, umowy (Storage) |
| `/finance/reports` | j.w. | Raporty miesięczne/kwartalne/roczne |
| `/finance/reports/[id]` | j.w. | Widok PDF raportu |
| `/finance/portal` | parent (własne składki) | Panel rodzica |

---

## 2. Nowe tabele

| Tabela | Opis |
|--------|------|
| `player_guardians` | Powiązanie rodzic ↔ zawodnik |
| `finance_income` | Przychody klubu |
| `finance_expenses` | Koszty + załącznik |
| `finance_fee_plans` | Definicje składek (miesięczne / jednorazowe) |
| `finance_player_fees` | Naliczenia per zawodnik |
| `finance_player_fee_payments` | Historia wpłat |
| `finance_grants` | Dotacje |
| `finance_budgets` | Budżety sezonowe / drużyny / wydarzenia |
| `finance_documents` | Metadane dokumentów w Storage |
| `finance_reports` | Raporty finansowe (JSON + status) |

### Enumy

- `finance_income_category` — sponsorzy, składki, dotacje, darowizny, sprzedaż, inne
- `finance_expense_category` — sprzęt, stroje, sędziowie, transport, boisko, treningi, marketing, administracja, inne
- `finance_player_fee_status` — paid, partial, overdue
- `finance_grant_status` — planned, active, completed
- `finance_budget_type` — season, team, event
- `finance_document_type` — invoice, receipt, contract
- `finance_report_period` — monthly, quarterly, yearly
- `club_role` — rozszerzono o **treasurer** (skarbnik)

---

## 3. Relacje

```
clubs
 ├── player_guardians → players, profiles (rodzic)
 ├── finance_income → sponsors?, finance_grants?, finance_player_fees?, profiles (created_by)
 ├── finance_expenses → profiles (created_by)
 ├── finance_fee_plans → teams?
 ├── finance_player_fees → players, finance_fee_plans
 ├── finance_player_fee_payments → finance_player_fees, profiles (recorded_by)
 ├── finance_grants
 ├── finance_budgets → teams?
 ├── finance_documents → income/expense/sponsor/grant?, profiles (uploaded_by)
 └── finance_reports → profiles (generated_by)
```

Wykonanie budżetu liczone dynamicznie z sumy `finance_expenses` w okresie budżetu.

---

## 4. Polityki bezpieczeństwa (RLS)

### Funkcje pomocnicze

| Funkcja | Role |
|---------|------|
| `actor_can_manage_finance(club_id)` | owner, president, treasurer |
| `actor_can_read_finance(club_id)` | owner, president, treasurer, sports_director |
| `actor_can_access_finance_portal(club_id)` | parent z wpisem w `player_guardians` |
| `parent_player_ids(club_id)` | ID zawodników powiązanych z `auth.uid()` |

### Zasady dostępu

- **Przychody, koszty, dotacje, budżety, dokumenty, raporty** — SELECT dla `actor_can_read_finance`; INSERT/UPDATE/DELETE dla `actor_can_manage_finance`.
- **Składki zawodników** — SELECT dla staff LUB `player_id IN parent_player_ids()`; zarządzanie tylko staff.
- **Wpłaty składek** — SELECT dla staff LUB wpłaty powiązanych składek zawodnika rodzica.
- **Storage `{clubId}/finance/**`** — odczyt staff; zapis staff z `actor_can_manage_finance`.
- **Triggery spójności** — `club_id` na składkach, wpłatach, opiekunach.

Rodzic **nie widzi** danych innych zawodników (RLS + `player_guardians`).

---

## 5. Uprawnienia aplikacji (RBAC)

| Rola | finance:read | finance:manage | finance:portal |
|------|:---:|:---:|:---:|
| owner | ✅ | ✅ | — |
| president | ✅ | ✅ | — |
| treasurer | ✅ | ✅ | — |
| sports_director | ✅ | — | — |
| coach | — | — | — |
| player | — | — | — |
| parent | — | — | ✅ |
| sponsor | — | — | — |

---

## 6. Integracja AI

- `buildFinanceAiContext()` — zaległe składki, koszty, saldo, sponsorzy bez wpłaty.
- Sekcja `finance` w `buildAiClubContext()` — kontekst dla Club AI Assistant.
- Kategoria raportów AI: **Finanse klubu** (`ai_report_category: finance`).

Przykładowe pytania: zaległe składki, koszty sezonu, sponsorzy bez wpłaty, raport miesięczny.

---

## 7. Dane testowe (Piorun Wawrzeńczyce)

| Element | Ilość |
|---------|-------|
| Przychody | 28 |
| Koszty | 28 |
| Składki zawodników | 75 (25 zawodników × 3) |
| Dotacje | 3 |
| Budżety | 3 (sezon, drużyna, wydarzenie) |
| Dokumenty | 3 |
| Raporty | 3 (miesięczny, kwartalny, roczny) |

**Konta testowe:**

| Email | Rola | Hasło |
|-------|------|-------|
| skarbnik@piorun.test | treasurer | Piorun2026! |
| rodzic@piorun.test | parent | Piorun2026! |

Rodzic powiązany z zawodnikiem **Marcin Lewandowski** (`/finance/portal`).

---

## 8. Wdrożenie

```bash
npm run setup:stage7
```

Wymaga `SUPABASE_DB_PASSWORD` w `.env.local`.  
Dla nowego użytkownika skarbnika: `npm run setup:stage1` (zaktualizowany o `skarbnik@piorun.test`).

---

## 9. Weryfikacja

- `npm run typecheck` — ✅
- `npm run build` — ✅

---

## 10. Werdykt

**ETAP 7 zakończony.** Moduł finansowy obejmuje przychody, koszty, składki, dotacje, budżety, dokumenty, raporty PDF, dashboard skarbnika, panel rodzica i integrację AI — zgodnie z architekturą projektu, bez przebudowy istniejących modułów.
