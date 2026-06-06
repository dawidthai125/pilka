# ETAP 13.8 — infrastruktura produkcyjna (analiza)

**Data:** 2026-06-01  
**Zakres:** Vercel, Supabase, OpenAI, PWA  
**Status:** ✅ analiza zakończona — **bez zmian w kodzie, bez nowych funkcji**

Powiązane: [ETAP 13.7 — optymalizacja TTFB](./stage-13.7-performance-audit.md) · [checklist wdrożenia](../deployment/production-checklist.md)

---

## Werdykt (TL;DR)

Twoja hipoteza jest **prawdziwa**:

| Usługa | Obecny region |
|--------|---------------|
| **Vercel (Functions / SSR)** | **`iad1` — US East (Waszyngton)** |
| **Supabase (PostgreSQL + Auth + API)** | **`eu-west-1` — EU West (Irlandia)** |

To klasyczny układ **USA → Europa** na każdym requestcie do bazy. Po optymalizacjach kodu (13.7) **następny największy dźwignia to region Vercel**, nie kolejne tygodnie mikro-optymalizacji.

**Rekomendacja przed ETAPEM 14:** ustawić **Vercel Serverless Functions → `fra1` (Frankfurt)** *(alternatywa: `dub1` — Dublin, najbliżej Supabase)*.

Szacowany zysk TTFB na typowych ekranach: **~120–220 ms** (zależnie od liczby round-tripów Supabase w ścieżce krytycznej).

---

## 1. Weryfikacja regionów

### 1.1 Vercel (projekt `pilka`)

| Element | Wartość | Źródło |
|---------|---------|--------|
| URL produkcji | `https://pilka-mu.vercel.app` | Vercel CLI |
| Ostatni deployment | `dpl_6HgQSzkcrwoBCkqGLzrVwHEx8gYN` | `vercel inspect pilka-mu.vercel.app` |
| **Region SSR / Serverless** | **`iad1`** | Wszystkie trasy `λ` w deploymencie mają tag `[iad1]` |
| `vercel.json` | Brak pola `regions` | Domyślny region konta → US East |
| Node.js | 24.x | `vercel project inspect pilka` |
| Edge Middleware | Global Edge (nearest POP) | Next.js middleware — **nie** dziedziczy `fra1` automatycznie |

**Wniosek:** cały RSC, API Routes i Server Actions wykonują się w **Waszyngtonie**, podczas gdy baza jest w **Irlandii**.

---

### 1.2 Supabase (projekt `pwkqnwqvrdiaycveacxa`)

| Element | Wartość | Źródło |
|---------|---------|--------|
| URL API | `https://pwkqnwqvrdiaycveacxa.supabase.co` | `.env.local` |
| **Region bazy** | **`eu-west-1` (Irlandia)** | Pooler `aws-0-eu-west-1.pooler.supabase.com` w `scripts/lib/db-client.mjs` |
| Auth | Ten sam projekt (GoTrue) | `NEXT_PUBLIC_SUPABASE_URL` |
| PostgREST / RPC | Ten sam region co DB | Wywołania z aplikacji |

**Potwierdzenie w dashboardzie:** Supabase → Project Settings → General → **Region: West EU (Ireland)**.

Migracja regionu Supabase po utworzeniu projektu **nie jest trywialna** — na dziś zakładamy **Supabase zostaje w EU West 1**.

---

### 1.3 Region Functions (Next.js / API)

| Typ | Region | Uwagi |
|-----|--------|-------|
| Strony `(dashboard)/*` (RSC) | **`iad1`** | Dynamic SSR, loadery `session.ts` |
| `middleware.ts` | **Edge (globalnie)** | Refresh sesji Supabase — latencja zależy od POP użytkownika |
| `/api/pwa/*` (5 endpointów) | **`iad1`** | offline-data, sync, push |
| `/icons/icon-{192,512}` | **Edge** (`runtime = "edge"`) | Wyjątek — ikony PWA |
| Build | Vercel Build (nie runtime) | Osobny od function region |

**Ścieżka krytyczna TTFB:** Middleware (Edge) → **SSR w `iad1`** → **1–2× RPC Supabase EU** (po 13.7).

---

### 1.4 Region Cron Jobs

