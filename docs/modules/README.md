# Moduły — Football Club OS

Dokumentacja poszczególnych modułów biznesowych będzie tworzona etapami zgodnie z [planem realizacji](../plans/implementation-plan.md).

## Status modułów

| Moduł | Katalog | Status |
|-------|---------|--------|
| Fundament | — | ✅ Ukończony |
| ETAP 1 — Auth i klub | [stage-1-auth-and-club.md](./stage-1-auth-and-club.md) | ✅ Ukończony |
| ETAP 2 — Zawodnicy | [stage-2-players.md](./stage-2-players.md) | ✅ Ukończony |
| Autoryzacja (rozszerzenia) | `features/auth/` | Planowany |
| Członkostwo | `features/members/` | Planowany |
| Drużyny | `features/teams/` | Częściowo (ETAP 1) |
| Zawodnicy | `features/players/` | ✅ ETAP 2 |
| Treningi | [stage-3-trainings.md](./stage-3-trainings.md) | ✅ ETAP 3 |
| Mecze | [stage-4-matches.md](./stage-4-matches.md) | ✅ ETAP 4 |
| Komunikacja | `features/communication/` | Planowany (Faza 7) |
| Sponsorzy | `features/sponsors/` | Planowany (Faza 8) |
| AI | `features/ai/` | Planowany (Faza 9) |

## Szablon dokumentacji modułu

Każdy ukończony moduł otrzymuje plik `docs/modules/<module>/README.md` zawierający:

1. Cel modułu
2. Role i uprawnienia
3. Schemat bazy danych
4. Server Actions / API
5. Komponenty UI
6. Instrukcja testowania
