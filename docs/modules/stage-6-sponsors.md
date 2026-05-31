# ETAP 6 — Moduł sponsorów i partnerów

Dokumentacja techniczna modułu CRM sponsorów klubu piłkarskiego.

## Zakres

| # | Funkcja | Status |
|---|---------|--------|
| 1 | CRM sponsorów (dane firmy, kontakt, status współpracy) | ✅ |
| 2 | Umowy sponsorskie z załącznikami PDF (URL) | ✅ |
| 3 | Powiadomienia 90/60/30/14/7 dni przed końcem umowy | ✅ |
| 4 | Panel sponsora (umowy, raporty, publikacje, terminarz, wyniki) | ✅ |
| 5 | Publikacje sponsorskie z powiązanymi sponsorami | ✅ |
| 6 | Historia ekspozycji marki | ✅ |
| 7 | Raport sponsora PDF (druk) + generowanie AI | ✅ |
| 8 | CRM leadów potencjalnych sponsorów | ✅ |
| 9 | Historia kontaktów (telefon, spotkanie, email, notatka) | ✅ |
| 10 | Integracja AI (kontekst sponsorów w Club AI Assistant) | ✅ |
| 11 | Architektura finansowa (wpłaty, raty, faktury — bez księgowości) | ✅ |
| 12 | RLS + RBAC + seed Piorun Wawrzeńczyce | ✅ |

## Architektura

```
src/features/sponsors/
├── actions.ts
└── components/
    ├── sponsor-form.tsx
    ├── sponsor-detail-view.tsx
    ├── sponsors-list.tsx
    ├── sponsors-dashboard-stats.tsx
    ├── sponsor-status-badge.tsx
    ├── sponsor-leads-panel.tsx
    ├── sponsor-publications-list.tsx
    ├── sponsor-publication-form.tsx
    ├── sponsor-portal-view.tsx
    └── sponsor-report-view.tsx

src/lib/sponsors/
├── constants.ts
├── mappers.ts
├── notifications.ts
└── insights.ts

src/app/(dashboard)/sponsors/
├── page.tsx
├── new/page.tsx
├── [id]/page.tsx
├── leads/page.tsx
├── publications/page.tsx
├── publications/new/page.tsx
├── portal/page.tsx
└── reports/[id]/page.tsx
```

## Tabele bazy danych

### `sponsors`

Główna encja CRM — dane firmy, osoba kontaktowa, status współpracy, opcjonalne `profile_id` (powiązanie z kontem sponsora).

### `sponsor_contracts`

Umowy: nazwa, daty, wartość, waluta, opis świadczeń, status (auto z triggera wg daty końca).

### `sponsor_contract_attachments`

Metadane załączników PDF (URL).

### `sponsor_leads`

Leady CRM ze statusami lejka sprzedażowego.

### `sponsor_notes`

Historia kontaktów z autorem i datą.

### `sponsor_publications` + `sponsor_publication_links`

Publikacje medialne i powiązania M:N ze sponsorami.

### `sponsor_exposure`

Rejestr ekspozycji: publikacja, mecz sponsorowany, wydarzenie.

### `sponsor_reports`

Raporty okresowe (JSON + opcjonalne podsumowanie AI).

### `sponsor_financial_entries`

Przygotowanie pod moduł finansowy: wpłaty, raty, faktury.

## Relacje

```
clubs ──< sponsors ──< sponsor_contracts ──< sponsor_contract_attachments
                 ├──< sponsor_notes
                 ├──< sponsor_exposure
                 ├──< sponsor_reports
                 └──< sponsor_financial_entries

sponsor_publications ──< sponsor_publication_links >── sponsors
sponsor_exposure ──> sponsor_publications (opcjonalnie)
sponsor_exposure ──> matches (opcjonalnie)
sponsors.profile_id ──> profiles (konto panelu sponsora)
club_notifications.sponsor_contract_id ──> sponsor_contracts
```

## Polityki bezpieczeństwa (RLS)

| Rola | Dostęp |
|------|--------|
| Właściciel, Prezes | Pełny CRUD (`actor_can_manage_sponsors`) |
| Dyrektor Sportowy | Odczyt CRM i umów (`actor_can_read_sponsors`, `actor_can_read_sponsor_contracts`) |
| Trener | Brak dostępu do modułu sponsorów |
| Sponsor (rola) | Własny rekord + umowy + opublikowane raporty (`sponsor_id_for_user`) |
| Zawodnik / Rodzic | Brak dostępu |

Funkcje DB: `sponsor_id_for_user`, `actor_can_manage_sponsors`, `actor_can_read_sponsors`, `actor_can_read_sponsor_contracts`, `actor_is_sponsor_user`, `actor_can_access_sponsor_row`.

## Powiadomienia

`syncSponsorContractReminders()` — wywoływane z `getDashboardContext()` dla właściciela/prezesa. Tworzy wpisy w `club_notifications` z deduplikacją `(user_id, sponsor_contract_id, sponsor_reminder_days)`.

## AI

Sekcja `sponsors` w kontekście JSON Club AI Assistant (`buildAiClubContext` + `buildSponsorAiContext`):

- sponsorzy wygasający w 60 dni
- wartość aktywnych umów
- sponsorzy bez kontaktu od 30 dni

Generowanie raportu sponsora wykorzystuje OpenAI (opcjonalnie) w `generateSponsorReport`.

## Uprawnienia aplikacji

- `sponsor:read` — owner, president, sports_director
- `sponsor:manage` — owner, president
- `sponsor:portal` — rola sponsor

## Instalacja

```bash
npm run setup:stage6
```

Wymaga `SUPABASE_DB_PASSWORD` w `.env.local`.

## Konto testowe

- Email: `sponsor@piorun.test` / hasło: `Piorun2026!`
- Powiązany sponsor: **Budmax Sp. z o.o.** (seed)

## Seed danych

10 sponsorów, 5 aktywnych umów, 3 leady, 4 wpisy historii kontaktów, 3 publikacje, ekspozycja marki, 1 raport opublikowany, wpisy finansowe (raty/faktury).
