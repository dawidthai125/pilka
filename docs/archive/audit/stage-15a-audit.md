# Audyt ETAP 15A — Content Hub (post-fix)

**Data:** 2026-05-31  
**Zakres:** bezpieczeństwo treści, workflow akceptacji, RLS, obejście publikacji, integracja AI / Video Center / strona publiczna, mobile, penetracja  
**Status po audycie:** ✅ wszystkie problemy P0–P2 naprawione

Powiązane: [moduł Content Hub](../modules/stage-15a-content-hub.md), [raport ETAP 15A](../stage-15a-report.md)

---

## Podsumowanie wykonawcze

| Obszar | Przed audytem | Po naprawie |
|--------|---------------|-------------|
| Publikacja wariantów kanałów | ❌ coach mógł ustawić `status = published` przez RLS UPDATE | ✅ trigger + RLS UPDATE (coach tylko `draft`) |
| Publikacja posta | ⚠️ trigger na `content_posts` OK, brak walidacji app | ✅ trigger + walidacja statusu w `publishContentPostAction` |
| Cross-club refs | ⚠️ brak triggerów na match/video/sponsor/clip | ✅ triggery DB + `verifyContentReferences` |
| Audyt approvals | ⚠️ coach mógł INSERT fałszywy log `published` | ✅ RLS: coach tylko `submitted` |
| Assety sponsorów | ❌ sponsor widział całą bibliotekę (`post_id IS NULL`) | ✅ SELECT tylko assety własnych postów |
| AI generator | ⚠️ obce ID ignorowane, nadal zapisywane | ✅ odrzucenie z błędem |
| Agent AI | ⚠️ błędny status w odpowiedzi; reset published | ✅ poprawny status; blokada published |
| Strona publiczna | ⚠️ brak walidacji statusu przed upsert `website_news` | ✅ `publishContentToWebsite` wymaga approved/pending |
| Mobile | ✅ responsywne layouty | ✅ bez zmian (weryfikacja PASS) |
| Testy statyczne | — | ✅ `npm run audit:stage15a` (14/14 PASS) |

---

## 1. Bezpieczeństwo treści

### Problem (P0) — CH-01: obejście przez warianty kanałów

Polityka `content_channel_variants_manage` (FOR ALL) pozwalała każdemu użytkownikowi z `actor_can_create_content` (w tym **coach**) na UPDATE `status` na `published` / `approved` / `queued` bez przechodzenia workflow posta głównego.

**Scenariusz penetracyjny:** coach edytuje `content_channel_variants SET status = 'published'` — treść „publikowana” na Facebook/Instagram bez akceptacji.

### Naprawa

Migracja `20260617123000_stage15a_audit_hardening.sql`:

| Element | Rola |
|---------|------|
| `enforce_content_channel_variant_status` | Blokuje `approved`/`published` bez `actor_can_publish_content`; `queued` bez `actor_can_manage_content` |
| `content_channel_variants_update` | WITH CHECK: coach tylko `status = 'draft'` |
| Rozdzielenie FOR ALL → INSERT / UPDATE / DELETE | Jawne reguły per operacja |

---

## 2. Workflow akceptacji

### Stan docelowy

```
draft → pending_approval → approved → published
                ↓
            rejected → draft (ponowne wysłanie)
```

### Walidacje aplikacji (po fix)

| Akcja | Warunek statusu |
|-------|-----------------|
| `submitContentForApprovalAction` | tylko `draft` lub `rejected` |
| `approveContentPostAction` | tylko `pending_approval` |
| `rejectContentPostAction` | tylko `pending_approval` |
| `publishContentPostAction` | tylko `approved` lub `pending_approval` (manager może opublikować bez osobnego kroku approve) |

### Trigger DB (istniejący + utrzymany)

`enforce_content_publish_role` na `content_posts` — coach nie może INSERT/UPDATE na `published` / `approved`.

---

## 3. RLS

### Tabele objęte audytem

| Tabela | Kluczowe reguły |
|--------|-----------------|
| `content_posts` | SELECT przez `actor_can_access_content_post`; UPDATE coach → tylko draft/pending |
| `content_channel_variants` | UPDATE coach → draft; trigger status |
| `content_approvals` | INSERT coach → tylko `submitted` |
| `content_assets` | Sponsor SELECT tylko assety postów z własnym `sponsor_id` |
| `storage.objects` (club-assets/content) | `actor_can_read_content` / `actor_can_create_content` |

### Spójność club_id (P1 — CH-02)

Nowe triggery:

- `enforce_content_post_reference_consistency` — `match_id`, `video_id`, `sponsor_id`, `video_report_id`
- `enforce_content_asset_reference_consistency` — `post_id`, `video_id`, `video_clip_id`

Istniejące (ETAP 15A): `enforce_content_post_child_club_consistency` na wariantach, approvals, calendar.

---

## 4. Publikacja bez zatwierdzenia — testy penetracyjne

