# Konfiguracja środowiska

## Wymagania

- Node.js 20+
- npm
- Konto Supabase
- Konto Vercel (opcjonalnie do deploy)

## Zmienne środowiskowe

Skopiuj `.env.example` → `.env.local`:

| Zmienna | Scope | Opis |
|---------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | URL projektu Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Klucz anon (bezpieczny z RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Klucz service role — tylko server |

Walidacja: `src/config/env.ts` (Zod).

## Supabase

- Projekt: [pwkqnwqvrdiaycveacxa](https://supabase.com/dashboard/project/pwkqnwqvrdiaycveacxa)
- URL: `https://pwkqnwqvrdiaycveacxa.supabase.co`
- Auth callback URL (produkcja): `https://<twoja-domena>/auth/callback`
- Auth callback URL (local): `http://localhost:3000/auth/callback`

### Redirect URLs w Supabase Dashboard

Dodaj w **Authentication → URL Configuration**:

```
http://localhost:3000/**
https://*.vercel.app/**
```

(dostosuj po podpięciu domeny produkcyjnej)

## Vercel

Zmienne skonfigurowane w projekcie `pilka`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Pobranie env lokalnie:

```bash
vercel env pull .env.local
```

## Komendy

```bash
npm install          # instalacja zależności
npm run dev          # dev server (Turbopack)
npm run build        # build produkcyjny
npm run typecheck    # TypeScript strict check
npm run lint         # ESLint
```

## GitHub

Repozytorium: `https://github.com/dawidthai125/pilka`

Branch główny: `main`

## Checklist wdrożenia

- [x] `.env.example` utworzony
- [x] `.env.local` skonfigurowany lokalnie
- [x] Vercel env variables ustawione
- [ ] GitHub połączony z Vercel (wymaga akcji w dashboard)
- [ ] Migracja foundation zastosowana w Supabase
- [ ] Redirect URLs skonfigurowane w Supabase Auth
