# Sprint 17.7 — Post-Patch Validation Checklist

**Wypełnij po STEP 2 (patch) i STEP 4 (app).**  
Każda pozycja: **PASS** / **FAIL** / **N/A** + notatka.

---

## Database (automated)

Uruchom: `node scripts/audit-prod-parity-174.mjs`

| Check | Pre-patch | Target | PASS/FAIL |
|-------|-----------|--------|-----------|
| Table count | 104 | 148 | |
| Function count | 158 | ~249 | |
| RPC count | 16 | 19 | |
| Enum count | 93 | 129 | |
| Policy count | 244 | ~340 | |
| Trigger count | 156 | ~220 | |
| Bucket count | 2 | 2 | |
| `missingTables` | 44 | **0** | |
| `missingRpc` includes finance/inventory | 3 | **0** | |

### RPC smoke (SQL Editor)

```sql
-- Replace with real Piorun club UUID
SELECT public.get_public_home_bundle('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
SELECT public.get_public_players('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
SELECT public.get_home_dashboard_stats('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
```

| RPC | PASS/FAIL |
|-----|-----------|
| `get_public_home_bundle` | |
| `get_public_players` | |
| `get_home_dashboard_stats` | |
| `get_finance_dashboard_totals` (new) | |
| `get_inventory_dashboard_stats` (new) | |

---

## Application — Dashboard (logged in as owner/coach)

| # | Module | Route | PASS/FAIL | Notes |
|---|--------|-------|-----------|-------|
| 1 | Auth | `/login` → `/dashboard` | | |
| 2 | Website | `/website/settings` | | |
| 3 | Teams | `/teams` | | |
| 4 | Players | `/players` | | |
| 5 | League | `/league` | | |
| 6 | CRM | `/crm` | | |
| 7 | Attendance | `/attendance` | | |
| 8 | Communication | `/communication` | | |
| 9 | Equipment | `/equipment` | | |
| 10 | Injuries | `/injuries` | | |
| 11 | Finance | `/finance` | | Empty state OK |
| 12 | Inventory | `/inventory` | | Empty state OK |
| 13 | Academy | `/academy` | | Empty state OK |
| 14 | Integrations | `/integrations` | | Empty state OK |

---

## Application — Public website (anon)

| Page | URL | PASS/FAIL | Notes |
|------|-----|-----------|-------|
| Homepage | `/` | | |
| News | `/aktualnosci` | | |
| Gallery | `/galeria` | | |
| Sponsors | `/partnerzy` | | |
| Team | `/druzyna` | | |
| Table | `/tabela` | | |
| Matches | `/mecze` | | |

---

## Overall verdict

| Area | Result |
|------|--------|
| Database | PASS / FAIL |
| Application (14 modules) | PASS / FAIL |
| Public website | PASS / FAIL |
| **TOTAL** | **PASS / FAIL** |

**If any FAIL on existing modules (1–10, public):** initiate rollback runbook before declaring success.