| # | Scenariusz | Oczekiwany wynik | Wynik |
|---|------------|------------------|-------|
| T1 | Coach UPDATE `content_posts.status = 'published'` | Trigger EXCEPTION | ✅ |
| T2 | Coach UPDATE `content_channel_variants.status = 'published'` | Trigger + RLS deny | ✅ (po fix) |
| T3 | Coach INSERT `content_approvals` action = `published` | RLS deny | ✅ (po fix) |
| T4 | Coach `publishContentPostAction` | `canPublishContent` deny | ✅ |
| T5 | Manager `publishContentPostAction` na `draft` | App error — zły status | ✅ (po fix) |
| T6 | Agent `proposeContentPublication` na published | App error | ✅ (po fix) |
| T7 | Coach INSERT `website_news` status published | Trigger website (ETAP 9) deny | ✅ |
| T8 | Cross-club `match_id` w upsert | App + trigger deny | ✅ (po fix) |

---

## 5. Integracja z AI

| Ścieżka | Zachowanie | Status |
|---------|------------|--------|
| Formularz `/content/ai` | `createContentPostFromAi` → draft (manager) / pending_approval (coach) | ✅ |
| Agent `generateContentPost` | `requiresApproval: true`; nie publikuje | ✅ |
| Agent `proposeContentPublication` | ustawia `pending_approval` + log `submitted`; wymaga `content:publish` + approval człowieka | ✅ |
| Kontekst wideo | `video_reports` filtrowane `.eq("club_id")`; obce `videoId` odrzucone | ✅ |
| Odpowiedź agenta | status zgodny z rolą (draft vs pending_approval) | ✅ (po fix) |

Pliki: `src/lib/content/create-from-ai.ts`, `src/lib/ai/agent/tools/write.ts`, `src/lib/ai/agent/tools/registry.ts`

---

## 6. Integracja z Video Center

| Połączenie | Mechanizm |
|------------|-----------|
| `content_posts.video_id` | FK + trigger spójności club_id |
| `content_posts.video_report_id` | FK + trigger spójności |
| `content_assets.video_id` / `video_clip_id` | FK + trigger + walidacja w `addContentAssetAction` |
| AI z kontekstem wideo | `video_reports` po `video_id` w ramach klubu |

Brak bezpośredniej publikacji z Video Center — treść przechodzi przez Content Hub workflow.

---

## 7. Integracja ze stroną publiczną

Ścieżka: `publishContentPostAction(publishToWebsite=true)` → `publishContentToWebsite` → upsert `website_news` (status `published`).

| Warstwa | Ochrona |
|---------|---------|
| App | `canPublishContent`; status posta approved/pending; `publishContentToWebsite` waliduje status |
| DB | `enforce_website_news_publish_role` (ETAP 9) — coach nie publikuje newsów |
| Link zwrotny | `content_posts.website_news_id` aktualizowany po upsert |

Revalidacja: `/aktualnosci`, `/`, `/kibic`, `/website/news`.

---

## 8. Działanie mobilne

Komponenty Content Hub używają wzorców responsywnych Tailwind:

- `content-post-list.tsx` — `flex-col sm:flex-row`
- `content-dashboard-stats.tsx` — `sm:grid-cols-2 lg:grid-cols-5`
- `content-calendar-view.tsx` — `flex-col sm:flex-row`
- `content-ai-generator-form.tsx` — `sm:grid-cols-3`, `w-full sm:w-auto`
- `content-media-library.tsx` — `sm:grid-cols-2 lg:grid-cols-3`

Przyciski workflow w `content-post-detail-view` — `flex flex-wrap gap-2` (zawijanie na wąskich ekranach).

---

## 9. Pliki zmienione w audycie

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/20260617123000_stage15a_audit_hardening.sql` | Triggery, RLS wariantów/approvals/assets |
| `src/lib/content/verify-references.ts` | Walidacja cross-club refs |
| `src/features/content/actions.ts` | Workflow status + verify refs |
| `src/lib/content/create-from-ai.ts` | Odrzucenie obcych ID |
| `src/lib/content/publish.ts` | Walidacja statusu przed stroną |
| `src/lib/ai/agent/tools/write.ts` | Status agenta, blokada published |
| `scripts/audit-stage15a-security.mjs` | Testy statyczne 14/14 |
| `package.json` | `audit:stage15a`, `db:migrate:stage15a-audit` |

---

## 10. Weryfikacja

```bash
npm run db:migrate:stage15a-audit   # migracja hardening (jeśli ETAP 15A już wdrożony)
npm run audit:stage15a              # 14/14 PASS
npm run typecheck
npm run build
```

---

## 11. Werdykt

ETAP 15A Content Hub spełnia wymagania bezpieczeństwa publikacji treści po audycie. Krytyczne obejście publikacji przez warianty kanałów zostało zamknięte na poziomie RLS i triggerów. Workflow akceptacji jest egzekwowany w aplikacji i bazie. Integracje AI, Video Center i strona publiczna działają wyłącznie przez autoryzowane ścieżki z walidacją statusu.

**Bez nowych funkcji** — wyłącznie hardening i raport.
