# Audyt ETAP 13 — AI Club Manager (post-fix)

**Data:** 2026-06-01  
**Zakres:** bezpieczeństwo agenta, RBAC, tool calling, zatwierdzenia, logi audytu, RLS, izolacja klubowa, mobile, wydajność  
**Status po audycie:** ✅ wszystkie problemy P0–P2 naprawione

---

## Podsumowanie wykonawcze

| Obszar | Przed audytem | Po naprawie |
|--------|---------------|-------------|
| Cross-club write (trening/mecz) | ❌ `DEFAULT_CLUB_ID` w actions | ✅ `access.clubId` w całym module |
| generateReport | ❌ LOW, bez zatwierdzenia, OpenAI od razu | ✅ MEDIUM + wymaga zatwierdzenia |
| createNotification | ❌ wszyscy członkowie, brak walidacji href | ✅ tylko sztab + `safeNotificationHref` |
| Status zadania przy błędzie tool | ❌ task `completed` mimo fail | ✅ `failed` + licznik błędów |
| Read tools bez uprawnień | ❌ `{ error }` jako sukces | ✅ `throw Error` → task failed |
| Logi audytu | ⚠️ brak przy błędach | ✅ `tool_failed`, `task_failed`, `permission_denied` |
| RLS insert logów | ⚠️ brak weryfikacji task_id | ✅ migracja `20260615130000` |
| Intent fallback | ❌ fałszywy `getPlayers(100%)` | ✅ puste polecenie → `failed` |
| addNote | ❌ zawsze fail po zatwierdzeniu | ✅ usunięte z rejestru |
| Testy statyczne | — | ✅ `npm run audit:stage13` (12/12 PASS) |
| Build | ✅ | ✅ `npm run typecheck` + `npm run build` |

---

## 1. Bezpieczeństwo agenta

### Sprawdzone mechanizmy

| Mechanizm | Implementacja | Status |
|-----------|---------------|--------|
| Server actions | `requireAccessContext()` + `canUseAiChat` | ✅ |
| Uprawnienia narzędzi | `assertToolPermission()` przed każdym tool call | ✅ |
| Scope klubu | `access.clubId` w runner, read/write tools, insert tasków | ✅ |
| Zatwierdzenia | tylko `user_id = access.userId` + RLS | ✅ |
| Odrzucenie / anulowanie | właściciel tasku, status `cancelled` | ✅ |

### Znalezione problemy i naprawy

| ID | Sev | Problem | Naprawa |
|----|-----|---------|---------|
| AG-01 | **P0** | `createTraining` / `createMatch` zapisywały do `DEFAULT_CLUB_ID` zamiast klubu użytkownika — możliwy cross-club write przez agenta | `src/features/training/actions.ts`, `src/features/matches/actions.ts` — wszystkie helpery i mutacje używają `access.clubId` |
| AG-02 | **P1** | `generateReport` — ryzyko LOW, bez zatwierdzenia, zapis do `ai_reports` + wywołanie OpenAI natychmiast | `registry.ts`: MEDIUM + `requiresApproval: true` |
| AG-03 | **P1** | `createNotification` — broadcast do wszystkich członków; `href` bez walidacji (open redirect) | `write.ts`: odbiorcy = sztab (`owner`, `president`, `sports_director`, `coach`); `safeNotificationHref()` |
| AG-04 | **P1** | Nieudane tool calls → task nadal `completed` | `runner.ts`: `toolFailures`, status `failed`, log `tool_failed` |
| AG-05 | **P2** | Read tools zwracały `{ error }` bez rzucania wyjątku | `read.ts`: `throw new Error(...)` dla finansów/sponsorów/magazynu |
| AG-06 | **P2** | Brak logów audytu przy błędach | `runner.ts`: `task_failed`, `tool_failed`, `permission_denied` |
| AG-07 | **P2** | `addNote` w rejestrze — zawsze fail po zatwierdzeniu | Usunięte z `registry.ts` i typów |
| AG-08 | **P2** | Intent fallback → `getPlayers(minAttendanceRate: 100)` | `intent.ts`: `return []` → task `failed` z komunikatem |

---

## 2. Walidacja uprawnień (RBAC)

### Macierz narzędzi

| Narzędzie | Ryzyko | Uprawnienie | Zatwierdzenie |
|-----------|--------|-------------|---------------|
| getPlayers … getInventory | LOW | modułowe `:read` | Nie |
| createTraining | MEDIUM | `training:manage` | Tak |
| createMatch | MEDIUM | `match:manage` | Tak |
| createNotification | MEDIUM | `training:manage` | Tak |
| generateReport | MEDIUM | `ai:reports` | Tak (po fix) |
| generateNews | MEDIUM | `website:create` | Tak |

### Testy obejścia (scenariusze)

| # | Scenariusz | Oczekiwany wynik | Wynik |
|---|------------|------------------|-------|
| T1 | Użytkownik bez `canUseAiChat` wywołuje `executeAgentCommand` | Odmowa na server action | ✅ |
| T2 | Trener bez `finance:read` → „pokaż składki” | `assertToolPermission` / throw w read | ✅ |
| T3 | Agent z `teamId` obcego klubu | `verifyTeamInClub(teamId, access.clubId)` → błąd | ✅ |
| T4 | `generateReport` bez zatwierdzenia | Status `awaiting_approval` | ✅ |
| T5 | Cudze `approvalId` | Brak rekordu (`user_id` + RLS) | ✅ |
| T6 | `href: https://evil.com` w powiadomieniu | Normalizacja do `/training` | ✅ |
| T7 | Nieznane polecenie „asdfgh” | Task `failed`, brak fałszywych danych | ✅ |
| T8 | Insert logu do cudzego `task_id` (RLS) | Odrzucone przez policy | ✅ (po migracji) |

