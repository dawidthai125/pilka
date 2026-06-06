# Audyt ETAP 14 — Video Center / AI Video Analysis (post-fix)

**Data:** 2026-06-01  
**Zakres:** upload dużych plików, bezpieczeństwo storage, RLS, koszty storage/AI, wydajność przetwarzania, mobile, penetracja (cross-club, obejście uprawnień)  
**Status po audycie:** ✅ wszystkie problemy P0–P2 naprawione

Powiązane: [moduł Video Center](../modules/stage-14-video-center.md), [raport ETAP 14](../stage-14-report.md)

---

## Podsumowanie wykonawcze

| Obszar | Przed audytem | Po naprawie |
|--------|---------------|-------------|
| Upload dużych plików | ❌ cały plik w server action (`Buffer`), limit Vercel ~4.5 MB | ✅ klient → Supabase Storage (do 500 MB / bucket) |
| Storage — eskalacja share | ❌ jeden share → odczyt całego `{clubId}/videos/*` | ✅ `actor_can_read_video_storage_path` per `video_id` |
| RLS — szkice newsów | ❌ player z share widział `video_news_drafts` klubu | ✅ SELECT tylko sztab (manage / owner/president/coach) |
| RLS — spójność | ⚠️ brak triggerów child `club_id` | ✅ triggery + walidacja `storage_path` |
| Share — odbiorca | ⚠️ brak walidacji członkostwa | ✅ app + trigger `club_memberships.status = active` |
| Pipeline AI | ❌ synchroniczny w upload (timeout) | ✅ `after()` — odpowiedź natychmiast, analiza w tle |
| Signed URL | ⚠️ bez weryfikacji ścieżki | ✅ `isStoragePathForVideo(clubId, videoId)` |
| Dostęp player/parent | ❌ `/video/[id]` blokowany przez `requireVideoReadAccess` | ✅ `requireVideoDetailAccess` (share) |
| Mobile | ⚠️ brak `playsInline` | ✅ `playsInline` + `preload="metadata"` |
| Walidacja wejścia | ⚠️ enum bez sprawdzenia | ✅ `parseVideoCategory/EventType/ClipCategory` |
| Testy statyczne | — | ✅ `npm run audit:stage14` (14/14 PASS) |

---

## 1. Upload dużych plików

### Problem (P0)

`uploadVideoAction` ładował plik przez `Buffer.from(await file.arrayBuffer())` w server action. Na Vercel domyślny limit body server actions (~4.5 MB) uniemożliwiał realny upload do deklarowanych 500 MB.

### Naprawa

1. **`initVideoUploadAction`** — tworzy rekord `videos`, zwraca `{ videoId, storagePath }` (metadane + walidacja rozmiaru/MIME).
2. **Klient** (`VideoUploadForm`) — upload bezpośrednio przez `@/lib/supabase/client` do bucketu `club-videos`.
3. **`completeVideoUploadAction`** — weryfikuje obecność pliku, ustawia `storage_path`, kolejkuje job.
4. **`abortVideoUploadAction`** — rollback rekordu przy błędzie storage.

Pliki: `src/features/video/actions.ts`, `src/features/video/components/video-upload-form.tsx`

---

## 2. Bezpieczeństwo storage

### Problem (P0)

Polityka `club_videos_select` używała `actor_can_read_videos(club_id)`, które po jednym `video_shares` dawało dostęp do **wszystkich** plików w folderze klubu.

### Naprawa (migracja `20260616122000_stage14_audit_hardening.sql`)

| Funkcja | Rola |
|---------|------|
| `storage_is_club_video_path` | Wzorzec `{clubId}/videos/{videoId}/…`, blokada `..` |
| `storage_video_id_from_path` | Ekstrakcja UUID wideo ze ścieżki |
| `actor_can_read_video_storage_path` | SELECT tylko gdy `actor_can_access_video_row(video_id)` |
| `actor_can_upload_video_storage_path` | INSERT tylko gdy wideo istnieje w klubie + manage |

---

## 3. RLS i izolacja klubowa

### Zmiany

- **`actor_can_read_videos`** — tylko role sztabu (`owner`, `president`, `coach`, `scout`); **bez** klauzuli share.
- **`actor_can_access_video_row`** — sztab klubu **lub** aktywny share na **konkretne** wideo.
- **Triggery** `enforce_video_child_club_consistency` na wszystkich tabelach child.
- **`enforce_video_storage_path_consistency`** — `storage_path` musi zgadzać się z `id` i `club_id`.
- **`enforce_video_share_recipient`** — odbiorca musi być aktywnym członkiem klubu.
- **`video_news_drafts_select`** — tylko manage / owner / president / coach (nie player z share).

### Scenariusze penetracyjne

