# Audyt bezpieczeństwa — ETAP 11.6 (po poprawkach)

**Data:** 2026-06-01  
**Narzędzie:** `npm run audit:security` (`scripts/security-audit.mjs`)  
**Wynik:** ✅ **13/13 checks PASS** · exit 0

---

## Wyniki kontroli

| ID | Obszar | Wynik | Opis |
|----|--------|-------|------|
| C1 | P0 AI cache | ✅ PASS | Cache scoped per `userId` + roles |
| C2 | P0 Public data | ✅ PASS | `coach_notes` usunięte z public SELECT |
| C3 | P0 Migracje | ✅ PASS | Skrypty DB przez pooler Supabase |
| H7 | P1 Rate limit | ✅ PASS | Chat 30/h + raporty 10/h |
| H8 | P1 Auth | ✅ PASS | Rejestracja kontrolowana env |
| H9 | P1 AI context | ✅ PASS | Lazy-load modułów wrażliwych |
| H1–H10 | P1 RLS/SQL | ✅ PASS | Migracje stage116 obecne |
| M8 | P2 Signed URLs | ✅ PASS | Weryfikacja rekordu DB |
| M10 | P2 ENV | ✅ PASS | `.env.example` bez prawdziwego ref |
| M14 | P2 OpenAI | ✅ PASS | `max_tokens` skonfigurowany |
| L4 | P3 CI | ✅ PASS | GitHub Actions workflow |
| SEC | Sekrety | ✅ PASS | Brak SERVICE_ROLE w client/middleware |
| SEC2 | Server | ✅ PASS | Brak hardcoded service role |

---

## Weryfikacja manualna (zalecana przed go-live)

- [ ] `ALLOW_PUBLIC_REGISTRATION=false` na Vercel
- [ ] Pełne migracje ETAP 1–11 + stage115 + stage116 na bazie prod
- [ ] Strona `/` — status 200, brak wycieku `coach_notes`
- [ ] Test ról: trener (team scope), rodzic (tylko dziecko), sponsor (portal)
- [ ] Logowanie + `/register` redirect gdy rejestracja wyłączona

---

## Znane akceptacje (pilot 1 klub)

| Element | Status | Uzasadnienie |
|---------|--------|--------------|
| Middleware bez RBAC per route | Akceptowane | `(dashboard)/layout` + Server Actions |
| `DEFAULT_CLUB_ID` w actions | Akceptowane | Single-tenant pilot — ETAP 14 |
| PII w `profiles_select_club_managers` | Akceptowane | Potrzebne zarządowi klubu |
| Brak retencji `ai_messages` / `sync_logs` | Backlog | Koszt DB w czasie — cron docelowo |

---

## Powtórzenie audytu

```bash
npm run audit:security
npm run typecheck
npm run build
```

Powiązany raport zmian: [`docs/stage-11.6-fixes-report.md`](../stage-11.6-fixes-report.md)
