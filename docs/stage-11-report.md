# Raport wykonanych prac — ETAP 11

**Data:** 2026-05-31  
**Klub testowy:** Piorun Wawrzeńczyce  
**Status:** zaimplementowano

---

## Zakres

Kompletny moduł akademii klubowej, rozwoju zawodników i skautingu — bez przebudowy istniejących modułów.

---

## Dostarczone komponenty

### Baza danych
- 12 tabel + 8 enumów PostgreSQL
- RLS z helperami `actor_can_*` (read/manage academy, scouting, own development)
- Migracja audytu: GRANTs, triggery spójności, indeksy
- Seed: 25 zawodników z pełnymi danymi rozwojowymi, skauting, analizy

### Backend / logika
- `src/types/academy.ts` — typy domenowe
- `src/lib/academy/` — constants, mappers, loaders, insights (AI)
- `src/features/academy/actions.ts` — server actions CRUD
- Rozszerzenie `permissions.ts`, `rbac.ts`, `database.ts`, `ai/context.ts`

### UI
- Panel `/academy/*` z sub-nawigacją (responsive, touch 44px)
- Wykresy rozwoju (miesiąc / pół roku / rok / cały okres) + porównanie z drużyną
- Ranking talentów
- Skauting + analiza przeciwników
- Zakładka „Rozwój” w profilu zawodnika

### AI
- Kontekst akademii w Club AI Assistant
- Kategorie `academy` i `scouting`
- Linki do promptów w panelu

---

## Weryfikacja

| Test | Wynik |
|------|-------|
| `npm run typecheck` | ✅ |
| `npm run build` | ✅ |

---

## Wdrożenie

```bash
npm run setup:stage11
```

Wymaga wcześniejszych etapów 1–10 (baza klubu, zawodnicy, profile użytkowników).

---

## Pliki kluczowe

- `supabase/migrations/202606051*.sql`
- `src/app/(dashboard)/academy/`
- `src/features/academy/`
- `docs/modules/stage-11-academy.md`
- `scripts/setup-stage11.mjs`

---

## Uwagi

- Rola `scout` dodana do enum `club_role` (wymaga przypisania w `club_memberships` dla użytkownika skauta).
- Frekwencja w rankingu talentów: placeholder 85% (integracja z modułem treningów możliwa w kolejnym etapie).
- Adaptery PZPN/DZPN bez zmian — ETAP 10 pozostaje niezależny.