Automatyczne testy statyczne: `npm run audit:stage13` — **12/12 PASS**.

---

## 3. Tool calling

- Parser intencji: rule-based (`intent.ts`) — fallback gdy brak OpenAI function calling.
- Rejestr: 12 narzędzi (`registry.ts`), schematy OpenAI przez `getOpenAiToolSchemas()`.
- Wykonanie: read → `executeReadTool`; write → approval lub `executeWriteTool`.
- Martwy kod `generateReport` w `read.ts` usunięty.

---

## 4. System zatwierdzeń

| Element | Zachowanie |
|---------|------------|
| LOW read tools | Wykonanie natychmiastowe |
| MEDIUM/HIGH write | Rekord w `ai_action_approvals` + task `awaiting_approval` |
| Zatwierdzenie | Ponowne `assertToolPermission` + wykonanie write |
| Odrzucenie | Tool `skipped`, task `cancelled` |
| Preview | `buildActionPreview()` — w tym `generateReport`, `createNotification` z bezpiecznym href |

---

## 5. Logi audytowe

Tabela `ai_task_logs`, akcje:

| Akcja | Kiedy |
|-------|-------|
| `task_started` | Start polecenia |
| `tool_executed` | Sukces narzędzia |
| `tool_failed` | Błąd narzędzia (nowe) |
| `task_completed` | Sukces całego zadania |
| `task_failed` | Brak intencji / błędy / brak uprawnień (nowe) |
| `action_approved` / `action_rejected` | Decyzja użytkownika |
| `task_cancelled` | Anulowanie |

---

## 6. RLS (Row Level Security)

Tabele ETAP 13: `ai_tasks`, `ai_task_logs`, `ai_tool_calls`, `ai_action_approvals`, `ai_memory`.

| Tabela | SELECT/INSERT/UPDATE | Scope |
|--------|----------------------|-------|
| ai_tasks | własne (`user_id = auth.uid()`) + klub | ✅ |
| ai_task_logs | SELECT/INSERT własne | ✅ + **task ownership na INSERT** |
| ai_tool_calls | SELECT/INSERT/UPDATE własne | ✅ + **task ownership na INSERT** |
| ai_action_approvals | SELECT/INSERT/UPDATE własne | ✅ + **task + tool_call ownership** |
| ai_memory | per user + club | ✅ |

Migracja: `supabase/migrations/20260615130000_stage13_audit_rls_hardening.sql`  
Wdrożenie: `npm run setup:stage13` lub `npm run db:migrate:stage13`.

---

## 7. Akcje poza klubem / bez uprawnień

- **Poza klubem:** naprawione przez `access.clubId` w training/matches actions oraz `.eq("club_id", clubId)` we wszystkich agent read/write.
- **Bez uprawnień:** warstwa server action + `assertToolPermission` + throw w read tools.
- **Delegacja:** agent nie omija RBAC modułów — write tools wołają te same server actions co UI.

---

## 8. Mobile (telefony)

| Element | Ocena |
|---------|-------|
| `/ai/manager`, `/ai/tasks` | Responsywne layouty (`space-y-6`, `flex-wrap`) |
| Ctrl+K palette | Działa w PWA (ETAP 12) |
| ApprovalCard | Przyciski `flex-wrap` — lepsze na wąskich ekranach |
| Bottom nav | Linki AI w nawigacji mobilnej |
| Bundle `/ai/manager` | ~126 kB First Load — akceptowalne |

Brak blokerów mobilnych. Zalecany test manualny: zatwierdzenie akcji na iPhone Safari / Android Chrome.

---

## 9. Wydajność

| Aspekt | Ocena |
|--------|-------|
| Rule-based intent | Szybki, bez kosztu API |
| OpenAI (raporty/news) | Tylko po zatwierdzeniu write tools |
| Kontekst AI | `buildAiClubContext(access)` — scoped per user/club (ETAP 11.6) |
| Zapytania DB | Indeksy na `ai_tasks`, `ai_tool_calls`, `ai_task_logs` |
| Strony agenta | SSR, małe bundle |

Brak problemów wydajnościowych wymagających zmian w ETAP 13.

---

## 10. Pliki zmienione w audycie

```
src/features/training/actions.ts
src/features/matches/actions.ts
src/lib/ai/agent/runner.ts
src/lib/ai/agent/intent.ts
src/lib/ai/agent/tools/registry.ts
src/lib/ai/agent/tools/read.ts
src/lib/ai/agent/tools/write.ts
src/types/ai-agent.ts
src/features/ai-manager/components/approval-card.tsx
supabase/migrations/20260615130000_stage13_audit_rls_hardening.sql
scripts/audit-stage13-security.mjs
scripts/setup-stage13.mjs
package.json
```

---

## 11. Weryfikacja końcowa

```bash
npm run audit:stage13   # 12/12 PASS
npm run typecheck       # OK
npm run build           # OK
npm run setup:stage13   # opcjonalnie — migracja RLS na Supabase
```

---

## 12. Otwarte ryzyka (poza zakresem ETAP 13)

| ID | Opis | Priorytet |
|----|------|-----------|
| R-01 | Rule-based parser — ograniczona elastyczność poleceń | Informacyjne |
| R-02 | Brak rate limit dedykowanego agentowi (współdzielony z AI chat ETAP 11.6) | P3 |
| R-03 | `generateNews` nie zapisuje do CMS — tylko draft w odpowiedzi | Zamierzone |

**Audyt ETAP 13 zakończony.** System agenta gotowy do testów akceptacyjnych w klubie Piorun Wawrzeńczyce.
