# FC OS — Sprint 20.5B.2 Post-Release Audit

**Data audytu:** 2026-06-06  
**Produkcja:** https://pilka-mu.vercel.app  
**Commit produkcyjny:** `bd3525b` (20.5B) · baseline 20.5A: `8b50069`  
**Metoda:** audyt statyczny kodu + weryfikacja HTTP na produkcji (smoke 205A.1 / 205B.1 + RBAC matrix)  
**Zakres:** Club Management — `/members`, zaproszenia, RBAC, pełna ścieżka invite  
**Bez implementacji** — wyłącznie diagnoza operacyjna i rekomendacje.

---

## Executive summary

| Metryka | Wartość |
|---------|---------|
| **Status produkcji** | **PASS** (smoke 205B.1: 7/7; 205A.1: 1 fałszywy FAIL — przestarzały asercja tekstu) |
| **Poziom Club Management (po 20.5A+20.5B)** | **~78%** (vs ~32% przed 20.5) |
| **Club Management Score (średnia 5 wymiarów)** | **6.6 / 10** |
| **Blokery P0** | **0** |
| **GO dla kolejnego etapu** | **GO** — z warunkami (P1 przed masowym 20.5C) |

20.5A i 20.5B zamknęły krytyczne luki z audytu 20.5: panel klubu ma działające zaproszenia, zarządzanie członkami i automatyczną aktywację `invited → active`. Moduł jest gotowy do codziennego użytku przez leadership (owner / president / sports director). Pozostałe luki dotyczą głównie UX (grupowanie zaproszeń, filtry), spójności RLS↔RBAC (treasurer, coach) oraz skalowania (bulk, CSV, rate limits Auth).

---

## Kontekst wdrożenia

| Sprint | Commit | Zakres |
|--------|--------|--------|
| **20.5A** | `8b50069` | Members v2, akcje CRUD, `invited → active`, guards RBAC |
| **20.5B** | `bd3525b` | Formularz zaproszenia, zakładka Zaproszenia, resend/revoke, liczniki |

**Dokumenty referencyjne:** `docs/audit/club-management-20.5-audit.md`, `docs/architecture/project-handoff-current.md`, `docs/architecture/project-handoff-20.5-club-management.md`, `CHANGELOG.md`.

> **Aktualizacja 20.5B.5:** P1-01 (existing user UX), P1-05 (grupowanie zaproszeń), P2-01 (nav Członkowie) zamknięte w `b41d049`. CHANGELOG i handoff uzupełnione.

---

## Zadanie 1 — Audit Members Dashboard (`/members`)

### Stan produkcyjny

Strona składa się z:

1. Nagłówek **„Członkowie”** + opis
2. Karta **„Członkowie i zaproszenia”** — liczniki, zakładki, dashboard
3. Karta **„Twoje role”**
4. Karta **„Macierz uprawnień”** (pełna tabela RBAC)

### Zakładka „Członkowie”

| Kryterium | Ocena | Uwagi |
|-----------|-------|-------|
| Czytelność listy | **Dobra** | Tabela: imię, email, rola (badge), status (badge PL), data dołączenia |
| Zrozumiałość statusów | **Dobra** | `Aktywny` / `Zaproszony` / `Zawieszony` — etykiety PL |
| Czytelność ról | **Dobra** | `ROLE_LABELS` z `permissions.ts` |
| Łatwość akcji | **Średnia** | Menu ⋮ → modal; 2 kliknięcia do akcji (OK dla desktop) |
| Filtry / wyszukiwarka | **Brak** | Luka vs propozycja UX 20.5 |
| Kolumna drużyna | **Brak w UI** | `getClubMembers()` pobiera `team`, panel nie renderuje |
| Mobile | **Słaba** | Tabela `min-w-[720px]` + horizontal scroll, brak kart |

**Liczniki (badge):** Aktywni · Zaproszeni · Zawieszeni · Oczekujące zaproszenia — czytelne, ale **„Zaproszeni”** (status membership) i **„Oczekujące zaproszenia”** (heurystyka pending) mogą mylić użytkownika bez kontekstu.

**Stany puste:** „Brak członków klubu” — brak CTA „Zaproś pierwszego członka” (propozycja 20.5).

