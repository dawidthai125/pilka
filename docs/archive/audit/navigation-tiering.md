# FC OS — Klasyfikacja ekranów (tiering)

**Sprint:** 20.3A  
**Data:** 2026-06-06  
**Metodologia:** częstotliwość użycia × rola docelowa × krytyczność operacyjna

---

## Definicje poziomów

| Poziom | Opis | Kryterium |
|--------|------|-----------|
| **Poziom 1** | Codziennie | Operator / trener / rodzic wchodzi tu w każdej sesji |
| **Poziom 2** | Okresowo | Tygodniowo, przy onboardingu, przy problemach, przy zamknięciu miesiąca |
| **Poziom 3** | Administracyjne | Konfiguracja, diagnostyka, akcje rzadkie lub ryzykowne |

---

## A. Administrator Platformy (`PLATFORM_ADMIN_EMAILS`)

### Poziom 1 — codziennie

| Ekran | Route | Uzasadnienie |
|-------|-------|--------------|
| Platform Dashboard | `/platform` | Pierwszy ekran po logowaniu; KPI + attention + alerty |
| Club Operations Registry | `/platform/clubs` | Główna lista tenantów; lifecycle inline |
| Monitoring Center | `/platform/monitoring` | Health, alerty CRITICAL, Sync History |

### Poziom 2 — okresowo

| Ekran | Route | Uzasadnienie |
|-------|-------|--------------|
| Szczegóły klubu | `/platform/clubs/[clubId]` | Onboarding, aktywacja G1–G5 |
| Create Club Wizard | `/platform/clubs/new` | Przy dodawaniu nowego klubu |
| League Status | `/platform/clubs/[clubId]/league` | Diagnostyka syncu per klub |
| League Setup | `/platform/clubs/[clubId]/league/setup` | Konfiguracja źródeł ligi |
| Audit Center | `/platform/audit` | Śledzenie operacji, compliance |

### Poziom 3 — administracyjne

| Ekran | Route | Uzasadnienie |
|-------|-------|--------------|
| Archive / Restore (inline registry) | akcja na `/platform/clubs` | Destrukcyjne / odwracalne lifecycle |
| Resend Owner Invite (inline) | akcja na `/platform/clubs` | Auth edge cases |
| Ukryj kluby testowe | `?hideTest=1` na registry | Filtr diagnostyczny |
| Strona publiczna klubu (external) | `/{slug}` | Weryfikacja po aktywacji |

---

## B. Właściciel klubu (`owner`)

### Poziom 1 — codziennie

| Ekran | Route | Uzasadnienie |
|-------|-------|--------------|
| Dashboard (Pulpit) | `/dashboard` | Coach Day, mecze, treningi, frekwencja |
| Mecze | `/matches` | Operacje meczowe |
| Treningi | `/training` | Plan tygodnia |
| Zawodnicy | `/players` | Kadra |
| Frekwencja | `/attendance` | Obecności |
| Komunikacja | `/communication` | Ogłoszenia, wiadomości |
| Powiadomienia | `/notifications` | Alerty w aplikacji |

### Poziom 2 — okresowo

| Ekran | Route | Uzasadnienie |
|-------|-------|--------------|
| Rozgrywki (League Hub) | `/league` | Sync, tabela, terminarz |
| Strona klubu | `/website` | CMS, publikacje |
| Finanse | `/finance` | Składki, budżet |
| Club CRM | `/crm` | Kontakty, partnerzy |
| Sponsorzy | `/sponsors` | Partnerzy biznesowi |
| Magazyn / Sprzęt | `/inventory`, `/equipment` | Sezonowe zarządzanie |
| Akademia | `/academy` | Grupy młodzieżowe |
| Urazy | `/injuries` | Rejestr medyczny |
| Treści | `/content` | Social / content calendar |
| Integracje | `/integrations` | Importy, mapowania |
| AI (manager / tasks / chat) | `/ai/*` | Automatyzacja |
| Profil klubu | `/club` | Metadane |
| Role i uprawnienia | `/members` | Zaproszenia, RBAC |

### Poziom 3 — administracyjne

| Ekran | Route | Uzasadnienie |
|-------|-------|--------------|
| Ustawienia aplikacji | `/settings` | PWA, motyw |
| Profil użytkownika | `/profile` | Konto osobiste |
| League: Import / Źródła | `/league/import`, `/league/sources` | Konfiguracja techniczna |
| Integracje: PZPN/DZPN/Extranet | `/integrations/pzpn` itd. | Adaptery |
| Urazy: Kategorie | `/injuries/categories` | Konfiguracja słowników |
| Platform Admin (jeśli owner = operator) | `/platform/*` | SaaS multi-tenant |

