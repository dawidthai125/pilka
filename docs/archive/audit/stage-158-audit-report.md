# ETAP 15.8 — Club CRM & Relationship Management — Raport audytu końcowego

**Data audytu:** 2026-05-31  
**Status:** ✅ PASS  
**Zakres:** RLS, sponsor pipeline, darowizny, zadania CRM, wydarzenia CRM, rodzice, wolontariusze, AI CRM Assistant, wszystkie role testowe  

---

## 1. Podsumowanie wykonawcze

Przeprowadzono **pełny audyt** modułu **Club CRM** (`/crm`) — w tym testy live RLS na wszystkich rolach testowych klubu Piorun. Wykryto i naprawiono **2 problemy bezpieczeństwa/danych** przed zamknięciem etapu.

| Warstwa | Wynik |
|---------|-------|
| Typecheck | ✅ PASS |
| Build produkcyjny | ✅ PASS (133 trasy, w tym `/crm/*`) |
| Audyt statyczny (`audit:stage158`) | **12/12 PASS** |
| Audyt ról RLS (`audit:stage158-roles`) | **22/22 PASS** (0 SKIP) |

---

## 2. Zakres funkcjonalny (15 sekcji specyfikacji)

| Sekcja | Realizacja | Audyt |
|--------|------------|-------|
| 1. Kontakty CRM | `crm_contacts` — 8 typów | R158-02, R158-19 |
| 2. Historia relacji | `crm_interactions` + timeline | S158-03, R158-12/13 |
| 3. Sponsor Pipeline | Kanban `/crm/pipeline` — 6 statusów | S158-09, R158-06/11 |
| 4. Zadania CRM | `crm_tasks` + push `crm_task_reminder` | S158-06, R158-04/20/21 |
| 5. Rodzice | `/crm/parents`, portal `/crm/portal` | S158-08, R158-16/17/18 |
| 6. Wolontariusze | `/crm/volunteers` | R158-07 |
| 7. Partnerzy | `/crm/partners` | seed + staff read |
| 8. Darowizny | `crm_donations` + sync `finance_income` | S158-04, R158-03/10/18 |
| 9. AI CRM Assistant | `/crm/ai` — szkice, bez auto-wysyłki | S158-05 |
| 10. Wydarzenia | `crm_events` + `crm_event_attendees` | R158-05/08 |
| 11. Dashboard CRM | `/crm` — 5 widgetów | build + routes |
| 12. Role | owner/prezes: manage; trener: scoped; rodzic: portal | R158-01…22 |
| 13. Baza danych | 6 tabel + RLS + 6 migracji | §4 |
| 14. PWA | prefix `/crm` w middleware + SW | S158-10 |
| 15. Audyt | niniejszy raport | ✅ |

---

## 3. Architektura

```
Sponsors (ETAP 6)     Finance (ETAP 7)     Communication (15.6)   Attendance (15.7)
       │                      │                      │                      │
       └─ sponsor_id FK ──────┼─ finance_income ─────┼─ coach_messages ─────┼─ player_availability
                              │                      │                      │
                         Club CRM (/crm) ──────────┴──────────────────────┘
                              │
                    crm_contacts / interactions / tasks / events / donations
```

**Trasy:** `/crm`, `/crm/contacts`, `/crm/contacts/new`, `/crm/contacts/[id]`, `/crm/pipeline`, `/crm/parents`, `/crm/volunteers`, `/crm/partners`, `/crm/donations`, `/crm/events`, `/crm/tasks`, `/crm/ai`, `/crm/portal`

**RBAC:** `crm:read`, `crm:manage`, `crm:portal`

---

## 4. Migracje SQL

| Plik | Zawartość |
|------|-----------|
| `20260621120000_stage158_club_crm.sql` | Tabele, enumy, RLS, helpery (w tym scoped `crm_events_select` dla trenera) |
| `20260621121000_seed_stage158_club_crm.sql` | 6 kontaktów testowych + interakcje, zadania, wydarzenie `sponsor_meeting` |
| `20260621123000_stage158_audit_hardening.sql` | Triggery club/player scope, indeksy |
| `20260621124000_stage158_treasurer_fix.sql` | Fix enum `treasurer` na DB bez pełnego finance seed |
| `20260621125000_seed_stage158_parent_portal.sql` | **Naprawa audytu** — kontakt CRM rodzica z `profile_id` |
| `20260621126000_stage158_coach_events_scope.sql` | **Naprawa audytu** — trener bez `sponsor_meeting` |

**Helpery RLS:** `actor_can_manage_crm`, `actor_can_read_crm`, `actor_can_access_crm_contact`, `actor_crm_portal_contact_ids`

**Tabele z RLS (6/6):** `crm_contacts`, `crm_interactions`, `crm_tasks`, `crm_events`, `crm_event_attendees`, `crm_donations`

---

## 5. Wyniki testów

### 5.1 Audyt statyczny — 12/12 PASS

