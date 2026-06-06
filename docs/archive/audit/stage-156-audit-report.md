# ETAP 15.6 — Communication Hub — Raport audytu końcowego

**Data audytu:** 2026-05-31  
**Status:** ✅ PASS (po hardeningu)  
**Zakres:** RLS, prywatność czatów, izolacja drużyn, sponsor portal, board chat, push, read receipts, role RBAC  

---

## 1. Podsumowanie wykonawcze

Przeprowadzono pełny audyt ETAPU 15.6 Communication Hub — statyczny (kod + migracje) oraz dynamiczny (testy RLS na dev DB z kontami `*.@piorun.test`).

**Wynik:** 10/10 audyt statyczny, 17/17 audyt ról (1 SKIP — rodzic bez modułu finance), typecheck PASS.

**Naprawiono 6 problemów bezpieczeństwa** przed zamknięciem etapu (szczegóły w sekcji 4).

---

## 2. Metodologia

| Warstwa | Narzędzie | Zakres |
|---------|-----------|--------|
| Migracje SQL | Przegląd 5 plików migracji | RLS, helpery, triggery, indeksy |
| Aplikacja | Przegląd `actions.ts`, `dispatch.ts`, `loaders.ts`, UI | RBAC, push scope, read receipts |
| Audyt statyczny | `npm run audit:stage156` | 10 kontroli S156-01…10 |
| Audyt ról (live DB) | `npm run audit:stage156-roles` | 18 kontroli R156-01…18 |
| Typecheck | `npm run typecheck` | Typy TS |
| Build | `npm run build` | Kompilacja produkcyjna |

**Konta testowe:** `wlasciciel@`, `prezes@`, `trener@`, `zawodnik@`, `rodzic@`, `sponsor@` (hasło `Piorun2026!`).

**Uruchomienie pełnego audytu:**

```bash
npm run setup:stage156
npm run audit:stage156
npm run audit:stage156-roles
npm run typecheck
npm run build
```

---

## 3. Wyniki testów

### 3.1 Audyt statyczny — 10/10 PASS

| ID | Obszar | Wynik |
|----|--------|-------|
| S156-01 | RLS + `actor_can_read_announcement` | PASS |
| S156-02 | Scoped czaty + unikalność board/team/sponsor | PASS |
| S156-03 | Triggery publish / team scope | PASS |
| S156-04 | AI draft (bez auto-send) | PASS |
| S156-05 | Gate publikacji ogłoszeń | PASS |
| S156-06 | AI nie wysyła automatycznie | PASS |
| S156-07 | Integracja PWA (`club_notifications` + `notification_queue`) | PASS |
| S156-08 | RBAC `communication:*` | PASS |
| S156-09 | RSVP + coach message scope hardening | PASS |
| S156-10 | Push scoped per audience / chat type | PASS |

### 3.2 Audyt ról (RLS live) — 17/17 PASS, 1 SKIP

| ID | Rola / scenariusz | Wynik |
|----|-------------------|-------|
| R156-01 | RLS na 8 tabelach | PASS |
| R156-02 | Zawodnik **nie** widzi board chat | PASS |
| R156-03 | Prezes widzi board chat | PASS |
| R156-04 | Sponsor **nie** widzi board chat | PASS |
| R156-05 | Zawodnik widzi czat własnej drużyny | PASS |
| R156-06 | Sponsor **nie** widzi czatów drużynowych | PASS |
| R156-07 | Zawodnik **nie** widzi ogłoszenia `board` | PASS |
| R156-08 | Prezes widzi ogłoszenie `board` | PASS |
| R156-09 | Zawodnik **nie** widzi cudzych read receipts | PASS |
| R156-10 | Właściciel widzi pełną listę read receipts | PASS |
| R156-11 | Trener widzi komunikat własnej drużyny | PASS |
| R156-12 | Zawodnik może RSVP (własna drużyna) | PASS |
| R156-13 | Zawodnik **nie** może RSVP na fake ID | PASS |
| R156-14 | Rodzic via `player_guardians` | SKIP (wymaga `setup:stage7`) |
| R156-15 | Sponsor max 1 czat sponsorski | PASS |
| R156-16 | Sponsor **nie** widzi coach messages | PASS |
| R156-17 | Funkcje hardening w DB | PASS |
| R156-18 | Właściciel — pełny dostęp ogłoszeń | PASS |