| Cron | Skonfigurowany? | Region wykonania |
|------|-----------------|------------------|
| **Vercel Cron** (`vercel.json`) | **Nie** — brak sekcji `crons` | — |
| **PWA push dispatch** | Endpoint `POST /api/pwa/push/dispatch` | **`iad1`** (gdy wywołany z zewnętrznego crona) |
| **Sync reminders** (treningi, sponsorzy) | **Sync-on-read** na `/notifications` | **`iad1`** + wiele zapytań Supabase |

**Wniosek:** nie ma dedykowanych cronów Vercel w repozytorium. Zaplanowany worker push będzie działał w **tym samym regionie co Functions** — dziś **`iad1`**.

**Rekomendacja infra (bez kodu):** po zmianie regionu Functions na `fra1`, cron wywołujący `/api/pwa/push/dispatch` powinien być hostowany w EU (Vercel Cron, GitHub Actions w `eu-central-1`, lub Supabase Edge Function + pg_cron).

---

## 2. Analiza per warstwa

### 2.1 Vercel

```
Użytkownik (PL/EU)
    │
    ▼
Edge Middleware ──► Supabase Auth (EU)     ~20–40 ms RTT (OK)
    │
    ▼
SSR / RSC w iad1 ──► Supabase PostgREST (EU)   ~100–150 ms RTT × N zapytań  ⚠️
    │
    ▼
HTML / RSC stream → użytkownik
```

- **CDN / statyczne assety:** Vercel Edge — OK globally.
- **Problem:** compute SSR w USA przy bazie w EU.

---

### 2.2 Supabase

- Wszystkie dane klubowe, Auth, RLS, RPC (`get_app_layout_context`, itd.) — **EU West 1**.
- Czysty czas SQL po 13.7: **~49–52 ms / RPC** (pomiar direct pg, ETAP 13.7).
- Opóźnienie produkcyjne ≠ czas SQL — dominuje **RTT Vercel↔Supabase**.

---

### 2.3 OpenAI

| Aspekt | Stan |
|--------|------|
| Wywołania | Server-side z Route Handlers / Server Actions (`src/integrations/openai`) |
| Region compute dziś | **`iad1`** (razem z SSR) |
| Region OpenAI API | **USA** (domyślnie `api.openai.com`) |
| Wpływ na TTFB stron | **0 ms** — OpenAI tylko przy czacie / agencie, nie przy cold load |

**Po migracji Vercel → `fra1`:**

- **Supabase:** duży zysk (−80–120 ms / round-trip).
- **OpenAI:** możliwy **niewielki wzrost** latencji (+20–40 ms vs `iad1`) — akceptowalny, bo AI to interakcja użytkownika, nie każda strona.

**Rekomendacja:** nie trzymać Vercel w USA „dla OpenAI”. Korzyść z EU Supabase przeważa.

---

### 2.4 PWA

| Komponent | Region / wpływ |
|-----------|----------------|
| Service Worker (`/sw.js`) | **Klient** — brak wpływu regionu serwera |
| IndexedDB / sync queue | **Klient** |
| `GET /api/pwa/offline-data` | **`iad1` → Supabase EU** — cross-region (~383 ms TTFB lokalnie + narzut prod) |
| Push subscribe/unsubscribe | **`iad1`** |
| Push dispatch (cron) | **`iad1`** dziś |
| Defer fetch 2,5 s (13.5) | Nie blokuje TTFB HTML — ale API nadal wolniejsze z USA |

**Po `fra1`:** offline-data spada szacunkowo o **~100 ms**; push dispatch szybszy dostęp do `notification_queue` w Supabase.

---

## 3. Oszacowanie opóźnień: `iad1` → `eu-west-1`

### 3.1 RTT sieciowy (typowe wartości branżowe)

| Trasa | RTT (ms) | Uwagi |
|-------|----------|-------|
| **iad1 ↔ eu-west-1** | **90–150** | Transatlantyk, HTTPS + TLS |
| **fra1 ↔ eu-west-1** | **15–35** | Frankfurt ↔ Dublin |
| **dub1 ↔ eu-west-1** | **8–25** | Dublin ↔ Dublin (ten sam region AWS) |
| Użytkownik PL ↔ `fra1` | **15–30** | Dobry POP |
| Użytkownik PL ↔ `iad1` | **90–120** | Gorszy POP dla EU userów |

