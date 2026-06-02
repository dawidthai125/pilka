# PILOT READINESS REPORT

**Football Club OS — Release 15.10A (Stabilization Sprint)**  
**Klub pilotażowy:** Piorun Wawrzeńczyce  
**Data:** 2026-06-02  
**Produkcja:** https://pilka-mu.vercel.app  
**Commity release:** `99908ce` (Sprint 15.10A) · `a6f03dd` (gitignore tmp-*)

---

## 1. Repo Status

| Check | Wynik |
|-------|-------|
| `git status` | Po commicie raportów: **clean** |
| Branch | `main` = `origin/main` |
| Niecommitowane zmiany kodu | **Brak** |
| Pliki `tmp-*` | Ignorowane (`.gitignore`) |
| Pliki debug | **Brak** |

**HEAD przed raportami audytu:** `a6f03dd`

---

## 2. Build Status

| Test | Wynik | Uwagi |
|------|-------|-------|
| `npm run typecheck` | ✅ PASS | Brak błędów TS |
| `npm run build` | ✅ PASS | 149 tras |

Warningi nieblokujące:
- Lokalne `ALLOW_PUBLIC_REGISTRATION` (dev `.env.local`)
- Edge runtime na `/api/pwa/offline-data`

**Brak błędów blokujących deploy ani pilota.**

---

## 3. Deployment Status

| Element | Wartość |
|---------|---------|
| Deployment ID | `dpl_CG6TWTjEgaCyVY6oAwtJMdMd4RmY` |
| Status | ● **READY** |
| Target | production |
| Alias | https://pilka-mu.vercel.app |
| Region funkcji | `fra1` (Vercel inspect) |
| Zawartość | Sprint 15.10A (`99908ce`) + gitignore (`a6f03dd`) |

---

## 4. Smoke Tests

**Środowisko:** https://pilka-mu.vercel.app  
**Metoda:** logowanie Supabase (`*@piorun.test` / `Piorun2026!`) + HTTP 200 na kluczowych trasach

| Rola | Scenariusz | Wynik |
|------|------------|-------|
| **Właściciel** | logowanie, `/dashboard`, Coach Day | ✅ PASS |
| **Trener** | logowanie, `/attendance`, `/communication`, `/injuries/registry` | ✅ PASS |
| **Zawodnik** | logowanie, `/dashboard`, `/attendance`, `/injuries/portal` | ✅ PASS |
| **Rodzic** | logowanie, `/finance/portal`, `/attendance`, `/injuries/portal` | ✅ PASS |
| **Sponsor** | logowanie, `/sponsors/portal`, `/content`, `/communication` | ✅ PASS |

**Dodatkowo (anonimowo):**
- `/register` → przekierowanie `registration_disabled` ✅
- Chronione trasy → redirect na `/login` ✅

**Wynik zbiorczy:** 0 failed / 18 checked

---

## 5. Known Issues

| # | Issue | Blokuje pilot? |
|---|-------|----------------|
| K1 | Brak `PWA_CRON_SECRET`, VAPID keys na Vercel | ❌ Nie — push opcjonalny w pilocie |
| K2 | Sponsor: bezpośredni URL `/training`/`/matches` (middleware auth-only) | ❌ Nie — bottom nav naprawiony; pilot używa menu |
| K3 | `production-checklist.md` nieaktualny (migracje do 15.10) | ⚠️ Operacyjnie — potwierdzić migracje na prod DB przed skalowaniem |
| K4 | Brak Sentry / monitoringu | ❌ Nie — zalecane przed pełnym go-live |

---

## 6. Pilot Recommendation

### Scenariusz pilota: 1 trener + 1 zawodnik + 1 rodzic

| Wymaganie | Status |
|-----------|--------|
| Logowanie kont klubowych | ✅ |
| Frekwencja / dostępność | ✅ |
| Komunikacja (trener) | ✅ |
| Portal urazów (zawodnik, rodzic) | ✅ |
| Portal rodzica (składki) | ✅ |
| Coach Day (trener/właściciel) | ✅ wdrożony |
| Rejestracja publiczna wyłączona | ✅ na prod |

**Blokery dla zamkniętego pilota (3 osoby):** **brak**

Zalecenia przed startem (nie blokujące):
1. Przekazać uczestnikom URL prod + dane logowania (lub utworzyć konta klubowe)
2. Krótka sesja onboarding (5 min): dashboard, frekwencja, portal urazów
3. Kanał feedback (np. formularz / grupa) na czas 1–2 tygodni pilota
4. Opcjonalnie: ręczny test bottom nav na telefonie (Android/iPhone)

Szczegóły deploy: [`production-deployment-report.md`](./production-deployment-report.md)

---

## Werdykt

✅ **PILOT READY**

---

*Nie rozpoczęto ETAPU 15.11. Zakres: ocena gotowości do zamkniętych testów w Piorun Wawrzeńczyce.*