| ID | Obszar | Wynik |
|----|--------|-------|
| S158-01 | RLS + helpery `actor_can_manage_crm` / portal | PASS |
| S158-02 | Trigger club/player scope (`crm_contacts`) | PASS |
| S158-03 | Historia relacji + scoped SELECT | PASS |
| S158-04 | Integracja darowizn → `finance_income` | PASS |
| S158-05 | AI CRM — szkice bez auto-wysyłki | PASS |
| S158-06 | Push `crm_task_reminder` | PASS |
| S158-07 | RBAC `crm:read` / `crm:manage` / `crm:portal` | PASS |
| S158-08 | Integracja rodziców z 15.6/15.7 | PASS |
| S158-09 | Sponsor Pipeline Kanban | PASS |
| S158-10 | PWA — prefix `/crm` | PASS |
| S158-11 | RLS — trener bez `sponsor_meeting` | PASS |
| S158-12 | Seed portal rodzica (`profile_id`) | PASS |

### 5.2 Audyt ról — 22/22 PASS

Testowane konta: `wlasciciel@`, `prezes@`, `trener@`, `rodzic@`, `sponsor@`, `zawodnik@` (`.@piorun.test`)

| ID | Scenariusz | Rola | Wynik |
|----|------------|------|-------|
| R158-01 | RLS włączone na 6 tabelach | — | PASS |
| R158-02 | Prezes widzi ≥6 kontaktów | prezes | PASS (7) |
| R158-03 | Prezes widzi darowizny | prezes | PASS |
| R158-04 | Prezes widzi zadania CRM | prezes | PASS |
| R158-05 | Prezes widzi wydarzenia CRM | prezes | PASS |
| R158-06 | Trener nie widzi pipeline (sponsor/donor/company) | trener | PASS |
| R158-07 | Trener widzi wolontariuszy | trener | PASS |
| R158-08 | Trener nie widzi `sponsor_meeting` | trener | PASS |
| R158-09 | Trener nie tworzy kontaktów | trener | PASS |
| R158-10 | Trener nie widzi darowizn | trener | PASS |
| R158-11 | Pipeline — prezes aktualizuje status | prezes | PASS |
| R158-12 | Trener nie dodaje interakcji do sponsora | trener | PASS |
| R158-13 | Trener nie czyta historii sponsora | trener | PASS |
| R158-14 | Sponsor nie widzi CRM | sponsor | PASS |
| R158-15 | Zawodnik nie widzi CRM | zawodnik | PASS |
| R158-16 | Rodzic widzi wyłącznie własny kontakt | rodzic | PASS |
| R158-17 | `actor_crm_portal_contact_ids` = 1 | rodzic | PASS |
| R158-18 | Rodzic nie widzi darowizn klubu | rodzic | PASS |
| R158-19 | Właściciel — pełny dostęp CRM | owner | PASS |
| R158-20 | Prezes tworzy zadania CRM | prezes | PASS |
| R158-21 | Trener nie tworzy zadań CRM | trener | PASS |
| R158-22 | Funkcje RLS CRM w DB (3/3) | — | PASS |

### 5.3 Matryca dostępu (live RLS)

| Rola | Kontakty | Pipeline | Tasks | Donations | Events | Portal |
|------|----------|----------|-------|-----------|--------|--------|
| owner / prezes | wszystkie (7) | 3 | 2+ | 1 | wszystkie | — |
| trener | parent + volunteer (scoped) | 0 | 0 | 0 | tylko tournament/picnic/parent_meeting/other | 0 |
| rodzic | 1 (własny) | 0 | 0 | 0 | via attendees | 1 |
| sponsor / zawodnik | 0 | 0 | 0 | 0 | 0 | 0 |

### 5.4 Typecheck & Build

```bash
npm run typecheck   # PASS
npm run build       # PASS (133 routes)
```

---

## 6. Wykryte problemy i naprawy

### 6.1 Trener widział wydarzenia `sponsor_meeting` (KRYTYCZNE)

**Problem:** Polityka `crm_events_select` używała ogólnego `actor_can_read_crm`, przez co trener miał dostęp do spotkań sponsorskich (wyciek informacji biznesowych).

**Naprawa:**
- Zaktualizowano `crm_events_select` w głównej migracji i dodano migrację `20260621126000_stage158_coach_events_scope.sql`
- Trener widzi tylko: `tournament`, `club_picnic`, `parent_meeting`, `other`
- Zarząd (`actor_can_manage_crm`) — pełny dostęp; portal — via `crm_event_attendees`

**Weryfikacja:** R158-08 PASS (trener: 0 × `sponsor_meeting`)

### 6.2 Rodzic bez kontaktu CRM / SKIP portalu

**Problem:** Brak seedu `crm_contacts` z `profile_id` dla `rodzic@piorun.test` → R158-16/17 SKIP w wstępnym audycie.

**Naprawa:** Migracja `20260621125000_seed_stage158_parent_portal.sql` — kontakt typu `parent` powiązany z profilem i `player_id`.