**Kara cross-region (Vercel compute → Supabase):** **~80–120 ms na round-trip** względem `fra1`/`dub1`.

---

### 3.2 Model TTFB produkcyjnego (po optymalizacji 13.7)

Pomiar lokalny (`next start`, PL → Supabase EU) **nie zawiera** kary `iad1`.

| Widok | TTFB lokalny (13.7) | Round-tripy Supabase (ścieżka krytyczna) | Szac. TTFB na Vercel **`iad1`** | Szac. TTFB na **`fra1`** | **Zysk** |
|-------|---------------------|-------------------------------------------|--------------------------------|--------------------------|----------|
| Dashboard | 271 ms | 2 (auth + layout RPC) | **~430–510 ms** | **~270–320 ms** | **~160–190 ms** |
| Sponsorzy | 296 ms | 3 (layout + lista + stats RPC) | **~530–620 ms** | **~300–360 ms** | **~200–260 ms** |
| Finanse | 288 ms | 2 (layout + finance RPC) | **~450–530 ms** | **~290–340 ms** | **~160–190 ms** |
| AI Manager | 295 ms | 2 (layout + snapshot RPC) | **~455–535 ms** | **~295–345 ms** | **~160–190 ms** |
| PWA offline API | 341 ms | 1–2 | **~480–550 ms** | **~350–400 ms** | **~130 ms** |
| Login (Auth API) | 166 ms | 1 (Supabase Auth) | **~250–310 ms** | **~180–210 ms** | **~70–100 ms** |

**Formuła:**

```
TTFB_prod ≈ TTFB_local + N_roundtrips × (RTT_iad1→EU − RTT_fra1→EU)
          ≈ TTFB_local + N × 100 ms   (konserwatywnie)
```

---

### 3.3 Porównanie z celem ETAP 13.7

| Cel | Lokalnie (13.7) | Prod dziś (`iad1`) | Prod po `fra1` |
|-----|-----------------|--------------------|----------------|
| Dashboard < 300 ms | ✅ 271 ms | ❌ ~450+ ms | ✅ ~280–320 ms |
| Sponsorzy < 250 ms | ⚠️ 296 ms | ❌ ~550+ ms | ✅ ~300–360 ms → blisko / poniżej 250 ms z dalszymi optymalizacjami |
| Layout RPC < 120 ms | ✅ 49 ms | ❌ ~150–200 ms (1× cross-region) | ✅ ~60–80 ms |

**Wniosek:** bez zmiany regionu Vercel **cele 13.7 na produkcji nie będą spełnione**, mimo że lokalnie są.

---

## 4. Rekomendacja regionu Vercel (Europa)

### Opcja A — **`fra1` (Frankfurt)** — **rekomendowana**

| Za | Przeciw |
|----|---------|
| Największy hub Vercel w EU | ~10–15 ms dalej od Supabase niż Dublin |
| Niski RTT dla użytkowników w PL/DE/CZ | |
| Standard branżowy dla aplikacji EU + Supabase EU West | |
| Łatwa zmiana w UI Vercel (Functions Region) | |

### Opcja B — **`dub1` (Dublin)**

| Za | Przeciw |
|----|---------|
| **Najbliżej Supabase EU West 1** (minimalny RTT DB) | Mniejszy ekosystem POP niż Frankfurt |
| Idealne dla latency DB-first | Dla użytkowników w PL różnica vs `fra1` zwykle < 10 ms |

### Nie rekomendowane

- **`iad1`** przy Supabase EU — obecny stan, **~100 ms kary / round-trip**.
- **`cdg1` (Paryż)** — OK, ale bez przewagi nad `fra1`/`dub1` dla tego stacku.

### Jak zmienić (bez kodu)

