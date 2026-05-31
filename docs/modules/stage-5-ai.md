# ETAP 5 — Club AI Assistant

Dokumentacja modułu inteligentnego asystenta AI klubu piłkarskiego.

## Zakres

| # | Funkcja | Status |
|---|---------|--------|
| 1 | Panel Club AI Assistant | ✅ |
| 2 | Chat AI z kontekstem danych klubu | ✅ |
| 3 | Historia rozmów, wyszukiwanie, przypinanie | ✅ |
| 4 | Raport meczowy AI (edytowalny, publikacja) | ✅ |
| 5 | Raport treningowy AI (tydzień) | ✅ |
| 6 | Raport zarządu AI (miesiąc) | ✅ |
| 7 | AI Social Media (FB, IG, strona, kolejka) | ✅ |
| 8 | Sugestie AI (frekwencja, dokumenty, kontuzje) | ✅ |
| 9 | Centrum raportów AI (kategorie) | ✅ |
| 10 | Integracja OpenAI API (env) | ✅ |
| 11 | RLS + RBAC + seed | ✅ |

## Architektura

```
src/features/ai/
├── actions.ts
└── components/
    ├── ai-dashboard.tsx
    ├── ai-chat-list.tsx
    ├── ai-chat-view.tsx
    ├── ai-reports-center.tsx
    ├── ai-report-editor.tsx
    └── ai-suggestions-panel.tsx

src/lib/ai/
├── constants.ts
├── context.ts      — agregacja danych klubu (tylko system)
├── insights.ts     — reguły sugestii
└── mappers.ts

src/integrations/openai/
└── index.ts        — wywołania Chat Completions API

src/app/(dashboard)/ai/
├── page.tsx
├── chat/page.tsx
├── chat/[id]/page.tsx
├── reports/page.tsx
├── reports/[id]/page.tsx
└── suggestions/page.tsx
```

## Tabele bazy danych

### `ai_report_categories`

Słownik kategorii raportów: mecze, treningi, zawodnicy, zarząd, sponsorzy.

### `ai_conversations`

Rozmowy użytkownika z asystentem (`user_id`, `title`, `is_pinned`).

### `ai_messages`

Wiadomości w rozmowie (`role`: user / assistant / system, `content`).

### `ai_reports`

Zapisane raporty AI — kategoria, typ, treść, status (`draft` / `published`), metadane, źródło.

Typy raportów: `match_summary`, `training_weekly`, `management_monthly`, `social_*`.

### `ai_suggestions`

Automatyczne sugestie działań (frekwencja, dokumenty, kontuzje, brak odpowiedzi).

## Relacje

```
clubs ──< ai_conversations >── profiles (user_id)
ai_conversations ──< ai_messages
clubs ──< ai_reports >── profiles (created_by, reviewed_by)
clubs ──< ai_suggestions
ai_reports.category ──> ai_report_categories.id
```

## Uprawnienia RBAC

| Uprawnienie | Role |
|-------------|------|
| `ai:read`, `ai:chat` | owner, president, sports_director, coach |
| `ai:reports`, `ai:manage`, `ai:publish` | owner, president, sports_director |
| `ai:reports_sports`, `ai:publish` | coach (raporty sportowe) |
| brak dostępu | player, parent, sponsor |

Trener: raporty kategorii **mecze, treningi, zawodnicy** — bez zarządu i sponsorów.

Helpery: `canReadAi`, `canUseAiChat`, `canManageAiReports`, `canAccessAiReportCategory`.

## Polityki RLS

| Tabela | SELECT | Zapis |
|--------|--------|-------|
| `ai_conversations` | własne rozmowy + `actor_can_use_ai_chat` | własne rozmowy |
| `ai_messages` | przez własną rozmowę | INSERT przez własną rozmowę |
| `ai_reports` | `actor_can_read_ai_report(category)` | INSERT/UPDATE wg kategorii |
| `ai_suggestions` | `actor_can_use_ai_chat` | staff AI |

Funkcje DB: `actor_can_use_ai_chat`, `actor_can_manage_ai`, `actor_can_read_ai_report`.

## OpenAI

- Klucz: `OPENAI_API_KEY` w `.env.local` (server-only)
- Model: `OPENAI_MODEL` (domyślnie `gpt-4o-mini`)
- Asystent otrzymuje **wyłącznie** JSON z `buildAiClubContext()` — bez halucynacji poza danymi
- Bez klucza: fallback z danymi systemowymi + komunikat o konfiguracji

## Trasy

| Trasa | Opis |
|-------|------|
| `/ai` | Panel główny |
| `/ai/chat` | Lista rozmów |
| `/ai/chat/[id]` | Czat |
| `/ai/reports` | Centrum raportów |
| `/ai/reports/[id]` | Edycja / publikacja |
| `/ai/suggestions` | Sugestie AI |

## Setup

```bash
npm run setup:stage5
```

Wymaga `SUPABASE_DB_PASSWORD`. Opcjonalnie `OPENAI_API_KEY` dla pełnej generacji AI.

## Testowanie

1. Zaloguj: `trener@piorun.test` / `Piorun2026!` lub `wlasciciel@piorun.test`
2. `/ai` — panel, sugestie
3. `/ai/chat` — pytania o frekwencję, formę, bramki
4. `/ai/reports` — raporty seed + generowanie
5. Edycja raportu → publikacja (akceptacja treści)
