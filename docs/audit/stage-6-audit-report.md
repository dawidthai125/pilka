# Raport audytu — ETAP 6 (Moduł sponsorów)

**Data:** 2026-05-31  
**Zakres:** bezpieczeństwo danych sponsorów, RLS, panel sponsora, izolacja danych, raporty PDF, wydajność zapytań, TypeScript, mobile  
**Status po audycie:** poprawki wdrożone

---

## Podsumowanie

| Obszar | Ocena przed | Ocena po | Naprawione |
|--------|-------------|----------|------------|
| Bezpieczeństwo danych sponsorów | ⚠️ Średnie | ✅ Dobre | 4 |
| Polityki RLS | ⚠️ Średnie | ✅ Dobre | 2 (DB) + 3 triggery |
| Panel sponsora | ⚠️ Średnie | ✅ Dobre | 3 |
| Dostęp sponsorów (własne dane) | ⚠️ Krytyczne | ✅ Dobre | 3 |
| Raporty PDF | ⚠️ Średnie | ✅ Dobre | 3 |
| Wydajność zapytań | ⚠️ Średnie | ✅ Dobre | 6 |
| TypeScript | ⚠️ Średnie | ✅ Dobre | 1 |
| Mobile / responsywność | ⚠️ Średnie | ✅ Dobre | 5 |

**Weryfikacja:** `npm run typecheck` — ✅ | `npm run build` — ✅  
**Migracja audytu:** `20260531202000_sponsors_audit_hardening.sql` (skrypt: `npm run db:migrate:sponsors-audit`)

---

## 1. Bezpieczeństwo danych sponsorów

### Znalezione problemy

1. **Sponsor mógł odczytać raporty ze statusem `draft` przez API** — polityka `sponsor_reports_select` nie wymagała `status = 'published'` dla roli sponsor.
2. **Sponsor widział wszystkie publikacje klubu** — `sponsor_publications_select` używało `actor_is_sponsor_user(club_id)` bez filtrowania po linkach do własnego rekordu sponsora.
3. **Brak walidacji `sponsorIds` w `createSponsorPublication`** — ryzyko powiązania publikacji z cudzym sponsorem w tym samym klubie (przy obejściu UI).
4. **Finanse sponsora ładowane dla każdego użytkownika z dostępem do szczegółów** — niepotrzebny odczyt wrażliwych danych przy widoku portalowym.

### Wdrożone poprawki

- Migracja RLS: sponsor widzi raporty wyłącznie opublikowane; publikacje wyłącznie powiązane przez `sponsor_publication_links`.
- `src/features/sponsors/actions.ts` — walidacja `sponsorIds` względem klubu przed insertem linków; batch insert zamiast pętli N+1.
- `getSponsorDetail(..., includeFinancial)` — finanse ładowane tylko gdy `canManageSponsors(access.roles)` (`sponsors/[id]/page.tsx`).

---

## 2. Polityki RLS i baza danych

### Stan przed audytem

Podstawowe RLS modułu sponsorów było skonfigurowane (`actor_can_*`, `actor_is_sponsor_user`, `sponsor_id_for_user`), lecz dwie polityki SELECT umożliwiały wyciek danych między sponsorami. Brakowało triggerów spójności `club_id` na tabelach powiązanych.

### Wdrożone poprawki (`20260531202000_sponsors_audit_hardening.sql`)

- **`sponsor_reports_select`** — sponsor: `status = 'published'` + `sponsor_id = sponsor_id_for_user(...)`.
- **`sponsor_publications_select`** — sponsor: EXISTS w `sponsor_publication_links` dla własnego `sponsor_id`.
- **Triggery spójności `club_id`:**
  - `sponsor_publication_links_enforce_club`
  - `sponsor_contract_attachments_enforce_club`
  - `sponsor_financial_entries_enforce_club`
- **`UNIQUE (club_id, profile_id)`** na `sponsors` — jeden profil = jeden rekord sponsora w klubie.
- **Indeksy wydajnościowe:** kontrakty (`club_id`, `end_date`), publikacje (`club_id`, `published_at DESC`).
- **RPC `get_sponsor_portal_schedule(p_club_id, p_team_id)`** — terminarz/wyniki bez dostępu do tabeli `matches` przez RLS zawodników; SECURITY DEFINER z warunkiem `actor_is_sponsor_user`.

---

## 3. Panel sponsora

### Znalezione problemy

1. **Hardcoded `teamId`** w `getSponsorPortalData` — terminarz i wyniki zawsze puste.
2. **RLS meczów blokuje sponsorów** — bezpośrednie zapytania do `matches` nie zwracały danych.
3. **Brak stanów pustych** — puste listy meczów bez komunikatu dla użytkownika.

### Wdrożone poprawki

- `getSponsorPortalData` — `getTeams()` + pierwsza drużyna klubu; wywołanie RPC `get_sponsor_portal_schedule`.
- `sponsor-portal-view.tsx` — komunikaty „Brak zaplanowanych meczów” / „Brak wyników do wyświetlenia”.
- `dashboard-nav.tsx` — nawigacja sponsora ograniczona do `SPONSOR_ONLY_HREFS` (dashboard, profil, klub, portal).

---

## 4. Dostęp sponsorów wyłącznie do własnych danych

### Potwierdzenie po poprawkach

| Zasób | Mechanizm izolacji |
|-------|-------------------|
| Rekord sponsora | RLS: `profile_id = auth.uid()` / `sponsor_id_for_user` |
| Kontrakty, notatki, ekspozycja | RLS: `sponsor_id = sponsor_id_for_user(...)` |
| Raporty | RLS + `status = 'published'` dla sponsora |
| Publikacje | RLS + link w `sponsor_publication_links` |
| Finanse | RLS tylko dla `actor_can_manage_sponsors`; app nie ładuje dla roli sponsor |
| Terminarz/wyniki | RPC z warunkiem `actor_is_sponsor_user`; wyłącznie pola publiczne meczu |