**Weryfikacja:** R158-16 PASS (1 kontakt), R158-17 PASS (`actor_crm_portal_contact_ids` = 1)

### 6.3 Audyt statyczny S158-11 (kosmetyka)

**Problem:** Checker szukał literalnego stringa `sponsor_meeting` w pliku migracji naprawczej (negatywna polityka przez whitelist typów).

**Naprawa:** Checker weryfikuje wzorzec `user_has_club_role(..., 'coach')` + whitelist typów w głównej migracji.

---

## 7. Szczegółowy przegląd obszarów audytu

### 7.1 RLS

- 6 tabel z `ENABLE ROW LEVEL SECURITY` — R158-01 PASS
- Scoped read kontaktów: trener → `parent`, `volunteer`; zarząd → wszystkie typy
- Write: tylko `actor_can_manage_crm` (owner, president, board, treasurer*)
- Portal: `actor_crm_portal_contact_ids` — rodzic via `profile_id` / `player_id`

\* `treasurer` — fix enum w migracji 124000; konto `skarbnik@piorun.test` nie jest w standardowym seedzie stage1 (patrz §8).

### 7.2 Sponsor Pipeline

- Kanban `/crm/pipeline` — 6 statusów (`lead` → `active`)
- Prezes aktualizuje status — R158-11 PASS
- Trener nie widzi kontaktów sponsor/donor/company — R158-06 PASS
- Trener nie czyta ani nie zapisuje interakcji sponsora — R158-12/13 PASS

### 7.3 Darowizny

- Tabela `crm_donations` + opcjonalny sync z `finance_income` (S158-04)
- Prezes widzi — R158-03; trener i rodzic nie — R158-10/18 PASS

### 7.4 Zadania CRM

- `crm_tasks` — typy reminder, call_back, follow_up, event_prep
- Prezes tworzy — R158-20; trener nie — R158-21
- Push dispatch `crm_task_reminder` — S158-06

### 7.5 Wydarzenia CRM

- `crm_events` + `crm_event_attendees`
- Scoped events dla trenera — R158-08 PASS
- Prezes pełny dostęp — R158-05 PASS

### 7.6 Rodzice

- `/crm/parents` — kontekst z 15.6 (komunikacja) i 15.7 (obecności)
- Portal `/crm/portal` — R158-16/17 PASS po seedzie parent portal

### 7.7 Wolontariusze

- Trener widzi kontakty typu `volunteer` — R158-07 PASS
- Widok `/crm/volunteers` filtrowany po typie

### 7.8 AI CRM Assistant

- `/crm/ai` — generator szkiców (`generateCrmDraft`)
- Brak auto-wysyłki e-mail/SMS — S158-05 PASS
- Wymaga `crm:manage` po stronie UI/RBAC

---

## 8. Uwagi operacyjne

1. **Skarbnik (treasurer)** — rola CRM zdefiniowana w RLS; brak konta testowego `skarbnik@piorun.test` w domyślnym `setup:stage1`. Wymaga osobnego seedu finance/stage7 do testów live.
2. **`player_guardians`** — widok rodzica w `/crm/parents` (lista dzieci) wymaga pełnego `setup:stage7`; portal CRM działa przez `profile_id` na kontakcie CRM.
3. **Integracja Finance** — sync darowizn wymaga istnienia tabeli `finance_income`; FK dodawane warunkowo.
4. **Sponsor** — pełny CRM niedostępny; własny portal pozostaje w `/sponsors/portal` (zgodnie ze specyfikacją).
5. **Kolejne etapy** — nie rozpoczęto.

---

## 9. Uruchomienie i weryfikacja

```bash
npm run setup:stage158          # pełny setup (w tym parent + coach-events)
# lub pojedynczo:
npm run db:migrate:stage158-parent
npm run db:migrate:stage158-coach-events

npm run audit:stage158          # 12/12 static
npm run audit:stage158-roles    # 22/22 live RLS
npm run typecheck
npm run build
```

---

## 10. Pliki kluczowe

| Obszar | Pliki |
|--------|-------|
| SQL / RLS | `supabase/migrations/2026062112*.sql` |
| Typy / lib | `src/types/crm.ts`, `src/lib/crm/*` |
| UI / actions | `src/features/crm/*`, `src/app/(dashboard)/crm/**` |
| RBAC | `src/types/rbac.ts`, `src/config/permissions.ts`, `src/config/navigation.ts` |
| Audyt | `scripts/audit-stage158-security.mjs`, `scripts/audit-stage158-roles.mjs`, `scripts/setup-stage158.mjs` |

---

## 11. Werdykt

**ETAP 15.8 Club CRM — ZAMKNIĘTY ✅**

Pełny audyt (RLS, pipeline, darowizny, zadania, wydarzenia, rodzice, wolontariusze, AI) zakończony sukcesem. Wykryte problemy bezpieczeństwa (wyciek `sponsor_meeting` do trenera, brak portalu rodzica) zostały naprawione i zweryfikowane testami live na wszystkich dostępnych rolach testowych.
