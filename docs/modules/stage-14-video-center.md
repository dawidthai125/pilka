# ETAP 14 — Video Center (AI Video Analysis)

**Moduł:** Video Center  
**Ścieżka UI:** `/video`  
**Wersja:** 14.0

---

## Zakres

- Upload nagrań (MP4, MOV, AVI, MKV) → Supabase Storage (`club-videos`)
- Biblioteka z kategoriami: mecze, treningi, analiza przeciwnika, materiały szkoleniowe
- Pipeline: storage → job → analiza AI → raport
- Raporty: mecz, trening, przeciwnik
- Timeline zdarzeń (ręcznie + sugestie AI)
- Notatki trenera (timestamp)
- Clip generator (zakres czasu)
- AI News Generator (szkice wymagające zatwierdzenia)
- Integracja z AI Club Manager (ETAP 13)
- PWA: responsywny UI, quick action „Video Center”

---

## Uprawnienia

| Rola | Dostęp |
|------|--------|
| Właściciel | pełny (`video:manage`, share, publish_news) |
| Prezes | odczyt |
| Trener | pełny |
| Skaut | manage + share (bez publish_news) |
| Zawodnik / Rodzic | tylko `video_shares` |

---

## Baza danych

Tabele: `videos`, `video_jobs`, `video_reports`, `video_events`, `video_notes`, `video_clips`, `video_shares`, `video_news_drafts`

Migracje:

- `20260616120000_stage14_video_module.sql`
- `20260616121000_seed_stage14_video.sql`

Setup: `npm run setup:stage14`

---

## Konfiguracja

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `VIDEO_MAX_UPLOAD_MB` | 500 | Maks. rozmiar uploadu (MB) |
| `OPENAI_API_KEY` | — | Opcjonalnie — wzbogaca raporty AI |

---

## Architektura (skrót)

```
Upload (FormData)
  → videos + storage (club-videos/{clubId}/videos/{id}/)
  → video_jobs (pending)
  → runVideoProcessingPipeline
       → generateVideoAnalysisReport (OpenAI lub szablon)
       → video_reports + video_events (ai_suggested)
       → video_news_drafts (mecze, pending_approval)
  → status ready
```

---

## Pliki kluczowe

| Warstwa | Ścieżka |
|---------|---------|
| UI | `src/app/(dashboard)/video/` |
| Akcje | `src/features/video/actions.ts` |
| Loaders | `src/lib/video/loaders.ts` |
| AI pipeline | `src/lib/video/processing.ts` |
| Typy | `src/types/video.ts` |
| AI tools | `src/lib/ai/agent/tools/registry.ts` |
