# PRODUCTION DEPLOYMENT REPORT

**Football Club OS — Stabilization Sprint 15.10A**  
**Data:** 2026-06-02  
**URL produkcji:** https://pilka-mu.vercel.app  
**Inspektor deploy:** https://vercel.com/dawidthai125s-projects/pilka/CG6TWTjEgaCyVY6oAwtJMdMd4RmY

---

## Commity wdrożone

| Commit | Opis |
|--------|------|
| `99908ce` | Stabilization Sprint 15.10A: UX, wydajność i Coach Day |
| `a6f03dd` | chore: ignore temporary research artifacts (`tmp-*` w `.gitignore`) |

**Deployment ID:** `dpl_CG6TWTjEgaCyVY6oAwtJMdMd4RmY`  
**Status:** ● Ready (production)  
**Alias:** `pilka-mu.vercel.app`

---

## KROK 1 — Finalna weryfikacja (lokalnie)

| Test | Wynik | Uwagi |
|------|-------|-------|
| `npm run typecheck` | ✅ PASS | Brak błędów TS |
| `npm run build` | ✅ PASS | 149 tras |

**Warningi (nie blokują deploy):**
- Lokalnie: `ALLOW_PUBLIC_REGISTRATION is not false` (tylko `.env.local` dev)
- Build: `Using edge runtime on a page currently disables static generation` (znany, ETAP PWA)
- Vercel build: webpack cache serialization warnings (informacyjne)

**Brak błędów blokujących deploy.**

---

## KROK 2 — Git status

```
On branch main — up to date with origin/main
nothing to commit, working tree clean
```

- ✅ Brak nieoczekiwanych zmian
- ✅ Brak `tmp-*` w `git status` (`.gitignore` wdrożony w `a6f03dd`)
- ✅ Brak plików debug w repo

---

## KROK 3 — .gitignore

Wpisy `tmp-*` **już w repo** (`a6f03dd`) — osobny commit wykonany wcześniej, push OK.

---

## KROK 4 — Vercel ENV (Production)

Sprawdzone: `vercel env ls production`

| Zmienna | Status |
|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ obecna |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ obecna |
| `NEXT_PUBLIC_SITE_URL` | ✅ obecna |
| `ALLOW_PUBLIC_REGISTRATION` | ✅ obecna |
| `OPENAI_API_KEY` | ✅ obecna |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ obecna |
| `PWA_CRON_SECRET` | ❌ brak |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ❌ brak |
| `VAPID_PRIVATE_KEY` | ❌ brak |

**Potwierdzenie behawioralne:** `/register` → `307` → `/login?error=registration_disabled` (rejestracja wyłączona na prod ✅).

Wartości env **nie odczytywane** (encrypted) — tylko obecność kluczy.

---

## KROK 5 — Deploy

| Element | Wynik |
|---------|-------|
| Metoda | `vercel deploy --prod --yes` |
| Build Vercel | ✅ PASS (149 tras) |
| Region buildu | `iad1` (log Vercel) — `vercel.json` deklaruje `fra1` dla funkcji |
| Promocja | ✅ `pilka-mu.vercel.app` |

---

## KROK 6 — Post-deploy smoke test

### Testy anonimowe (HTTP)

| Trasa | Wynik |
|-------|-------|
| `/` | 200 |
| `/login` | 200 |
| `/register` | 307 → login (registration_disabled) |
| `/dashboard`, `/attendance`, `/injuries/portal`, `/sponsors/portal`, `/training` | 307 → login (ochrona auth OK) |

### Testy zalogowane (prod, konta `*@piorun.test`)

| Rola | Trasy | HTTP | Uwagi |
|------|-------|------|-------|
| **Właściciel** | `/dashboard` | 200 | ✅ Coach Day w HTML (`Coach Day`, `coach-day`, sekcje trening/mecz) |
| **Trener** | `/dashboard`, `/attendance`, `/communication`, `/injuries/registry` | 200 | ✅ Brak redirect loop |
| **Zawodnik** | `/dashboard`, `/attendance`, `/injuries/portal`, `/equipment/portal` | 200 | ✅ Portal urazów dostępny |
| **Rodzic** | `/dashboard`, `/attendance`, `/injuries/portal`, `/finance/portal` | 200 | ✅ Portal urazów + składki |
| **Sponsor** | `/sponsors/portal`, `/content`, `/communication` | 200 | ✅ Dozwolone trasy OK |
| **Sponsor** | `/training`, `/matches` (bezpośredni URL) | 200 + RSC redirect | ⚠️ Middleware auth-only — strona próbuje przekierować (NEXT_REDIRECT w payload), bottom nav **nie** pokazuje tych linków (fix 15.10A) |

**Match squad:** wymaga konkretnego `matchId` — nie testowano automatycznie; moduł `/attendance/matches/[matchId]` dostępny dla staff po zalogowaniu (audyt 15.10).

**Logowanie:** ✅ wszystkie role — sign-in Supabase PASS na prod.

---

## Znalezione problemy

| # | Severity | Problem | Wpływ |
|---|----------|---------|-------|
| P1 | Średni | Brak `PWA_CRON_SECRET`, VAPID keys na Vercel | Web Push nie działa w prod |
| P2 | Niski | Build region `iad1` vs Supabase EU | Wyższy TTFB transatlantycki |
| P3 | Niski | Sponsor: bezpośredni URL `/training`/`/matches` nadal auth-pass (redirect w RSC, nie middleware RBAC) | Pre-existing; nav fix OK |
| P4 | Info | `production-checklist.md` nieaktualny (migracje do stage116) | Ryzyko operacyjne przy nowym środowisku |

**Brak regresji deployu Sprint 15.10A** w testowanych ścieżkach.

---

## Rekomendacja

### Deploy Sprint 15.10A: ✅ **GO LIVE**

Wdrożenie `99908ce` + `a6f03dd` na https://pilka-mu.vercel.app **zakończone sukcesem**. Zmiany stabilizacyjne (nav RBAC, Coach Day, performance, mobile) są na produkcji.

### Pilot z prawdziwymi użytkownikami: ⚠️ **FIX BEFORE GO LIVE**

Przed otwarciem pilota poza kontami testowymi:

1. Ustawić `PWA_CRON_SECRET` + VAPID + cron push (jeśli wymagane powiadomienia)
2. Potwierdzić migracje DB ETAP → **15.10** na prod Supabase
3. Ręcznie zweryfikować **bottom nav na telefonie** (sponsor, rodzic, zawodnik)
4. Rozważyć region Vercel `fra1`/`dub1` bliżej Supabase EU

---

## Podsumowanie

| Obszar | Status |
|--------|--------|
| Build lokalny | ✅ |
| Git clean | ✅ |
| Deploy Vercel | ✅ |
| Rejestracja publiczna | ✅ wyłączona (prod) |
| Smoke auth (5 ról) | ✅ PASS (18/18 HTTP 200 na kluczowych trasach) |
| Coach Day | ✅ widoczny na prod dashboard (owner) |
| PWA push | ❌ brak env |

**Nie rozpoczęto ETAPU 15.11.**