### UX / Navigation v2

| Aspekt | Ocena |
|--------|-------|
| Spójność z Nav v2 | **Częściowa** — sekcja Administracja (zwinięta) OK; **etykieta nav nadal „Role”** zamiast „Członkowie” (`navigation.ts:255`) |
| Liczba kliknięć (typowy flow) | **3–4** — Administracja → Role → (opcjonalnie) rozwiń → Członkowie → ⋮ → akcja |
| Hierarchia informacji | **OK** — dashboard w karcie, macierz RBAC osobno (długi scroll) |

### Ocena Zadania 1

| Wymiar | Wynik |
|--------|-------|
| UX | **6.5 / 10** |
| Spójność Nav v2 | **7 / 10** |
| Liczba kliknięć | Akceptowalna (nie optymalna) |

---

## Zadanie 2 — Audit Invitations (zakładka „Zaproszenia”)

### Implementacja

- Jedna **płaska tabela** wszystkich zaproszeń (email, rola, data wysłania, status, akcje)
- Statusy wyświetlane: **Oczekujące** · **Zaakceptowane** · **Wygasłe** · **Anulowane**
- Model bez migracji DB — `deriveInvitationStatus()` w `invitation-utils.ts`

| Status | Kryterium techniczne | Akcje UI |
|--------|---------------------|----------|
| **Pending** | `status=invited`, wiek &lt; 7 dni od `updated_at` | Ponów · Anuluj |
| **Expired** | `status=invited`, wiek ≥ 7 dni | Ponów · Anuluj |
| **Revoked** | `status=archived` | — |
| **Accepted** | `status=active` + `updated_at > created_at + 60s` | — |

### Ocena per kryterium

| Kryterium | Ocena | Uwagi |
|-----------|-------|-------|
| Użytkownik rozumie różnice | **Średnia** | Etykiety PL OK; brak podsekcji / tooltipów wyjaśniających 7-dniowy limit |
| Statusy wystarczająco opisane | **Średnia** | Jedna linia opisu nad tabelą; brak legendy |
| Liczniki poprawne | **Tak (logicznie)** | `pendingInvites` = liczba `pending` w zaproszeniach; badge „Zaproszeni” = osobna metryka membership |
| Martwe ścieżki UX | **Kilka** | Patrz poniżej |

### Martwe / słabe ścieżki UX

1. **Brak grupowania** Pending / Accepted / Expired / Revoked (propozycja 20.5 zakładała podsekcje).
2. **Formularz zaproszenia tylko na zakładce Członkowie** — użytkownik na Zaproszeniach nie ma CTA „Nowe zaproszenie”.
3. **Accepted** oparte na heurystyce — aktywni członkowie od zawsze (`updated_at ≈ created_at`) **nie pojawią się** w historii zaakceptowanych.
4. **Brak liczników per status** na zakładce Zaproszenia (tylko globalne badge u góry).
5. **Istniejący użytkownik** — invite tworzy membership `invited` **bez** maila Auth; w Zaproszeniach widać pending, ale zaproszony nie dostaje instrukcji (P1).

### Weryfikacja produkcyjna (205B.1 smoke)

- Owner: zakładki + formularz bez roli owner — **PASS**
- President: formularz widoczny — **PASS**
- Coach: brak invite/resend — **PASS**
- Pending / resend proxy / revoke / active — **PASS**

### Ocena Zadania 2

| Wymiar | Wynik |
|--------|-------|
| Funkcjonalność zaproszeń | **7.5 / 10** |
| UX zaproszeń | **6 / 10** |

---

## Zadanie 3 — Full Invite Journey

### Prześledzona ścieżka

```
Zaproś członka (formularz)
    ↓
Membership status = invited (+ email Auth dla NOWEGO użytkownika)
    ↓
Zakładka Zaproszenia → status Oczekujące
    ↓
Ponów zaproszenie (opcjonalnie) → bump updated_at + inviteUserByEmail
    ↓
Użytkownik: link z maila → /auth/callback
    ↓
activateInvitedMemberships() → status active
    ↓
Zakładka Członkowie → wiersz w tabeli (active/suspended roster)
```

### Liczba kroków