| # | Scenariusz | Oczekiwany wynik | Wynik |
|---|------------|------------------|-------|
| T1 | Niezalogowany GET signed URL / storage | Brak dostępu (auth + RLS) | ✅ |
| T2 | Użytkownik klubu A, UUID wideo klubu B | Brak rekordu / RLS deny | ✅ |
| T3 | Player z share na wideo X, próba pobrania wideo Y (ten sam klub) | Storage SELECT deny | ✅ (po fix) |
| T4 | Player z share, lista `video_news_drafts` | Pusty wynik / brak SELECT | ✅ |
| T5 | Share na user spoza klubu | Odrzucenie app + trigger DB | ✅ |
| T6 | Ścieżka storage `../` lub obcy clubId | `storage_is_club_video_path` → deny | ✅ |
| T7 | Signed URL z manipulowaną ścieżką | `isStoragePathForVideo` → null | ✅ |
| T8 | President — odczyt wszystkich wideo klubu | SELECT przez rolę | ✅ |
| T9 | Scout — manage bez publish news | Manage OK, approve draft tylko owner/coach | ✅ |

Automatyczne testy statyczne: `npm run audit:stage14` — **14/14 PASS**.

---

## 4. Koszty przechowywania (storage)

| Skala | Założenia | Szacunek/mies. |
|-------|-----------|----------------|
| 1 klub | 20 nagrań × 200 MB | ~4 GB → Supabase Pro storage w cenie planu |
| 10 klubów | jak wyżej × 10 | ~40 GB |
| 100 klubów | jak wyżej × 100 | ~400 GB — wymaga planu / lifecycle |

**Rekomendacje operacyjne (bez zmian kodu):**

- Monitorować rozmiar bucketu `club-videos` w Supabase Dashboard.
- Polityka retencji starych nagrań (operacyjna, poza ETAP 14).
- Limit `VIDEO_MAX_UPLOAD_MB` (env) — domyślnie 500 MB zgodnie z bucket `file_size_limit`.

---

## 5. Koszty AI

| Operacja | Wywołanie | Koszt |
|----------|-----------|-------|
| Analiza po upload | `generateVideoAnalysisReport` — 1× OpenAI na wideo | ~1 request / upload |
| Reprocess | `reprocessVideoAction` / agent `analyzeVideo` | +1 request (zatwierdzenie agenta) |
| Brak OpenAI | fallback szablonowy w `processing.ts` | 0 USD |

**Kontrola kosztów w kodzie:**

- Pipeline tylko po upload / explicit reprocess / agent z `requiresApproval: true`.
- Brak pętli ani batch bez limitu w ETAP 14.

Szacunki szczegółowe: [stage-14-report.md](../stage-14-report.md) § koszty.

---

## 6. Wydajność przetwarzania

| Aspekt | Przed | Po |
|--------|-------|-----|
| Upload HTTP | 1 request z całym plikiem przez Vercel | Direct upload do Supabase (poza limitem Vercel) |
| Czas odpowiedzi UI po upload | Czekanie na AI (10–60 s+) | Natychmiast — status `pending` → `processing` |
| Timeout serverless | Ryzyko przy dużym pliku + AI | `after()` oddziela analizę od response |
| Reprocess | Synchroniczny await | `after()` + komunikat „w toku” |

---

## 7. Działanie na telefonach

| Element | Status |
|---------|--------|
| Upload z `<input type="file">` | ✅ natywny picker iOS/Android |
| Odtwarzacz `<video>` | ✅ `playsInline`, `controls`, `preload="metadata"` |
| Layout responsywny | ✅ istniejące klasy Tailwind w Video Center |
| PWA | ✅ moduł w nawigacji PWA (ETAP 12) |

---

## 8. Lista napraw (ID → pliki)

| ID | Sev | Naprawa | Pliki |
|----|-----|---------|-------|
| V14-01 | P0 | Client-side upload | `actions.ts`, `video-upload-form.tsx` |
| V14-02 | P0 | Storage per-video SELECT | `20260616122000_stage14_audit_hardening.sql` |
| V14-03 | P0 | Usunięcie share z `actor_can_read_videos` | migracja audit |
| V14-04 | P1 | Triggery spójności + share recipient | migracja audit |
| V14-05 | P1 | Pipeline AI w `after()` | `actions.ts` |
| V14-06 | P1 | Walidacja signed URL | `uploads.ts`, `loaders.ts` |
| V14-07 | P2 | Walidacja share odbiorcy | `actions.ts` + trigger DB |
| V14-08 | P2 | Enum validation | `actions.ts` |
| V14-09 | P2 | Dostęp shared user do `/video/[id]` | `session.ts`, `[id]/page.tsx` |
| V14-10 | P2 | Mobile `playsInline` | `video-detail-view.tsx` |
| V14-11 | P2 | Szkice newsów — RLS | migracja audit |

---

## 9. Weryfikacja

```bash
npm run db:migrate:stage14-audit   # migracja hardening (jeśli jeszcze nie)
npm run audit:stage14              # 14/14 PASS
npm run typecheck
npm run build
```

---

## 10. Wnioski

ETAP 14 był funkcjonalnie kompletny, ale audyt ujawnił **krytyczną lukę storage** (eskalacja przez share) oraz **niedziałający upload dużych plików** w architekturze server action. Po naprawach moduł spełnia wymagania izolacji multi-tenant, obsługuje deklarowany limit 500 MB i nie blokuje UI podczas analizy AI.

**Nie dodano nowych funkcji produktowych** — wyłącznie poprawki bezpieczeństwa, wydajności i zgodności z limitem storage.