---

## C. Administrator klubu (`president` / leadership bez pełnego owner)

Różnice względem owner:

| Tier | Różnica |
|------|---------|
| Poziom 1 | Identyczny — sport + komunikacja |
| Poziom 2 | Brak pełnego **manage** integracji i akademii (read-heavy) |
| Poziom 3 | Mniej adapterów technicznych; więcej finansów i CRM |

---

## D. Trener (`coach`)

### Poziom 1

| Ekran | Route |
|-------|-------|
| Dashboard | `/dashboard` |
| Panel trenera | `/training/coach` |
| Treningi | `/training` |
| Mecze | `/matches` |
| Frekwencja | `/attendance` |
| Zawodnicy | `/players` |
| Komunikacja (coach) | `/communication/coach` |

### Poziom 2

| Ekran | Route |
|-------|-------|
| Urazy (rejestr) | `/injuries` |
| Akademia (grupy) | `/academy` |
| AI Assistant | `/ai` |
| Wideo | `/video` |

### Poziom 3

| Ekran | Route |
|-------|-------|
| Integracje (read) | `/integrations` |
| League Hub (read) | `/league` |
| Ustawienia | `/settings`, `/profile` |

---

## E. Rodzic (`parent` — portal)

### Poziom 1

| Ekran | Route |
|-------|-------|
| Dashboard | `/dashboard` |
| Moje składki | `/finance/portal` |
| Frekwencja | `/attendance` |
| Mecze | `/matches` |
| Komunikacja | `/communication` |

### Poziom 2

| Ekran | Route |
|-------|-------|
| Treningi | `/training` |
| Zawodnicy (podgląd) | `/players` |
| Rozwój (akademia) | `/academy/development` |
| Mój status urazu | `/injuries/portal` |
| Mój sprzęt | `/equipment/portal` |
| Relacje klubu | `/crm/parents` |

### Poziom 3

| Ekran | Route |
|-------|-------|
| Profil / ustawienia | `/profile`, `/settings`, `/club` (read) |

---

## F. Zawodnik (`player` — portal)

### Poziom 1

| Dashboard, Treningi, Mecze, Frekwencja, Komunikacja |

### Poziom 2

| `/league`, `/players`, `/academy/development`, portale sprzętu/urazów |

### Poziom 3

| `/profile`, `/settings` |

---

## G. Sponsor (`sponsor` — portal)

### Poziom 1

| `/dashboard`, `/sponsors/portal`, `/content`, `/communication` |

### Poziom 2–3

| `/profile`, `/club` (read) |

---

## H. Macierz tier × obszar (skrót)

| Obszar | Platform Op | Owner | Coach | Parent |
|--------|-------------|-------|-------|--------|
| Dashboard główny | **L1** | **L1** | **L1** | **L1** |
| Registry / lista | **L1** | — | — | — |
| Monitoring / Health | **L1** | — | — | — |
| Mecze / Treningi | — | **L1** | **L1** | L2 |
| Liga / Sync | L2 | L2 | L3 | — |
| Finanse | — | L2 | — | **L1** (portal) |
| CMS / Website | — | L2 | — | — |
| Audit / Lifecycle destrukcyjne | L2–L3 | — | — | — |
| RBAC / Members | — | L2 | — | — |
| Integracje techniczne | L3 | L3 | L3 | — |

---

## I. Wnioski tieringu

1. **Platform** ma dobrze rozdzielone L1 (dashboard, registry, monitoring) — problem to **nadmiar treści na dashboardzie** (L1+L2+L3 w jednym scrollu), nie brak tierów w menu.
2. **Panel klubu (owner)** ma **~27 pozycji L1–L3 w jednym płaskim sidebarze** — brak wizualnego tieringu w UI.
3. **Funkcje L3** (ustawienia, integracje PZPN, kategorie urazów) są na tym samym poziomie co **L1** (mecze, treningi).
4. **Portale** (parent/player/sponsor) mają sensowny tiering dzięki whitelistom — **najlepszy UX nawigacji w systemie**.

---

*Sprint 20.3A — klasyfikacja ekranów (read-only).*
