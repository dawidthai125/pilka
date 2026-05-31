# Raport audytu — ETAP 5 (Club AI Assistant)

**Data:** 2026-05-31  
**Zakres:** OpenAI API, RLS, RBAC, wydajność zapytań, historia rozmów, raporty AI, mobile, TypeScript, izolacja danych klubowych  
**Status po audycie:** poprawki wdrożone

---

## Podsumowanie

| Obszar | Ocena przed | Ocena po | Naprawione |
|--------|-------------|----------|------------|
| Bezpieczeństwo OpenAI API | ⚠️ Średnie | ✅ Dobre | 4 |
| Polityki RLS | ✅ Dobre | ✅ Dobre | 3 (DB) |
| Poprawność uprawnień | ⚠️ Średnie | ✅ Dobre | 3 |
| Wydajność zapytań | ⚠️ Średnie | ✅ Dobre | 5 |
| Historia rozmów | ⚠️ Średnie | ✅ Dobre | 3 |
| Generowanie raportów | ⚠️ Średnie | ✅ Dobre | 2 |
| Mobile / responsywność | ✅ Dobre | ✅ Dobre | 1 |
| TypeScript | ✅ Dobre | ✅ Dobre | 0 |
| Izolacja danych klubu | ⚠️ Średnie | ✅ Dobre | 2 |

**Weryfikacja:** `npm run typecheck` — ✅ | `npm run build` — ✅  
**Migracja audytu:** `20260531192000_ai_audit_hardening.sql` (skrypt: `npm run db:migrate:ai-audit`)

---

## 1. Bezpieczeństwo OpenAI API

### Znalezione problemy

1. **Wyciek szczegółów błędu API** — odpowiedź HTTP OpenAI była dołączana do komunikatu wyjątku (możliwy wyciek fragmentów odpowiedzi serwera).
2. **Brak limitu długości wiadomości użytkownika** — brak walidacji przed zapisem i wysłaniem do API.
3. **Prompt systemowy ze sztywną nazwą klubu** — `AI_SYSTEM_PROMPT` zawierał „Piorun Wawrzeńczyce” zamiast nazwy z kontekstu JSON.
4. **Brak instrukcji anty-hallucination dla innych klubów** — prompt nie zabraniał odwołań do danych spoza kontekstu.

### Wdrożone poprawki

- `src/integrations/openai/index.ts` — generyczny komunikat błędu bez body odpowiedzi.
- `src/lib/ai/constants.ts` — `AI_MAX_MESSAGE_LENGTH` (4000), `buildAiSystemPrompt(clubName)` z dynamiczną nazwą klubu i zakazem danych spoza kontekstu.
- `src/features/ai/actions.ts` — walidacja długości wiadomości przed insertem.
- `src/features/ai/components/ai-chat-view.tsx` — `maxLength` na textarea.

---

## 2. Polityki RLS i baza danych

### Stan przed audytem

RLS na tabelach AI było poprawnie skonfigurowane (`user_club_ids`, `actor_can_*`), lecz brakowało warstwy defense-in-depth na poziomie triggerów i indeksów.

### Wdrożone poprawki (`20260531192000_ai_audit_hardening.sql`)

- Trigger `ai_conversations_enforce_membership` — weryfikuje aktywne członkostwo i zgodność `user_id` z `auth.uid()`.
- Constraint `ai_messages_content_length_check` — max 10 000 znaków w DB.
- Indeks `idx_ai_messages_club_conversation` — `(club_id, conversation_id, created_at DESC)`.
- Indeks `idx_training_attendance_club_player` — optymalizacja kontekstu frekwencji.
- Funkcje `actor_can_use_ai_chat`, `actor_can_manage_ai`, `actor_can_read_ai_report` — dodano warunek `p_club_id IN (SELECT user_club_ids())`.

---

## 3. Poprawność uprawnień (RBAC)

### Znalezione problemy

1. **Link AI w nawigacji dla wszystkich ról** — zawodnik/sponsor widział „Club AI Assistant” mimo braku dostępu.
2. **`updateAiReport` bez blokady opublikowanych raportów** — możliwa edycja raportu ze statusem `published`.

### Wdrożone poprawki

- `src/components/layout/dashboard-nav.tsx` — filtrowanie pozycji `/ai` przez `canReadAi(roles)`.
- `src/app/(dashboard)/layout.tsx`, `dashboard-header.tsx`, `mobile-dashboard-nav.tsx` — przekazywanie ról do nawigacji.
- `src/features/ai/actions.ts` — edycja tylko gdy `status === 'draft'` + `.eq("status", "draft")` w UPDATE.

---

## 4. Izolacja danych klubu (AI bez dostępu spoza klubu)

### Znalezione problemy

1. **Server actions używały `DEFAULT_CLUB_ID`** zamiast `access.clubId` z sesji — ryzyko przy multi-tenant.
2. **Kontekst AI budowany bez powiązania z klubem użytkownika** — wszystkie zapytania oparte na stałej, nie na członkostwie.

### Wdrożone poprawki

