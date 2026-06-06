# 03 — Mapa tras (routing)

Grupy Next.js App Router w `src/app/`.

## `(public)` — strona klubu (bez logowania)

Layout: `src/app/(public)/layout.tsx` · ISR **300 s** · font Oswald

| Trasa | Plik | Funkcja |
|-------|------|---------|
| `/` | `page.tsx` | Landing: hero, news, mecze, tabela skrót, top strzelcy, akademia |
| `/aktualnosci` | `aktualnosci/page.tsx` | Lista newsów |
| `/aktualnosci/[slug]` | `aktualnosci/[slug]/page.tsx` | Artykuł |
| `/druzyna` | `druzyna/page.tsx` | Kadra + statystyki sezonu |
| `/mecze` | `mecze/page.tsx` | Terminarz / wyniki (moduł `matches`) |
| `/tabela` | `tabela/page.tsx` | Tabela ligowa (`league_table_entries`) |
| `/galeria` | `galeria/page.tsx` | Albumy |
| `/galeria/[slug]` | `galeria/[slug]/page.tsx` | Album |
| `/kontakt` | `kontakt/page.tsx` | Dane kontaktowe z CMS |
| `/sponsorzy` | `sponsorzy/page.tsx` | Sponsorzy publiczni |
| `/kibic` | `kibic/page.tsx` | Panel kibica (uproszczony) |

**Nie ma** osobnej trasy `/akademia` — sekcja na `/` jako `/#akademia` (`PUBLIC_NAV_LINKS`).

**Middleware (P0):** trasy publiczne **nie** wołają `supabase.auth.getUser()`.

## `(auth)` — logowanie

| Trasa | Funkcja |
|-------|---------|
| `/login` | Logowanie |
| `/register` | Rejestracja (może być wyłączona env) |
| `/forgot-password` | Reset hasła |
| `/reset-password` | Ustawienie nowego hasła |

## `(dashboard)` — panel klubu (chroniony)

Layout: sidebar + mobile bottom nav · wymaga sesji

### Rdzeń operacyjny

| Trasa | Moduł | Funkcja |
|-------|--------|---------|
| `/dashboard` | dashboard | Coach Day, skróty |
| `/club` | club | Profil klubu |
| `/teams` | teams | Drużyny |
| `/players` | players | Zawodnicy FC OS |
| `/players/[id]` | players | Profil zawodnika |
| `/training` | training | Treningi |
| `/training/[id]` | training | Szczegóły treningu |
| `/training/coach` | training | Panel trenera |
| `/matches` | matches | Mecze klubu |
| `/matches/[id]` | matches | Szczegóły meczu |
| `/matches/league-table` | matches | Tabela w module Mecze |
| `/attendance` | attendance | Frekwencja |
| `/attendance/matches/[matchId]` | attendance | Lista obecności mecz |

### Liga i integracje

| Trasa | Funkcja |
|-------|---------|
| `/league` | Przegląd League Hub |
| `/league/table` | Tabela mirror |
| `/league/fixtures` | Terminarz mirror |
| `/league/players` | Rejestr ligowy |
| `/league/sync` | **Ostatni sync**, joby, logi |
| `/league/import` | Import ręczny |
| `/league/sources` | Źródła |
| `/league/teams` | Mapowanie nazw drużyn |
| `/integrations/*` | PZPN, Extranet, mapowania (plan / UI) |

### Strona i treści

| Trasa | Funkcja |
|-------|---------|
| `/website` | CMS strony |
| `/website/news` | Aktualności |
| `/website/branding` | Logo, kolory, hero |
| `/website/gallery` | Galeria CMS |
| `/website/media` | Sloty mediów (hero, team, academy, …) |
| `/website/social` | Linki social |
| `/content/*` | Content Hub |
| `/communication/*` | Ogłoszenia, czaty |

### Biznes i wsparcie

| Trasa | Funkcja |
|-------|---------|
| `/finance/*` | Przychody, koszty, składki, budżety |
| `/finance/portal` | Portal rodzica — składki |
| `/sponsors/*` | Sponsorzy |
| `/sponsors/portal` | Portal sponsora |
| `/inventory/*` | Magazyn klubu |
| `/inventory/portal` | Portal zawodnika — sprzęt |
| `/equipment/*` | Assets, zestawy, serwis |
| `/equipment/portal` | Portal sprzętu |
| `/crm/*` | Kontakty, zadania, darowizny |
| `/injuries/*` | Rejestr urazów |
| `/injuries/portal` | Portal zawodnika |
| `/academy/*` | Akademia, scouting, talenty |

### AI i wideo

| Trasa | Funkcja |
|-------|---------|
| `/ai` | Club AI Assistant |
| `/ai/chat` | Rozmowy |
| `/ai/reports` | Raporty AI |
| `/ai/manager` | AI Club Manager |
| `/ai/tasks` | Zadania agenta |
| `/video/*` | Video Center |

### System

| Trasa | Funkcja |
|-------|---------|
| `/profile` | Profil użytkownika |
| `/settings` | Ustawienia, PWA |
| `/members` | **Członkowie** — zarządzanie członkami, zaproszenia, macierz RBAC |
| `/notifications` | Powiadomienia |

Nawigacja filtrowana RBAC: `src/config/navigation.ts` + `DashboardNav`.

## API Routes

| Endpoint | Metoda | Auth | Funkcja |
|----------|--------|------|---------|
| `/api/cron/league-sync` | GET/POST | Bearer `CRON_SECRET` | Pełny `sync-league-live` |
| `/api/pwa/push/dispatch` | POST | `PWA_CRON_SECRET` | Wysyłka push |
| `/api/pwa/push/subscribe` | POST | User session | Subskrypcja |
| `/api/pwa/offline-data` | GET | Własna | Dane offline PWA |
| `/auth/callback` | GET | OAuth | Supabase callback |

## SEO / systemowe

| Trasa | Funkcja |
|-------|---------|
| `/sitemap.xml` | Sitemap publiczny |
| `/robots.txt` | Robots |
| `/manifest.webmanifest` | PWA manifest |

## Middleware — co jest chronione

`src/middleware.ts` — `protectedPrefixes` m.in.:

`/dashboard`, `/players`, `/matches`, `/league`, `/website`, `/finance`, …

**Uwaga:** `/matches` w panelu ≠ `/mecze` na stronie publicznej (różne ścieżki).