| Rola | Kroki do „członek aktywny” |
|------|---------------------------|
| **Administrator** | 4–6 (nav → formularz → submit → [resend] → monitorowanie) |
| **Zaproszony** | 3–4 (email → ustaw hasło → callback → pierwszy dashboard) |

### Miejsca zagubienia użytkownika

| # | Problem | Priorytet |
|---|---------|-----------|
| 1 | Istniejący użytkownik: komunikat sukcesu bez maila — musi sam wiedzieć, żeby się zalogować | **P1** |
| 2 | Badge „Zaproszeni” vs „Oczekujące zaproszenia” — dwa pojęcia bez wyjaśnienia | **P2** |
| 3 | Po invite brak automatycznego przełączenia na zakładkę Zaproszenia | **P2** |
| 4 | Resend może failować (Supabase Auth rate limit) — komunikat jest, ale brak alternatywy (reset hasła) w UI | **P2** |
| 5 | Wygasłe zaproszenie — użytkownik nie widzi w UI **kiedy** wygasa (brak daty wygaśnięcia) | **P2** |

### Brakujące komunikaty

- Instrukcja dla zaproszonego (co zrobić po otrzymaniu maila / jeśli mail nie przyszedł)
- Potwierdzenie po przejściu `pending → active` po stronie admina (brak realtime; wymaga refresh)
- Różnica „dodano zaproszenie istniejącego użytkownika” vs „wysłano email” — jest w `success`, ale łatwo przeoczyć

### Ocena Zadania 3

Ścieżka **działa end-to-end** na produkcji dla nowego użytkownika. Journey **6.5 / 10** — kompletny technicznie, z lukami komunikacyjnymi.

---

## Zadanie 4 — RBAC Audit (produkcja)

### Macierz weryfikacji HTTP (2026-06-06)

| Rola | `/members` HTTP | Invite UI | Akcje członka | Zaproszenia | Uwagi |
|------|-----------------|-----------|---------------|-------------|-------|
| **Owner** | 200 | ✅ | ✅ | ✅ | Pełny dostęp |
| **President** | 200 | ✅ | ✅ | ✅ | Pełny dostęp |
| **Sports Director** | 200 | ✅ | ✅ | ✅ | Pełny dostęp |
| **Coach** | 200 | ❌ | ❌ | ✅ (read) | **Tylko 1 wiersz** (własne członkostwo) — RLS SELECT bez coach |
| **Treasurer** | — | — | — | — | Konto `skarbnik@piorun.test` **brak w prod Auth**; app RBAC ma `member:read`, RLS **nie** obejmuje treasurer |
| **Scout** | — | — | — | — | Brak konta testowego; app RBAC **brak** `member:read` → redirect `/dashboard` |
| **Website Admin** | — | — | — | — | Brak konta testowego; app RBAC **brak** `member:read` |

### Ukryte akcje / zbędne elementy UI

| Rola | Ukryte akcje | Zbędne elementy |
|------|--------------|-----------------|
| Leadership | Brak — server actions + guards OK | Macierz RBAC (długa) — zamierzona dokumentacja |
| Coach | Invite, resend, revoke, CRUD — **poprawnie ukryte** | Zakładka Zaproszenia + macierz RBAC — **debatowalne** przy widoku 1 wiersza |
| Treasurer (teoretycznie) | Manage/invite — OK w guards | Strona dostępna z RBAC app, lista prawdopodobnie pusta (RLS) — **niespójność** |

### Guards (warstwa aplikacji)

- `canManageMembers` → owner, president, sports_director
- `canInviteMembers` → `LEADERSHIP_ROLES` (jak wyżej)
- `canManageMemberTarget` → blokuje zarządzanie owner bez roli owner
- `canAssignClubRole` → president/SD nie przypiszą owner

**Wniosek:** Warstwa aplikacji **spójna** z macierzą produktową 20.5. Luki w **RLS SELECT** (coach pełna lista, treasurer) i **brak testów** scout/website/treasurer na prod.

### Ocena Zadania 4

| Wymiar | Wynik |
|--------|-------|
| RBAC (app + prod smoke) | **7 / 10** |

---

## Zadanie 5 — Club Management Score

