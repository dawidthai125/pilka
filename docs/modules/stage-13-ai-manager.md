# ETAP 13 — AI Club Manager

Inteligentny agent AI wykonujący działania w systemie zgodnie z uprawnieniami użytkownika (nie chatbot).

## Architektura agenta

```
┌─────────────────────────────────────────────────────────────┐
│  UI: /ai/manager · /ai/tasks · Ctrl+K Command Palette         │
├─────────────────────────────────────────────────────────────┤
│  Server actions (features/ai-manager/actions.ts)            │
│  └── runAgentCommand · approve · reject · cancel              │
├─────────────────────────────────────────────────────────────┤
│  Agent runner (lib/ai/agent/runner.ts)                      │
│  ├── Intent parser (rule-based + OpenAI-ready)              │
│  ├── Tool registry + permission gates                       │
│  ├── Approval flow (LOW / MEDIUM / HIGH)                    │
│  └── Audit logs + memory                                    │
├─────────────────────────────────────────────────────────────┤
│  Domain tools → existing server actions & loaders            │
│  (createTraining, createMatch, buildAiClubContext, …)       │
├─────────────────────────────────────────────────────────────┤
│  Supabase (RLS): ai_tasks, ai_tool_calls, ai_action_approvals│
│                  ai_task_logs, ai_memory                      │
└─────────────────────────────────────────────────────────────┘
```

## System narzędzi

Plik: `src/lib/ai/agent/tools/registry.ts`

| Narzędzie | Ryzyko | Uprawnienia | Zatwierdzenie |
|-----------|--------|-------------|---------------|
| getPlayers, getMatches, … | LOW | domain:read | Nie |
| generateReport | LOW | ai:reports | Nie |
| createTraining, createMatch | MEDIUM | training/match:manage | Tak |
| createNotification, generateNews | MEDIUM | training:manage / website:create | Tak |
| addNote | MEDIUM | player:notes | Tak |

Wykonanie: `executeReadTool` / `executeWriteTool` — każde wywołanie przechodzi `assertToolPermission()`.

## System zatwierdzeń

1. Agent parsuje polecenie → plan narzędzi
2. LOW → wykonanie natychmiastowe + log
3. MEDIUM/HIGH → `ai_action_approvals` (status pending) + task `awaiting_approval`
4. Użytkownik: Zatwierdź / Odrzuć w UI
5. Po zatwierdzeniu → `executeWriteTool` + aktualizacja task

Operacje nieodwracalne (HIGH) zawsze wymagają zatwierdzenia — brak auto-delete/finance write w ETAP 13.

## Logi audytowe

| Tabela | Zawartość |
|--------|-----------|
| `ai_tasks` | polecenie, status, wynik |
| `ai_task_logs` | action + details (task_started, tool_executed, action_approved, …) |
| `ai_tool_calls` | tool_name, input, output, risk_level, status |

Każdy wpis: `user_id`, `club_id`, timestamp.

## Pamięć (`ai_memory`)

- Kontekst sesji per użytkownik + klub
- Tylko streszczenia poleceń/wyników (bez wrażliwych danych)
- Scoped RLS — brak dostępu między klubami

## Bezpieczeństwo

- Wyłącznie `requireAccessContext()` + `canUseAiChat`
- Brak service role po stronie klienta
- RLS na wszystkich tabelach agenta
- Narzędzia zapisu delegują do istniejących server actions (te same walidacje co formularze)
- Agent nie omija RLS Supabase

## UI

| Ścieżka | Opis |
|---------|------|
| `/ai/manager` | Panel agenta, automatyzacje, zatwierdzenia |
| `/ai/tasks` | Centrum zadań (filtry statusów) |
| Ctrl+K | Globalne pole poleceń (dashboard layout) |

Mobile/PWA: pełna szerokość, quick commands, bottom nav.

## Wdrożenie

```bash
npm run setup:stage13
npm run build
```

Env: `OPENAI_API_KEY` (opcjonalnie — fallback rule-based).

## Pliki kluczowe

| Plik | Rola |
|------|------|
| `src/lib/ai/agent/runner.ts` | Orkiestracja |
| `src/lib/ai/agent/tools/registry.ts` | Definicje narzędzi |
| `src/features/ai-manager/actions.ts` | Server actions |
| `supabase/migrations/20260615120000_stage13_ai_manager.sql` | Schema |
