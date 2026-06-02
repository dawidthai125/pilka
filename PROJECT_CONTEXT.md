# Football Club OS

**Autor systemu:** Dawid Thai Thanh

## Cel projektu

Stworzenie nowoczesnego systemu do zarządzania klubami piłkarskimi od B Klasy do poziomu półprofesjonalnego.

System ma wspierać:

- Zarząd
- Trenerów
- Zawodników
- Rodziców
- Sponsorów
- Kibiców

Docelowo ma być to kompleksowy system operacyjny klubu piłkarskiego wspierający automatyzację codziennych zadań klubu.

## Technologia

Frontend:
- Next.js 15
- React
- TypeScript
- Tailwind CSS
- Shadcn UI

Backend:
- Next.js App Router
- Server Actions

Baza danych:
- Supabase PostgreSQL

Autoryzacja:
- Supabase Auth

Przechowywanie plików:
- Supabase Storage

Realtime:
- Supabase Realtime

Integracje asystenta klubu:
- OpenAI API

Hosting:
- GitHub
- Vercel

## Moduły (ETAPY 1–15A)

- Core: klub, zespoły, członkowie, ustawienia
- Zawodnicy, treningi, mecze
- Asystent klubu + Agent operacyjny klubu
- PWA (offline, push, sync)
- Sponsorzy, finanse, magazyn
- Strona publiczna (CMS)
- Integracje (PZPN, DZPN, Extranet)
- Akademia, skauting, rozwój zawodników
- Video Center (ETAP 14)
- Content Hub (ETAP 15A)

Konsolidacja architektury: ETAP 15.5 — patrz `docs/stage-15.5-report.md`.

## Architektura

System musi być przygotowany jako SaaS Multi-Tenant.

W przyszłości jeden system ma obsługiwać wiele klubów.

Każdy klub ma mieć całkowicie odseparowane dane.

## Zasady projektu

1. Buduj moduł po module.
2. Nie usuwaj istniejących funkcji bez zgody.
3. Nie przebudowuj całego projektu bez zgody.
4. Stosuj TypeScript Strict Mode.
5. Twórz migracje dla każdej zmiany bazy danych.
6. Stosuj Supabase Row Level Security.
7. Projekt musi być zawsze gotowy do wdrożenia.
8. Twórz dokumentację dla każdego modułu.
9. Każdy ukończony etap zapisuj jako osobny commit.
10. Stosuj Clean Architecture i SOLID.