### 3.3 Matryca ról (aplikacja + RLS)

| Rola | Ogłoszenia | Coach msg | Team chat | Board chat | Sponsor chat | Read stats | Push |
|------|------------|-----------|-----------|------------|--------------|------------|------|
| Właściciel | pełny CRUD + publish | pełny | ✅ (+ admin bypass) | ✅ | ✅ admin | ✅ pełne | scoped |
| Prezes | pełny + publish | pełny | ✅ | ✅ | — | ✅ pełne | scoped |
| Trener | read scoped | create (swoja drużyna) | ✅ swoja drużyna | — | — | RSVP summary | team only |
| Zawodnik | read scoped | read + RSVP | ✅ swoja drużyna | — | — | tylko własny status | team only |
| Rodzic | read (guardian/team) | read + RSVP | ✅ drużyna dziecka | — | — | tylko własny | team only |
| Sponsor | tylko `sponsors` | — | — | — | ✅ własny | — | sponsor only |

---

## 4. Znalezione problemy i naprawy

### P1 — Push ogłoszeń do całego klubu (wyciek treści board/role)

**Problem:** `notifyAnnouncementRecipients` wysyłał push do wszystkich członków klubu, ignorując `visibility`, `category` i `target_role`.

**Naprawa:** `getAnnouncementRecipientUserIds()` w `dispatch.ts` — audience per team / board / sponsors / role / all.

### P2 — Push board chat do wszystkich (w tym sponsorów)

**Problem:** `sendChatMessageAction` używał `getClubMemberUserIds(false)` gdy `team_id` było NULL (board chat).

**Naprawa:** `getChatNotificationRecipients()` — board → zarząd, sponsor → profil sponsora, team → członkowie drużyny.

### P3 — Trener z `team_id = NULL` widział wszystkie drużyny

**Problem:** `actor_communication_team_ids` dawał coachowi dostęp do każdej drużyny przy `cm.team_id IS NULL`.

**Naprawa:** Wymóg `cm.team_id = t.id` dla ról `player`, `coach`, `parent` + `actor_can_modify_coach_message()`.

### P4 — RSVP bez walidacji dostępu do komunikatu

**Problem:** Polityka `coach_message_responses_upsert` (FOR ALL) pozwalała INSERT bez sprawdzenia `coach_message_id`; trener mógł modyfikować cudze odpowiedzi.

**Naprawa:** Osobne polityki INSERT/UPDATE + `actor_can_respond_coach_message()`.

### P5 — Read receipts widoczne dla wszystkich w UI

**Problem:** Dashboard „Przeczytało X/Y” renderowany dla każdego użytkownika (RLS i tak filtrował dane, ale UI wprowadzał w błąd).

**Naprawa:** Statystyki odczytu tylko gdy `canManage === true`.

### P6 — `player_guardians` parse error na częściowym stacku migracji

**Problem:** Odwołanie statyczne do `player_guardians` w PL/pgSQL powodowało błąd mimo `to_regclass`.

**Naprawa:** Dynamiczny `EXECUTE` w `actor_communication_team_ids` + migracja `20260619125000_stage156_team_ids_fix.sql`.

---

## 5. Architektura bezpieczeństwa (RLS)

```
authenticated request
        │
        ▼
actor_can_read_announcement(id)
actor_can_access_team_chat(chat_id)
actor_can_modify_coach_message(club_id, team_id)
actor_can_respond_coach_message(coach_message_id)
actor_can_access_board_communication(club_id)
        │
        ▼
8 tabel z ENABLE ROW LEVEL SECURITY
```

**Tabele:** `announcements`, `announcement_reads`, `coach_messages`, `coach_message_responses`, `team_chats`, `chat_messages`, `chat_attachments`, `notification_events`.

