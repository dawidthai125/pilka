# Raport — ETAP 13 (AI Club Manager)

**Data:** 2026-06-15  
**Zakres:** Agent AI z akcjami, narzędziami, zatwierdzeniami, audytem  
**Bez przebudowy modułów domenowych**

---

## Podsumowanie

| Obszar | Status |
|--------|--------|
| AI Club Manager (`/ai/manager`) | ✅ |
| System narzędzi (read/write + RBAC) | ✅ |
| Action Approval (LOW/MEDIUM/HIGH) | ✅ |
| Centrum zadań (`/ai/tasks`) | ✅ |
| Command Palette (Ctrl+K) | ✅ |
| Automatyzacje (propozycje) | ✅ |
| Pamięć sesji (`ai_memory`) | ✅ |
| Audyt (`ai_task_logs`, `ai_tool_calls`) | ✅ |
| Migracja DB + RLS + seed Piorun | ✅ |
| Mobile/PWA | ✅ |
| Dokumentacja | ✅ |

**Weryfikacja:** `npm run typecheck` · `npm run build` · `npm run setup:stage13`

---

## 1. Architektura agenta

Warstwa orkiestracji (`runAgentCommand`) na istniejącym Club AI Assistant (ETAP 5):
- Parser intencji (rule-based, gotowy pod OpenAI tools)
- Rejestr narzędzi z poziomami ryzyka
- Delegacja do `createTraining`, `createMatch`, `buildAiClubContext` itd.

---

## 2. System narzędzi

13 narzędzi w `AI_TOOL_REGISTRY`:
- **Read:** getPlayers, getMatches, getTrainings, getSponsors, getFinances, getDocuments, getInventory
- **Write:** createTraining, createMatch, createNotification, generateReport, generateNews, addNote

Każde narzędzie: walidacja `hasAnyPermission()` przed wykonaniem.

---

## 3. System zatwierdzeń

| Poziom | Przykłady | Zachowanie |
|--------|-----------|------------|
| LOW | raporty, analizy, odczyt | Wykonanie od razu |
| MEDIUM | trening, mecz, powiadomienie | Wymaga Zatwierdź/Odrzuć |
| HIGH | (zarezerwowane) | Zawsze zatwierdzenie |

Tabele: `ai_action_approvals` + UI `ApprovalCard`.

---

## 4. Logi audytowe

- `ai_tasks` — zadania agenta
- `ai_task_logs` — pełna ścieżka (started → tool_executed → completed/rejected)
- `ai_tool_calls` — input/output każdego narzędzia

---

## 5. Bezpieczeństwo

- Sesja Supabase SSR, brak service role w UI
- RLS: użytkownik widzi tylko własne zadania w klubie
- Write tools → istniejące server actions (identyczne sprawdzenia co formularze)
- Pamięć: tylko streszczenia, scoped per club/user

---

## 6. UI

- **AI Club Manager** — panel z poleceń, automatyzacjami, pamięcią
- **Centrum zadań** — filtry: oczekujące / wykonane / anulowane / do zatwierdzenia
- **Ctrl+K** — globalne pole poleceń w dashboard layout
- Linki z `/ai` (Club AI Assistant dashboard)

---

## 7. Dane testowe (Piorun Wawrzeńczyce)

Seed `20260615121000_seed_stage13_ai_manager.sql`:
- Zadanie completed (frekwencja)
- Zadanie awaiting_approval (trening)
- Zadanie cancelled (raport)
- Automatyzacje pending
- Przykładowa pamięć agenta

---

## Wdrożenie

```bash
npm run setup:stage13
npm run build
```

Szczegóły: [`docs/modules/stage-13-ai-manager.md`](./modules/stage-13-ai-manager.md)

---

*ETAP 13 zakończony — bez przejścia do ETAP 14+.*