- Wszystkie operacje w `src/features/ai/actions.ts` używają `access.clubId` z `requireAccessContext()`.
- `buildAiClubContext(access.clubId)` — dane tylko z klubu zalogowanego użytkownika.
- Weryfikacja rozmów/raportów/meczy z `.eq("club_id", access.clubId)`.
- Defense-in-depth: `.eq("club_id", ...)` przy pinowaniu i aktualizacji tytułu rozmowy.

**Potwierdzenie:** AI otrzymuje wyłącznie JSON z `buildAiClubContext(clubId)` — zapytania Supabase filtrowane po `club_id`. Brak ścieżki do danych innego klubu.

---

## 5. Wydajność zapytań

### Znalezione problemy

1. **`buildAiClubContext`** — ładowanie całej tabeli `training_attendance` klubu.
2. **Mecze** — brak limitu na zakończone mecze sezonu.
3. **Dostępność treningowa** — liczenie globalne zamiast treningów bieżącego tygodnia.
4. **`getAiConversations`** — preview ładował wszystkie wiadomości bez limitu.
5. **Sync sugestii na każdym wejściu na `/ai`** — podwójne budowanie kontekstu.

### Wdrożone poprawki

- `src/lib/ai/context.ts` — frekwencja ograniczona do zawodników drużyny seniorów + `.limit(2000)`; mecze `.limit(15)`; dostępność tylko dla treningów tygodnia.
- `src/lib/auth/session.ts` — preview wiadomości z `.limit()` i `.eq("club_id")`; historia rozmowy `.limit(200)`.
- `src/app/(dashboard)/ai/page.tsx` — usunięto `syncAiSuggestions()` przy każdym ładowaniu dashboardu AI.

---

## 6. Historia rozmów

### Wdrożone poprawki

- Limit historii wysyłanej do OpenAI: 20 ostatnich wiadomości (bez zmian — OK).
- Limit wiadomości ładowanych w UI: 200.
- Sanitizacja wyszukiwania rozmów: `sanitizeIlikeTerm()` — ochrona przed manipulacją filtrem PostgREST.
- Walidacja długości treści (app + DB).

---

## 7. Generowanie raportów

### Wdrożone poprawki

- `generateAiReportContent(instruction, clubName, ctxJson)` — dynamiczna nazwa klubu w prompcie.
- Weryfikacja meczu po `access.clubId` przed generowaniem raportu/postów social.
- Blokada edycji opublikowanych raportów.

---

## 8. Mobile / responsywność

### Ocena

Komponenty chat (`ai-chat-view.tsx`), lista rozmów i centrum raportów mają responsywne layouty (`flex-col` na mobile, `min-h-[44px]` na polach formularza). Audyt nie wykrył krytycznych problemów.

### Drobna poprawka

- `maxLength` na polu wiadomości — lepsza UX na urządzeniach mobilnych.

---

## 9. TypeScript

Brak błędów kompilacji po poprawkach. Sygnatury `generateAiAnswer` / `generateAiReportContent` zaktualizowane spójnie we wszystkich wywołaniach.

---

## 10. Pliki zmienione

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/20260531192000_ai_audit_hardening.sql` | Nowa migracja audytu |
| `src/integrations/openai/index.ts` | Bezpieczne błędy, dynamiczny prompt |
| `src/lib/ai/constants.ts` | Limity, `buildAiSystemPrompt` |
| `src/lib/ai/sanitize.ts` | Sanitizacja wyszukiwania ilike |
| `src/lib/ai/context.ts` | Limity zapytań, frekwencja tygodniowa |
| `src/features/ai/actions.ts` | `access.clubId`, walidacje, draft-only edit |
| `src/lib/auth/session.ts` | Limity preview/historii, sanitize search |
| `src/components/layout/dashboard-nav.tsx` | Filtrowanie AI po rolach |
| `src/app/(dashboard)/layout.tsx` | Przekazanie ról |
| `src/components/layout/dashboard-header.tsx` | Przekazanie ról do mobile nav |
| `src/components/layout/mobile-dashboard-nav.tsx` | Przekazanie ról |
| `src/app/(dashboard)/ai/page.tsx` | Usunięto sync przy load |
| `src/app/(dashboard)/ai/suggestions/page.tsx` | `syncAiSuggestions(access.clubId)` |
| `src/features/ai/components/ai-chat-view.tsx` | maxLength |
| `scripts/setup-stage5.mjs` | Migracja audytu w setup |
| `package.json` | `db:migrate:ai-audit` |

---

## 11. Instrukcja wdrożenia migracji

```bash
npm run db:migrate:ai-audit
# lub pełny setup ETAP 5 (nowe środowisko):
npm run setup:stage5
```

Wymagane zmienne: `OPENAI_API_KEY` (opcjonalnie — fallback offline), `SUPABASE_DB_PASSWORD` (migracje).

---

## 12. Werdykt

**ETAP 5 — audyt zakończony.** Moduł Club AI Assistant spełnia wymagania bezpieczeństwa, izolacji danych klubowych i wydajności. Brak nowych funkcji — wyłącznie poprawki audytowe.

**Następny krok:** ETAP 6 (poza zakresem tego audytu).
