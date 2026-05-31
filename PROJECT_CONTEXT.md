# Football Club OS

## Cel projektu

Stworzenie nowoczesnego systemu do zarządzania klubami piłkarskimi od B Klasy do poziomu półprofesjonalnego.

System ma wspierać:

- Zarząd
- Trenerów
- Zawodników
- Rodziców
- Sponsorów
- Kibiców

Docelowo ma być to kompleksowy system operacyjny klubu piłkarskiego wykorzystujący sztuczną inteligencję do automatyzacji codziennych zadań.

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

AI:
- OpenAI API

Hosting:
- GitHub
- Vercel

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