| Wymiar | Wynik | Uzasadnienie |
|--------|-------|--------------|
| **Funkcjonalność** | **7.5 / 10** | CRUD + invite/resend/revoke + auto-aktywacja; brak filtrów, team w UI, bulk |
| **UX** | **6.5 / 10** | Czytelne tabele i badge; płaskie zaproszenia, nav „Role”, słaby mobile |
| **RBAC** | **7 / 10** | Leadership OK; RLS↔RBAC gaps (coach, treasurer); brak prod coverage scout/website |
| **Gotowość SaaS** | **6.5 / 10** | Działa multi-tenant; brak audytu akcji, rate limits, onboarding CSV |
| **Skalowalność** | **5.5 / 10** | Pojedyncze operacje OK; brak batch, heurystyki statusów, duże tabele |

### Wynik końcowy

**Club Management Score: 6.6 / 10**  
**Szacowany poziom dojrzałości modułu: ~78%** (vs 32% przed 20.5A)

---

## Zadanie 6 — Backlog Cleanup

### P0 — Blokery

*Brak.* Produkcja `bd3525b` operacyjna; smoke krytyczny PASS.

### P1 — Ważne

| ID | Problem | Wpływ |
|----|---------|-------|
| P1-01 | **Invite istniejącego użytkownika bez emaila Auth** — tylko membership `invited` | Zaproszony nie wie, że ma się zalogować |
| P1-02 | **RLS SELECT memberships** — coach ma `member:read` w app, widzi tylko siebie (RLS bez coach od stage116_p2) | Rozbieżność z macierzą produktową (read-only lista) |
| P1-03 | **Treasurer: `member:read` w app, brak w RLS SELECT** | Pusta lista lub błąd przy skarbniku z kontem |
| P1-04 | **Supabase Auth rate limit** przy resend / przyszłym bulk invite | Operacje invite mogą failować w szczycie |
| P1-05 | **Zakładka Zaproszenia bez grupowania statusów** | Przy >10 zaproszeń trudna orientacja |

### P2 — Usprawnienia

| ID | Problem |
|----|---------|
| P2-01 | Nav label **„Role”** → **„Członkowie”** (`navigation.ts`) |
| P2-02 | Brak filtrów (rola, status) i wyszukiwarki na liście członków |
| P2-03 | Brak kolumny **Drużyna** (dane już w `ClubMemberRow`) |
| P2-04 | Heurystyka **Accepted** — brak pewnej historii bez migracji `accepted_at` |
| P2-05 | Brak daty wygaśnięcia zaproszenia w UI |
| P2-06 | Mobile: tabele zamiast kart (propozycja 20.5) |
| P2-07 | Empty state bez CTA „Zaproś pierwszego członka” |
| P2-08 | Macierz RBAC jako osobna karta — długi scroll; propozycja: trzecia zakładka |
| P2-09 | Smoke `_smoke-prod-205a1.mjs` szuka „Członkowie klubu” — fałszywy FAIL |
| P2-10 | CHANGELOG bez wpisu 20.5A/20.5B |
| P2-11 | Brak club-level audit log akcji członkowskich |

### P3 — Nice-to-have

| ID | Problem |
|----|---------|
| P3-01 | PL szablon email Supabase (custom template) |
| P3-02 | Platform dashboard: stale invites &gt;7d (backlog 20.2) |
| P3-03 | Przypisanie drużyny w formularzu zaproszenia |
| P3-04 | Tooltipy / legenda statusów zaproszeń |
| P3-05 | Migracja opcjonalna: `invited_at`, `invited_by`, `accepted_at` |

---

## Zadanie 7 — Ocena 20.5C

| Funkcja | ROI | Ryzyko | Effort | Rekomendacja |
|---------|-----|--------|--------|--------------|
| **CSV Export** | **Wysoki** — raporty, backup, integracje | **Niskie** — read-only | **1 dzień** | **TAK — pierwszy** |
| **Bulk Suspend** | **Średni** — sezon / dyscyplina | **Niskie–średnie** — odwracalne | **1–2 dni** | **TAK** (po UX multi-select) |
| **Bulk Role Change** | **Średni** — zmiany struktury | **Średnie** — RBAC, owner edge cases | **2 dni** | **TAK** (z confirm + preview) |
| **Bulk Remove** | **Średni** — porządki kadry | **Wysokie** — nieodwracalne DELETE | **1–2 dni** | **Warunkowo** — soft-delete preferowany |
| **Bulk Invite** | **Wysoki** — onboarding wielu osób | **Wysokie** — Auth rate limits, duplikaty | **2–3 dni** | **PO** P1-01, P1-04 |
| **CSV Import** | **Wysoki** — migracja z Excela | **Wysokie** — jak bulk invite + walidacja | **3–4 dni** | **PO** stabilizacji invite |