1. [Vercel Dashboard](https://vercel.com) → projekt **pilka**
2. **Settings → Functions → Function Region**
3. Wybierz **Frankfurt, Germany (`fra1`)** *(lub Dublin `dub1`)*
4. **Redeploy** produkcji (nowy deployment)
5. Weryfikacja: `vercel inspect pilka-mu.vercel.app` → trasy `λ` powinny pokazywać `[fra1]` lub `[dub1]`

Opcjonalnie w `vercel.json` (decyzja infra, nie wymagana do analizy):

```json
{
  "regions": ["fra1"]
}
```

---

## 5. Checklist: Production Infrastructure Ready

### A. Regiony i sieć

- [ ] **Zweryfikowano** Supabase Region = **EU West 1 (Ireland)** w dashboardzie
- [ ] **Zmieniono** Vercel Function Region z **`iad1` → `fra1`** (lub `dub1`)
- [ ] **Redeploy** produkcji po zmianie regionu
- [ ] **`vercel inspect`** potwierdza `[fra1]` / `[dub1]` na trasach `λ`
- [ ] Ponowny pomiar TTFB z produkcji (np. `measure:stage136` vs URL prod)

### B. Supabase

- [ ] Wszystkie migracje do **stage137** na produkcji (`db:migrate:stage137`)
- [ ] Auth: Site URL + Redirect URLs = domena produkcyjna
- [ ] Pooler connection string (transaction mode) dla ewentualnych workerów
- [ ] Backup / PITR włączone (Pro)
- [ ] RLS audit: `npm run audit:stage13` → PASS

### C. Vercel — env i bezpieczeństwo

- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
- [ ] `ALLOW_PUBLIC_REGISTRATION=false` na prod
- [ ] `OPENAI_API_KEY` (opcjonalnie) — server-only
- [ ] `PWA_CRON_SECRET` + VAPID keys (jeśli push w prod)
- [ ] Brak `SUPABASE_SERVICE_ROLE_KEY` w runtime Vercel
- [ ] Preview env: osobny Supabase lub branch DB

### D. OpenAI

- [ ] Klucz API w Vercel (Production only)
- [ ] Limity / billing alert w OpenAI dashboard
- [ ] Akceptacja +20–40 ms latencji AI po przeniesieniu Vercel do EU (vs korzyść Supabase)

### E. PWA

- [ ] `manifest.webmanifest` + SW działają na HTTPS prod
- [ ] `/api/pwa/offline-data` < 400 ms TTFB po migracji regionu
- [ ] Cron push dispatch skonfigurowany (Vercel Cron / zewnętrzny) w **EU**
- [ ] `PWA_CRON_SECRET` ustawiony — endpoint nie publiczny

### F. Monitoring

- [ ] Vercel Logs + alert 5xx
- [ ] Supabase → Database → Reports (CPU, connections)
- [ ] Opcjonalnie: Vercel Analytics / Speed Insights, Sentry

### G. Gotowość biznesowa (pilot 1 klub)

- [ ] Login testowych ról (owner, coach, parent)
- [ ] RPC publiczne (`get_public_website_home`) OK
- [ ] TTFB dashboard **< 350 ms** z produkcji EU (cel po `fra1`)
- [ ] Dokumentacja: [`production-checklist.md`](../deployment/production-checklist.md) uzupełniona o region

---

## 6. Kolejność działań przed ETAPEM 14

| Priorytet | Działanie | Effort | Wpływ |
|-----------|-----------|--------|-------|
| **P0** | Vercel Functions → **`fra1`** | ~15 min | **~120–220 ms TTFB** |
| P1 | Potwierdzić migracje Supabase prod (do 13.7) | 1 h | poprawność RPC |
| P1 | Skonfigurować cron PWA push (EU) | 1 h | niezawodność powiadomień |
| P2 | Vercel Speed Insights / Real User Monitoring | 30 min | weryfikacja po migracji |
| P3 | Rozważyć `dub1` zamiast `fra1` jeśli TTFB DB nadal wysoki | 15 min | +10–15 ms vs Frankfurt |

---

## 7. Podsumowanie

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy Vercel = USA, Supabase = EU? | **Tak** — `iad1` + `eu-west-1` |
| Czy to ma sens przed ETAP 14? | **Tak** — większy efekt niż dalsze mikro-optymalizacje kodu |
| Gdzie przenieść Vercel? | **`fra1` (Frankfurt)** — pierwszy wybór; **`dub1` (Dublin)** — alternatywa |
| Ile można zyskać? | **~120–220 ms TTFB** na głównych ekranach (2–3 round-tripy Supabase) |
| Czy trzeba zmieniać Supabase? | **Nie** — zostaje EU West 1 |
| Czy trzeba zmieniać kod? | **Nie** — tylko ustawienia Vercel + redeploy |

**ETAP 13.8 zakończony — analiza infrastruktury, bez zmian w repozytorium.**