**Potwierdzenie:** sponsor nie ma ścieżki do danych innego sponsora ani draftów raportów klubu.

---

## 5. Raporty PDF

### Znalezione problemy

1. **Publikacje w treści raportu nie filtrowane okresem** — `buildSponsorReportContent` zwracał wszystkie publikacje sponsora.
2. **Słabe style druku** — brak `print:` klas jak w module meczów.
3. **`publishSponsorReport` bez warunku draft** — ryzyko ponownej publikacji / race condition.

### Wdrożone poprawki

- `src/lib/sponsors/insights.ts` — filtrowanie publikacji po `periodStart` / `periodEnd`; `.eq("club_id", clubId)`.
- `sponsor-report-view.tsx` — `print:max-w-none`, `print:border-0`, `print:bg-white`, `break-inside-avoid` na sekcjach.
- `publishSponsorReport` — `.eq("status", "draft")` w UPDATE.
- `generateSponsorReport` — nazwa klubu z `getClub` / `getClubBrandingName` w prompcie OpenAI (zamiast nazwy sponsora).

---

## 6. Wydajność zapytań

### Znalezione problemy

1. **`syncSponsorContractReminders` w `getDashboardContext()`** — kosztowna synchronizacja przy każdym ładowaniu layoutu.
2. **Brak limitów** w loaderach list (sponsorzy, leady, publikacje, kontrakty).
3. **N+1 przy tworzeniu publikacji** — insert linków w pętli.
4. **Brak indeksów** na często filtrowanych kolumnach kontraktów i publikacji.

### Wdrożone poprawki

- `syncSponsorContractReminders` przeniesione na `/sponsors` — tylko dla `canManageSponsors`.
- Limity w `session.ts`: sponsors (500), leads (100), publications (100), kontrakty w stats (200), sync contracts (100).
- Batch insert linków publikacji i ekspozycji w `actions.ts`.
- Indeksy w migracji audytu.

---

## 7. Mobile / responsywność

### Wdrożone poprawki

- `min-h-[44px]` na polach `<select>` i filtrach: `sponsor-form.tsx`, `sponsor-detail-view.tsx`, `sponsor-publication-form.tsx`, `sponsors-list.tsx`, `sponsor-leads-panel.tsx`.
- Portal i raporty — responsywne layouty zachowane; stany pustych list czytelne na wąskich ekranach.

---

## 8. TypeScript

### Znalezione problemy

- `getSponsorDetail` — `Promise.all` z mieszanym typem (`includeFinancial`) powodował błędy TS18046 / TS2345.

### Wdrożone poprawki

- Rozdzielenie zapytań finansowych od głównego `Promise.all`; typ `Database["public"]["Tables"]["sponsor_financial_entries"]["Row"][]`.
- Typ RPC `get_sponsor_portal_schedule` w `src/types/database.ts`.

**Wynik:** `npm run typecheck` — brak błędów.

---

## 9. Pliki zmienione

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/20260531202000_sponsors_audit_hardening.sql` | RLS, triggery, indeksy, RPC |
| `src/lib/auth/session.ts` | Limity, portal RPC, finanse opcjonalne, usunięto sync z layoutu |
| `src/features/sponsors/actions.ts` | Walidacja sponsorIds, batch insert, draft-only publish, prompt klubu |
| `src/lib/sponsors/insights.ts` | Filtrowanie publikacji okresem, limity |
| `src/components/layout/dashboard-nav.tsx` | Nawigacja tylko dla sponsora |
| `src/app/(dashboard)/sponsors/page.tsx` | Sync przypomnień kontraktów |
| `src/app/(dashboard)/sponsors/[id]/page.tsx` | `includeFinancial` wg roli |
| `src/features/sponsors/components/sponsor-report-view.tsx` | Style `print:` |
| `src/features/sponsors/components/sponsor-portal-view.tsx` | Stany pustych list |
| `src/features/sponsors/components/sponsor-detail-view.tsx` | `noopener noreferrer`, touch targets |
| `src/features/sponsors/components/sponsor-form.tsx` | Touch targets |
| `src/features/sponsors/components/sponsor-publication-form.tsx` | Touch targets |
| `src/features/sponsors/components/sponsors-list.tsx` | Touch targets |
| `src/features/sponsors/components/sponsor-leads-panel.tsx` | Touch targets |
| `src/types/database.ts` | Typ RPC |
| `scripts/setup-stage6.mjs` | Migracja audytu w setup |
| `package.json` | `db:migrate:sponsors-audit` |
| `docs/audit/stage-6-audit-report.md` | Ten raport |

---

## 10. Instrukcja wdrożenia migracji

```bash
npm run db:migrate:sponsors-audit
# lub pełny setup ETAP 6 (nowe środowisko):
npm run setup:stage6
```

**Test konta sponsora:** `sponsor@piorun.test` → Budmax Sp. z o.o. (portal: `/sponsors/portal`).

Wymagane zmienne: `SUPABASE_DB_PASSWORD` (migracje), opcjonalnie `OPENAI_API_KEY` (generowanie raportów).

---

## 11. Werdykt

**ETAP 6 — audyt zakończony.** Moduł sponsorów spełnia wymagania bezpieczeństwa danych, izolacji per sponsor, wydajności i użyteczności mobilnej. Brak nowych funkcji — wyłącznie poprawki audytowe.

**Konto testowe:** po migracji audytu sponsor widzi wyłącznie własne raporty (published), publikacje, kontrakty i terminarz drużyny seniorów.
