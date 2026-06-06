# Raport ETAP 2 — Moduł zawodników

**Data:** 2026-05-31  
**Klub:** Piorun Wawrzeńczyce  
**Zakres:** Pełny moduł zawodników zgodny z architekturą ETAP 1

## Podsumowanie wykonanych prac

Zaimplementowano kompletny moduł zarządzania zawodnikami obejmujący bazę danych, warstwę aplikacji, UI panelu klubu, integrację Supabase Storage oraz dokumentację techniczną.

## Baza danych

| Element | Liczba / opis |
|---------|----------------|
| Nowe tabele | 6 (`players`, `player_documents`, `player_stats`, `player_club_history`, `player_injuries`, `player_coach_notes`) |
| Nowe enumy | 6 |
| Funkcje RLS | 4 (`actor_is_coaching_staff`, `actor_can_manage_players`, `actor_can_read_players`, `get_document_validity_status`) |
| Triggery | Auto-historia przy UPDATE zawodnika |
| Storage bucket | `club-assets` (prywatny, max 10 MB, PDF/JPG/PNG/WebP) |
| Seed | 25 zawodników drużyny Seniorzy |

## Aplikacja

| Warstwa | Pliki |
|---------|-------|
| Server Actions | `src/features/players/actions.ts` |
| Loaders | Rozszerzenie `src/lib/auth/session.ts` |
| UI | 5 komponentów + 3 strony dashboard |
| RBAC | 3 nowe uprawnienia w macierzy ról |
| Nawigacja | Pozycja „Zawodnicy” w menu |
| Middleware | Ochrona `/players/*` |
| Dashboard | Kafelek zawodników + panel alertów dokumentów |

## Bezpieczeństwo

- Row Level Security na wszystkich tabelach modułu
- Notatki trenerskie — wyłącznie `actor_is_coaching_staff`
- Sponsor bez dostępu do modułu zawodników
- Pliki w Storage z politykami opartymi o `club_id` w ścieżce
- Signed URLs do pobierania dokumentów (1 h)

## Powiadomienia

System wykrywa dokumenty wygasające w horyzoncie 30 / 14 / 7 dni oraz wygasłe. Alerty sortowane priorytetem i widoczne na dashboardzie z linkiem do profilu zawodnika.

## Zgodność z ETAP 1

- Bez przebudowy istniejącego kodu — rozszerzenie struktury `features/`, `lib/`, migracji
- Ten sam wzorzec Server Actions + RSC + `useActionState`
- `DEFAULT_CLUB_ID` i `requireAccessContext()` bez zmian kontraktu
- Shadcn UI + Tailwind, layout responsywny

## Uruchomienie

```bash
npm run setup:stage2
npm run dev
```

Zaloguj jako `trener@piorun.test` / `Piorun2026!` — pełny dostęp do modułu.

## Pliki dokumentacji

- [`docs/modules/stage-2-players.md`](stage-2-players.md) — dokumentacja techniczna
- [`docs/audit/stage-2-audit-report.md`](../audit/stage-2-audit-report.md) — raport audytu i poprawki

## Znane ograniczenia (świadome)

- Brak powiązania konta użytkownika ↔ rekord zawodnika (planowane w przyszłym etapie)
- Statystyki edytowane ręcznie — moduł meczów doda automatyzację
- Seed dokumentów bez fizycznych plików w Storage (metadane do testów alertów)
- Upload zdjęć wymaga skonfigurowanego bucketu po `setup:stage2`
