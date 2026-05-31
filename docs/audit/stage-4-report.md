# ETAP 4 — Raport wykonanych prac

**Data:** 2026-05-31  
**Zakres:** Moduł meczowy — planowanie, kalendarz, kadra, formacja, wydarzenia, statystyki, MVP, raport, forma, tabela ligowa, integracje (architektura).

## Podsumowanie

Zaimplementowano kompletny moduł meczowy zgodnie z architekturą projektu (feature-based, server actions, RLS, RBAC). Istniejące moduły nie zostały przebudowane.

## Dostarczone elementy

### Baza danych

| Migracja | Opis |
|----------|------|
| `20260531180000_matches_module.sql` | 7 tabel, 3 enumy, triggery spójności, RLS |
| `20260531181000_seed_matches.sql` | B Klasa 2025/2026, 12 drużyn, 21 meczów, statystyki |
| `20260531182000_matches_audit_hardening.sql` | Indeksy, trigger MVP |

### Backend / logika

- `src/features/matches/actions.ts` — CRUD meczów, kadra, formacja, lineup, wydarzenia, MVP, tabela
- `src/lib/auth/session.ts` — loadery: `getMatches`, `getMatchDetail`, `getLeagueTable`, forma drużyny/zawodników
- `src/types/matches.ts`, `src/lib/matches/*`
- RBAC: `match:read`, `match:manage`, `match:squad`, `match:events`

### UI

- Kalendarz responsywny (miesiąc/tydzień/lista) z filtrami
- Szczegóły meczu: kadra z kontekstem treningowym, formacja drag&drop, wydarzenia, statystyki, MVP
- Raport meczowy z `@media print` / Drukuj PDF
- Tabela ligowa ręczna
- Panel integracji (stub)

### Integracje

- `src/integrations/` — PZPN, DZPN, Extranet — wyłącznie architektura, bez API

### Skrypt setup

- `npm run setup:stage4` — aplikuje 3 migracje ETAP 4

## Weryfikacja

| Test | Wynik |
|------|-------|
| `npm run typecheck` | ✅ Pass |
| `npm run build` | ✅ Pass |
| `npm run setup:stage4` | ⚠️ Timeout sieci (IPv6) — uruchomić lokalnie gdy DB dostępna |

## Dokumentacja

- [docs/modules/stage-4-matches.md](../modules/stage-4-matches.md) — moduły, tabele, relacje, RLS, testy

## Następne kroki (poza ETAP 4)

- Synchronizacja tabeli/meczów z DZPN/PZPN przez warstwę `src/integrations/`
- Automatyczne generowanie PDF (biblioteka) zamiast druku przeglądarki
- Powiadomienia przed meczem (analogicznie do treningów)

## Uwagi

ETAP 4 jest zamknięty funkcjonalnie w kodzie. Migracje należy zastosować na Supabase poleceniem `npm run setup:stage4` po zapewnieniu łączności z bazą.
