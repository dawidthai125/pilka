# Wdrożenie produkcyjne — Football Club OS

Checklist przed uruchomieniem pilota (1 klub — Piorun Wawrzeńczyce).

## 1. Baza Supabase

- [ ] Zastosuj migracje w kolejności ETAP 1 → 11 + stage115 + **stage116** (2 pliki SQL)
- [ ] Szybka ścieżka: `npm run setup:stage1` … `setup:stage11`, potem `npm run setup:stage116`
- [ ] Pojedyncza migracja hardening: `npm run db:migrate:stage116`
- [ ] Weryfikacja bezpieczeństwa: `npm run audit:security`
- [ ] Połączenie DB przez pooler (domyślnie `aws-0-eu-west-1.pooler.supabase.com`) — wymaga `SUPABASE_DB_PASSWORD` w `.env.local`
- [ ] Włącz PITR / backup (Supabase Pro)

## 2. Zmienne środowiskowe (Vercel)

| Zmienna | Wymagana | Uwagi |
|---------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | tak | Build + runtime |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tak | Build + runtime |
| `NEXT_PUBLIC_SITE_URL` | tak | Build (canonical, sitemap) |
| `OPENAI_API_KEY` | opcjonalnie | Bez klucza moduł AI niedostępny |
| `ALLOW_PUBLIC_REGISTRATION` | **false** na prod | Blokuje otwartą rejestrację |
| `SUPABASE_SERVICE_ROLE_KEY` | nie w runtime app | Tylko skrypty setup lokalnie |

## 3. Supabase Auth

- [ ] Redirect URL: `https://<domena>/auth/callback`
- [ ] Site URL w Supabase = `NEXT_PUBLIC_SITE_URL`
- [ ] Preview: osobny projekt Supabase lub branch DB

## 4. Weryfikacja po deploy

```bash
npm run typecheck
npm run build
```

- [ ] Strona publiczna `/` — bez komunikatu awaryjnego
- [ ] RPC `get_public_website_home('piorun-wawrzenczyce')` zwraca dane
- [ ] Logowanie testowych użytkowników (owner, trener, rodzic)
- [ ] `/register` przekierowuje gdy `ALLOW_PUBLIC_REGISTRATION=false`

## 5. Monitoring

- [ ] Vercel Logs / alert 5xx
- [ ] Opcjonalnie: Sentry, Vercel Analytics

## Mapa migracji

```
ETAP 1–7   foundation → trainings
ETAP 8     inventory
ETAP 9     website (+ anon grants w stage116)
ETAP 10    finance
ETAP 11    integrations + academy
ETAP 11.5  stage115 — row-level RLS
ETAP 11.6  stage116 — production hardening
```

Szczegóły poprawek: `docs/stage-11.6-fixes-report.md`
