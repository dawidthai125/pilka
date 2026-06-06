# Sprint 18.2 — Club Creation Wizard

**Status:** COMPLETE (implementation)  
**Production deploy:** NOT executed  
**Date:** 2026-06-03

---

## Executive summary

Sprint 18.2 przenosi onboarding klubu z CLI (`bootstrap-club.mjs`) do **UI Platform Admin**. Operator platformy tworzy klub przez 5-krokowy kreator bez terminala.

**Wejście:** `/platform/clubs/new`  
**Wymaganie dostępu:** `PLATFORM_ADMIN_EMAILS` w ENV (platform config, nie per-club)

---

## FAZA 1 — Bootstrap Analysis Report

Analiza `scripts/bootstrap-club.mjs` — mapowanie kroków:

| # | Krok | Wejście | Wyjście | Walidacje |
|---|------|---------|---------|-----------|
| 1 | **Create club** | slug, name, officialName, competitionLevel, voivodeship, shortName | `clubs.id` | slug unique, slugify |
| 2 | **Create team** | clubId, shortName, seasonName | `teams.id` | category=s seniors |
| 3 | **Branding** | colors (3× hex), publicName | `website_settings` | hex format |
| 4 | **Content channels** | clubId | 3× content_channels | ON CONFLICT DO NOTHING |
| 5 | **League skeleton** | seasonName, leagueName | season, competition, league_sources | FK chain |
| 6 | **Owner membership** | ownerEmail | user_id + membership | profile lookup / auth invite |
| 7 | **Availability reasons** | 6 default codes | availability_reasons | ON CONFLICT DO NOTHING |

**UI mirror:** `src/lib/platform/club-bootstrap.ts` — ta sama sekwencja SQL w transakcji.

---

## FAZA 2 — Platform Admin Report

`platform_admin` jest **osobny od** `club_memberships` (owner, coach, …):

- Identyfikacja: `PLATFORM_ADMIN_EMAILS` (lista e-maili)
- Brak migracji DB / enum
- `requirePlatformAdmin()` bramkuje `/platform/*`
- Platform admin **nie** omija RLS w panelu klubowym

---

## FAZA 3–6 — UI

| Route | Funkcja |
|-------|---------|
| `/platform/clubs` | Katalog klubów + filtry status |
| `/platform/clubs/new` | 5-krokowy kreator |
| `/platform/clubs/[clubId]` | Onboarding status (Branding, WWW, Liga, Owner, Media) |

---

## FAZA 7 — Safety Audit

**Wynik:** **PASS** (`node scripts/platform-club-safety-audit-182.mjs`)

- Slug collision blocked
- Transaction + rollback
- Action gated by platform admin
- Brak cross-tenant write

---

## FAZA 8 — UX Report

| | CLI | Wizard |
|---|-----|--------|
| Kliknięcia | 0 | ~9 |
| Ekrany | 1 | 6 |
| DevOps | Tak | Nie |

---

## FAZA 9 — Nowe entry points

- `createClub()` — `src/lib/platform/club-bootstrap.ts`
- `createClubAction()` — `src/features/platform/actions.ts`
- `CreateClubWizard` — `src/features/platform/components/create-club-wizard.tsx`

Pełna lista plików w repo diff.

---

## FAZA 10 — Final Verdict

### **TAK** — warunkowo

Nowy klub przez UI **bez CLI, SQL ręcznego, ENV klubu i developera**.

Wymaga: konto na liście `PLATFORM_ADMIN_EMAILS` + istniejąca konfiguracja Supabase (service role, DB password).

---

## Konfiguracja

```env
PLATFORM_ADMIN_EMAILS=admin@twoja-platforma.pl
```

Menu: **Platform — kluby** w dropdown użytkownika (gdy email na liście).
