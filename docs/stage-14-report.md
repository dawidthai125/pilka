# ETAP 14 — raport: AI Video Analysis (Video Center)

**Data:** 2026-06-01  
**Status:** ✅ zakończony

Powiązane: [moduł Video Center](../modules/stage-14-video-center.md)

---

## 1. Podsumowanie

| Element | Status |
|---------|--------|
| Video Center UI (`/video`) | ✅ |
| Upload → Supabase Storage | ✅ |
| Pipeline przetwarzania + statusy | ✅ |
| Raporty AI (mecz / trening / przeciwnik) | ✅ |
| Timeline, notatki, klipy | ✅ |
| AI News Generator (zatwierdzanie) | ✅ |
| RLS + bucket `club-videos` | ✅ |
| Seed Piorun Wawrzeńczyce | ✅ |
| Integracja AI Agent (ETAP 13) | ✅ |
| PWA (mobile/tablet/desktop) | ✅ |

---

## 2. Architektura

### 2.1 Warstwy

```
┌─────────────────────────────────────────┐
│  Next.js App Router — /video/*          │
│  (dashboard layout + PWA)               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Server Actions — features/video        │
│  Loaders — lib/video                    │
└─────────────────┬───────────────────────┘
                  │
     ┌────────────┼────────────┐
     ▼            ▼            ▼
 PostgreSQL   Storage      OpenAI (opt.)
 (RLS)        club-videos
```

### 2.2 Pipeline przetwarzania

| Krok | Status job | Akcja |
|------|------------|-------|
| 1 | `pending` | Zapis metadanych + upload storage |
| 2 | `processing` | Weryfikacja pliku |
| 3 | `processing` | Analiza AI (`generateVideoAnalysisReport`) |
| 4 | `ready` | Raport + sugestie zdarzeń + szkice news |
| — | `error` | `job_error` / `error_message` |

---

## 3. AI

- **Szablon domyślny:** strukturyzowany JSON (summary, strengths, weaknesses, key_moments, rekomendacje) per kategoria nagrania.
- **OpenAI (opcjonalnie):** gdy `OPENAI_API_KEY` — wzbogacenie raportu przez `callOpenAiChat`.
- **Sugestie timeline:** zdarzenia `ai_suggested` → trener potwierdza (`ai_confirmed`).
- **News drafts:** tylko dla kategorii `match`; status `pending_approval` → owner/coach zatwierdza.

### Narzędzia AI Club Manager

| Tool | Opis |
|------|------|
| `getVideos` | Lista nagrań i statusów |
| `analyzeVideo` | Generuje raport (wymaga zatwierdzenia) |
| `generateVideoSummary` | Podsumowanie dla zawodników |

---

## 4. Bezpieczeństwo

### 4.1 RLS

- `actor_can_manage_videos` — owner, coach, scout
- `actor_can_read_videos` — + president, + użytkownicy z `video_shares`
- `actor_can_access_video_row` — per-wiersz video

### 4.2 Storage

- Bucket prywatny `club-videos`
- Polityki powiązane z `actor_can_read_videos` / `actor_can_manage_videos`
- Ścieżka: `{clubId}/videos/{videoId}/{filename}`

### 4.3 Aplikacja

- `requireVideoReadAccess` na stronach
- Server actions: `canManageVideos`, `canPublishVideoNews`, `canShareVideos`
- Middleware: `/video` w protected prefixes

---

## 5. Analiza kosztów (szacunek miesięczny)

Założenia na klub:

- 20 nagrań/mies. × średnio 300 MB = **6 GB storage**
- 20 analiz AI/mies. (GPT-4o-mini ~2k tokenów) ≈ **$0.40–1.00**
- Transfer: odtwarzanie 50×/mies. × 300 MB ≈ **15 GB egress**

| Skala | Storage (6 GB/klub) | Transfer (15 GB/klub) | AI (20 analiz) | **Suma orientacyjna** |
|-------|---------------------|------------------------|----------------|------------------------|
| **1 klub** | ~$0.15 | ~$1.20 | ~$0.80 | **~$2–3 / mies.** |
| **10 klubów** | ~$1.50 | ~$12 | ~$8 | **~$22–25 / mies.** |
| **100 klubów** | ~$15 | ~$120 | ~$80 | **~$215–230 / mies.** |

Supabase Pro ($25) pokrywa storage/transfer do limitów planu; powyżej 100 klubów — dedykowany tier + CDN/cache dla wideo.

**Uwaga:** rzeczywiste koszty zależą od długości nagrań, liczby odtworzeń i modelu OpenAI. Cold start / brak transkodowania obniża koszt infra, ale pełna analiza frame-by-frame (przyszłość) zwiększyłaby AI 10–50×.

---

## 6. Dane testowe (Piorun Wawrzeńczyce)

| Typ | Liczba |
|-----|--------|
| Nagrania | 4 (mecz, trening, przeciwnik, szkoleniowy) |
| Raporty AI | 3 |
| Zdarzenia timeline | 5 |
| Notatki trenera | 3 |
| Klipy | 3 |
| Szkice news | 2 (pending) |

---

## 7. Weryfikacja

```bash
npm run setup:stage14
npm run typecheck
npm run build
```

**UI:** `/video` → dashboard, `/video/library`, `/video/upload`, `/video/{id}`

**Konto testowe:** `wlasciciel@piorun.test` / `trener@piorun.test`

---

## 8. Pliki dodane / zmienione

### Nowe

- `supabase/migrations/20260616120000_stage14_video_module.sql`
- `supabase/migrations/20260616121000_seed_stage14_video.sql`
- `src/types/video.ts`
- `src/lib/video/*`
- `src/features/video/*`
- `src/app/(dashboard)/video/**`
- `scripts/setup-stage14.mjs`
- `docs/modules/stage-14-video-center.md`

### Zmienione

- `src/types/rbac.ts`, `src/config/permissions.ts`
- `src/lib/auth/session.ts` — `requireVideoReadAccess`
- `src/middleware.ts`, `src/config/navigation.ts`
- `src/lib/ai/agent/tools/*`, `src/types/ai-agent.ts`
- `src/lib/pwa/quick-actions.ts`
- `src/types/database.ts`
- `package.json`

---

## 9. Wnioski

ETAP 14 dostarcza kompletny **Video Center** zgodny z architekturą Football Club OS: RLS per klub, server actions, integracja AI Agent i responsywny UI. Pipeline AI działa od razu (szablony); OpenAI opcjonalnie podnosi jakość raportów. Kolejne etapy mogą dodać transkodowanie, miniaturki i rzeczywistą analizę klatek — poza zakresem 14.
