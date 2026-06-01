# ETAP 15.6 Communication Hub Report

**Data:** 2026-05-31  
**Status:** ✅ ZAUDYTOWANO I HARDENING PASS  
**Raport audytu:** [`docs/audit/stage-156-audit-report.md`](audit/stage-156-audit-report.md)

---

## Werdykt

| Test | Wynik |
|------|--------|
| `npm run audit:stage156` | **10/10 PASS** |
| `npm run audit:stage156-roles` | **17/17 PASS** (1 SKIP: rodzic bez finance) |
| `npm run typecheck` | **PASS** |
| RLS 8 tabel | **PASS** |
| Push scoped | **PASS** (po fix P1/P2) |
| Read receipts | **PASS** |

---

## Naprawione w audycie (P1–P6)

1. Push ogłoszeń — audience per visibility/category/role  
2. Push board chat — tylko zarząd (nie cały klub)  
3. Izolacja drużyn trenera — wymóg `team_id`  
4. RSVP — walidacja `actor_can_respond_coach_message`  
5. Read stats UI — tylko dla managerów  
6. `player_guardians` optional — dynamic EXECUTE  

---

## Setup

```bash
npm run setup:stage156
```

Pełny audyt:

```bash
npm run audit:stage156
npm run audit:stage156-roles
```

---

Szczegóły architektury, matryca ról i wyniki testów: **raport audytu końcowego** (link powyżej).