**Triggery:** publish role gate, coach team scope, club_id consistency na rekordach potomnych.

**Indeksy unikalności:** jeden board chat / klub, jeden team chat / drużyna, jeden sponsor chat / sponsor.

---

## 6. Push notifications (PWA)

| Zdarzenie | Odbiorcy (po fix) | `notification_event_type` |
|-----------|-------------------|---------------------------|
| Ogłoszenie `visibility=all` | członkowie klubu (bez sponsorów) | `club_announcement` |
| Ogłoszenie `team` | członkowie drużyny + rodzice (guardians) | `club_announcement` |
| Ogłoszenie `board` | owner, president, sports_director (+ treasurer) | `club_announcement` |
| Ogłoszenie `sponsors` | role sponsor | `club_announcement` |
| Coach message | team scope | `coach_message_new` |
| Chat team | team scope | `chat_message_new` |
| Chat board | zarząd | `chat_message_new` |
| Chat sponsor | profil sponsora | `chat_message_new` |

**Pipeline:** `dispatchCommunicationNotifications` → `club_notifications` + `notification_queue` → cron `/api/pwa/push/dispatch` (ETAP 12).

**Manual test push:** wymaga VAPID + `push_subscriptions` użytkownika — poza zakresem automatycznego audytu DB.

---

## 7. Read receipts

| Aspekt | Implementacja | Audyt |
|--------|---------------|-------|
| Zapis odczytu | `announcement_reads` + `markAnnouncementReadAction` | PASS |
| RLS SELECT | własny rekord LUB `actor_can_manage_communication` | R156-09, R156-10 |
| RLS INSERT | `actor_can_read_announcement(announcement_id)` | PASS |
| UI dashboard | „Przeczytało X/Y” tylko dla managerów | naprawione P5 |
| Lista osób | `getAnnouncementReadStats` (manager path) | PASS |

**Uwaga v1:** `audienceSize = 24` w UI to stała demo — produkcja wymaga licznika audience z reguł widoczności ogłoszenia.

---

## 8. Sponsor portal

| Kontrola | Wynik |
|----------|-------|
| Brak dostępu do team chat | R156-06 PASS |
| Brak dostępu do board chat | R156-04 PASS |
| Brak coach messages | R156-16 PASS |
| Izolacja czatu sponsorskiego (`sponsor_id = sponsor_id_for_user`) | R156-15 PASS |
| Ogłoszenia ogólne klubu ukryte (sponsor widzi kategorię `sponsors`) | RLS PASS |

**Seed:** brak pre-seed czatu sponsorskiego w dev — sponsor widzi 0 czatów (poprawne). Po utworzeniu czatu per sponsor RLS wymusza izolację.

---

## 9. Pliki migracji (ETAP 15.6)

| Plik | Rola |
|------|------|
| `20260619120000_stage156_communication_hub.sql` | Schema + RLS bazowe |
| `20260619121000_seed_stage156_communication.sql` | Seed demo |
| `20260619123000_stage156_audit_hardening.sql` | Triggery publish/team, indeksy |
| `20260619124000_stage156_security_hardening.sql` | Board access, RSVP, coach scope, push helpers SQL |
| `20260619125000_stage156_team_ids_fix.sql` | Fix `player_guardians` optional |

---

## 10. Ograniczenia znane (poza audytem)

- Upload zdjęć w czacie — schema `chat_attachments`, UI minimalny
- Real-time — revalidate (brak Supabase Realtime)
- Audience size w UI — stała demo 24
- Test rodzica R156-14 — wymaga `npm run setup:stage7` (`player_guardians`)
- Push end-to-end — wymaga subskrypcji PWA na urządzeniu

---

## 11. Werdykt

**ETAP 15.6 Communication Hub — AUDYT KOŃCOWY: PASS**

Moduł spełnia wymagania izolacji ról, prywatności czatów, read receipts i scoped push. Wszystkie znalezione luki P1–P6 zostały naprawione w tej iteracji audytu.

Kolejne etapy **poza zakresem**.
