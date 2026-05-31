# Struktura katalogów

```
pilka/
├── docs/                          # Dokumentacja projektu
│   ├── architecture/
│   ├── database/
│   ├── environment/
│   ├── modules/
│   └── plans/
├── public/                        # Statyczne assety
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (public)/              # Strony publiczne
│   │   ├── (auth)/                # Logowanie / rejestracja (etap 2)
│   │   ├── (dashboard)/           # Panel klubu (chroniony)
│   │   └── auth/                  # Callback OAuth Supabase
│   ├── components/
│   │   ├── ui/                    # Shadcn UI
│   │   └── layout/                # Layouty współdzielone (etap 2+)
│   ├── config/                    # Konfiguracja aplikacji
│   │   ├── env.ts                 # Walidacja zmiennych środowiskowych
│   │   ├── permissions.ts         # Macierz RBAC
│   │   └── site.ts                # Metadane aplikacji
│   ├── features/                  # Moduły biznesowe (etap 3+)
│   │   └── .gitkeep
│   ├── hooks/                     # React hooks (etap 2+)
│   │   └── .gitkeep
│   ├── lib/
│   │   ├── rbac/                  # Logika uprawnień
│   │   ├── supabase/              # Klienty Supabase
│   │   └── utils.ts               # Narzędzia (cn, itp.)
│   ├── types/                     # Typy TS (domain + database)
│   └── middleware.ts              # Odświeżanie sesji Supabase Auth
├── supabase/
│   ├── migrations/                # Migracje SQL (źródło prawdy schematu)
│   └── config.toml                # Konfiguracja CLI
├── .env.example                   # Szablon zmiennych środowiskowych
├── vercel.json                    # Konfiguracja Vercel
├── PROJECT_CONTEXT.md             # Kontekst projektu
└── FIRST_CLUB.md                  # Pierwszy klub testowy
```

## Konwencje modułów (`src/features/`)

Każdy moduł biznesowy (np. `teams`, `members`, `sponsors`) otrzyma strukturę:

```
src/features/<module>/
├── components/       # UI specyficzne dla modułu
├── actions/          # Server Actions
├── schemas/          # Walidacja Zod
├── types.ts          # Typy modułu
└── README.md         # Dokumentacja modułu
```

## Zasady importów

- `@/` → alias do `src/`
- Warstwa prezentacji importuje z `features/`, `components/`, `lib/`
- `lib/supabase/admin.ts` — **tylko** Server Actions / Route Handlers
- Brak importów odwrotnych (infrastructure → presentation)