### Proponowana kolejność 20.5C

1. **20.5C.1** — CSV Export + multi-select UI foundation  
2. **20.5C.2** — Bulk Suspend + Bulk Role Change  
3. **20.5C.3** — CSV Import + Bulk Invite (z kolejką / throttling Auth)

**Warunek:** Zamknąć P1-01 (existing user flow) i P1-05 (grupowanie zaproszeń) w **20.5B.3** lub na początku 20.5C — niski effort, duży zysk UX.

---

## Weryfikacja techniczna (dowody)

### Produkcja — smoke

```
205B.1: PASS (7/7) — owner/president/coach UI, pending/resend/revoke/active
205A.1: FAIL (1) — asercja "Członkowie klubu" (UI: "Członkowie" / "Brak członków klubu")
```

### Kluczowe pliki (post-release)

| Plik | Rola |
|------|------|
| `src/app/(dashboard)/members/page.tsx` | SSR page + macierz RBAC |
| `src/features/members/components/members-dashboard.tsx` | Zakładki, liczniki |
| `src/features/members/components/members-panel.tsx` | Tabela członków + akcje |
| `src/features/members/components/invitations-panel.tsx` | Tabela zaproszeń |
| `src/features/members/actions.ts` | 7 server actions |
| `src/lib/members/invite-service.ts` | invite / resend / revoke (service role) |
| `src/lib/members/invitation-utils.ts` | Statusy + liczniki (client-safe) |
| `src/lib/members/activate-invited-memberships.ts` | Hook invited→active |

### RLS (memberships SELECT)

Policy `memberships_select_own_or_leadership` — SELECT dla: **własny wiersz** lub role **owner, president, sports_director** (bez coach, treasurer).

---

## Raport końcowy

### 1. Wynik audytu

**PASS** — Sprint 20.5A + 20.5B osiągnął cele release: panel klubu umożliwia zarządzanie członkami i zaproszeniami na produkcji `bd3525b`. Brak blokerów P0. Zidentyfikowano 5 problemów P1 (głównie UX invite istniejącego użytkownika i spójność RLS) oraz backlog P2/P3.

### 2. Club Management Score

**6.6 / 10** · dojrzałość modułu **~78%**

### 3. Lista problemów

- **P0:** 0  
- **P1:** 5 (P1-01 … P1-05)  
- **P2:** 11  
- **P3:** 5  

### 4. Rekomendacja dla 20.5C

**Częściowe GO:** rozpocząć od **CSV Export** i **bulk suspend/role change** (niskie ryzyko). **CSV Import** i **Bulk Invite** — dopiero po naprawie flow istniejącego użytkownika i strategii throttlingu Auth. Rozważyć krótki **20.5B.3** (P1-05 grupowanie zaproszeń, P2-01 nav label) przed pełnym 20.5C.

### 5. GO / NO-GO — przejście do kolejnego etapu

| | |
|---|---|
| **Werdykt** | **GO** |
| **Uzasadnienie** | Moduł spełnia wymagania operacyjne post-20.5B; produkcja stabilna; kolejny etap może być 20.5B.3 (stabilizacja P1) lub 20.5C.1 (export) — oba są bezpieczne |
| **Warunki** | Nie uruchamiać masowego CSV Import bez mitigacji P1-04; zsynchronizować RLS z RBAC dla treasurer/coach przed obiecaniem „pełnej listy” tym rolom |

---

## Referencje

- `docs/audit/club-management-20.5-audit.md` — baseline pre-implementation
- `docs/architecture/project-handoff-current.md`
- `scripts/_smoke-prod-205a1.mjs`, `scripts/_smoke-prod-205b1.mjs`
- Commits: `8b50069` (20.5A), `bd3525b` (20.5B)
