# Raport zmian — ETAP 11.6 (Production Hardening)

**Data:** 2026-06-01  
**Zakres:** P0 → P1 → P2 — stabilizacja, bezpieczeństwo, wydajność, gotowość prod  
**Bez nowych funkcji i modułów**

---

## Podsumowanie wykonawcze

| Priorytet | Status | Test po wdrożeniu |
|-----------|--------|-------------------|
| **P0** (3) | ✅ | `npm run typecheck` |
| **P1** (10) | ✅ | `npm run setup:stage116` |
| **P2** (bezpieczeństwo/wydajność) | ✅ większość | `npm run audit:security` |
| **Weryfikacja końcowa** | ✅ | `typecheck` + `build` + audit |

```bash
npm run setup:stage116    # exit 0 — obie migracje SQL
npm run typecheck           # exit 0
npm run audit:security      # exit 0 — 13/13 checks
npm run build               # exit 0 — 85 tras
```

Checklist prod: [`docs/deployment/production-checklist.md`](./deployment/production-checklist.md)  
Audyt bezpieczeństwa: [`docs/archive/audit/stage-11.6-security-audit-post-fix.md`](./archive/audit/stage-11.6-security-audit-post-fix.md)

---

## P0 — krytyczne

| ID | Problem | Poprawka | Pliki |
|----|---------|----------|-------|
| **C1** | Cache AI współdzielony między użytkownikami | Klucz cache: `(clubId, userId, roles)` + lazy-load modułów | `src/lib/ai/context.ts` |
| **C2** | `coach_notes` na stronie publicznej | Usunięto z `MATCH_PUBLIC_SELECT` | `src/lib/website/public-data.ts` |
| **C3** | Skrypty DB / niespójność migracji | Pooler Supabase, `setup:stage116`, checklist | `scripts/lib/db-client.mjs`, `docs/deployment/` |

---

## P1 — wysokie ryzyko

**Migracja:** `supabase/migrations/20260606120000_stage116_production_hardening.sql`

| ID | Poprawka |
|----|----------|
| H1 | `president` w `actor_can_manage_team_resource` |
| H2 | `player_coach_notes` — scope drużyny (`actor_can_read/manage_player_row`) |
| H3 | Storage write — `actor_can_manage_player_row` |
| H4 | Storage website — guard `website_is_public()` |
| H5 | Trener bez `team_id` — fail closed |
| H6 | Akademia — `actor_can_manage_academy_player` (team-scoped) |
| H7 | Rate limit AI chat 30/h + **raporty 10/h** |
| H8 | `ALLOW_PUBLIC_REGISTRATION=false` na prod |
| H9 | Lazy-load finance/inventory/sponsors/integrations/academy w AI |
| H10 | Anon GRANTs + polityka autorów newsów |

---

## P2 — bezpieczeństwo i wydajność

**Migracja:** `supabase/migrations/20260606140000_stage116_p2_security_completion.sql`

| ID | Status | Poprawka |
|----|--------|----------|
| **M1** | ✅ | `training_availability_select` — rodzic widzi tylko własne wiersze |
| **M2** | ✅ | `actor_can_read_own_inventory` — rodzic + kit dziecka (stage116) |
| **M3** | ✅ | `actor_can_read_integrations` — bez coach |
| **M4** | ✅ | Website social — bez coach |
| **M5** | ✅ | Memberships — coach nie widzi innych użytkowników |
| **M6** | ✅ | Teams CRUD — tylko leadership |
| **M7** | ✅ | Sponsor RPC — walidacja drużyny |
| **M8** | ✅ | Signed URLs — JOIN do rekordu DB |
| **M9** | ✅ | `validate-env.mjs` — ostrzeżenia prod + blokada service_role w NEXT_PUBLIC |
| **M10** | ✅ | `.env.example` — placeholdery |
| **M13** | ✅ | Daty formularzy z serwera (`todayIsoDate()`) — brak hydration drift |
| **M14** | ✅ | `max_tokens: 1024` |
| **L1** | ✅ | `actor_can_read_ai_report` — rozszerzone kategorie |
| **L4** | ✅ | GitHub Actions CI |

**Pozostawione (poza zakresem stabilizacji 1 klub):**

| ID | Powód |
|----|-------|
| M11 | RBAC w middleware — backup przez layout + Server Actions (akceptowane na pilot) |
| M12 | Wymaga pełnego stage115 na prod — checklist migracji |
| M15 | `DEFAULT_CLUB_ID` — ETAP 14 (multi-tenant) |
| L2 | PII managers — zamierzone dla zarządu klubu |
| L3 | ESLint `_prev` — jakość kodu, nie blocker |
| L6–L7 | Email link parent/player, retencja logów — średni termin |

---

## Nowe narzędzia

| Skrypt | Opis |
|--------|------|
| `npm run setup:stage116` | Migracje stage116 + P2 |
| `npm run db:migrate:stage116` | Pojedyncze uruchomienie SQL |
| `npm run audit:security` | Statyczny audyt bezpieczeństwa (13 checks) |

---

## Pliki zmienione (ta iteracja)

### SQL
- `supabase/migrations/20260606140000_stage116_p2_security_completion.sql` **(nowy)**

### Aplikacja
- `src/lib/dates.ts` **(nowy)**
- `src/lib/ai/rate-limit.ts` — rate limit raportów
- `src/features/ai/actions.ts` — rate limit na generate*
- Formularze finance/inventory/sponsors — `defaultDate` z serwera

### DevOps
- `scripts/security-audit.mjs` **(nowy)**
- `scripts/run-sql.mjs` — wiele plików SQL
- `scripts/setup-stage116.mjs` — obie migracje
- `scripts/validate-env.mjs` — NEXT_PUBLIC guard
- `package.json` — `audit:security`

---

## Production Readiness (po poprawkach)

| Obszar | Przed | Po |
|--------|-------|-----|
| Bezpieczeństwo | 7/10 | **9/10** |
| Wydajność | 7/10 | **8/10** |
| AI | 6/10 | **8/10** |
| Gotowość prod (pilot 1 klub) | 7/10 | **9/10** |

**Pilot Piorun Wawrzeńczyce: gotowy do wdrożenia** po migracjach ETAP 1–11 + stage115 + stage116 na prod i ustawieniu `ALLOW_PUBLIC_REGISTRATION=false` na Vercel.

---

*Wygenerowano po ETAP 11.6 — Production Hardening.*
