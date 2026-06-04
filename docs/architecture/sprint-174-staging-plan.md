# Sprint 17.4 — Staging Validation Plan

## Środowisko

```
Nowy Supabase Project (staging-174)
  ├── baseline.sql
  ├── prod-parity-patch.sql   ← test parity path for existing prod
  └── bootstrap-club.mjs
```

Alternatywnie dla pełnego testu prod path:

```
Supabase staging clone (PITR snapshot prod + patch)
  └── prod-parity-patch.sql only
```

---

## Apply sequence

| Step | Command | Expected |
|------|---------|----------|
| 1 | Create Supabase project | Empty DB |
| 2 | `node scripts/run-sql.mjs supabase/baseline.sql` | 148 tables |
| 3 | `node scripts/audit-prod-parity-174.mjs` | missingTables: 0 |
| 4 | `node scripts/bootstrap-club.mjs --slug staging-club ...` | 1 club |
| 5 | Create test user + owner membership | Auth OK |

**Prod parity path (step 2b):**

| Step | Command | Expected |
|------|---------|----------|
| 2b | Clone prod OR apply historical migrations to 104 tables | Simulates prod |
| 3b | `node scripts/run-sql.mjs supabase/prod-parity-patch.sql` | 148 tables |
| 4b | `node scripts/audit-prod-parity-174.mjs` | missingTables: 0 |

---

## Smoke test checklist

### Auth
- [ ] Login owner via magic link / password
- [ ] `club_memberships` resolves tenant context
- [ ] Role-based nav visible per permissions

### Website (public)
- [ ] `/` loads `get_public_home_bundle` RPC
- [ ] `/players` public stats RPC
- [ ] Branding colors from `website_settings`

### Teams & Players
- [ ] `/players` dashboard list
- [ ] Create player (INSERT `players`)
- [ ] Player documents upload (storage)

### League
- [ ] `/league` hub loads
- [ ] `league_sources` config readable
- [ ] `npm run sync:league-live:dry-run` (optional)

### CRM
- [ ] `/crm` contacts list
- [ ] Create contact

### Attendance
- [ ] `/attendance` availability list
- [ ] `availability_reasons` seeded by bootstrap

### Communication
- [ ] `/communication` announcements
- [ ] Team chat load

### Equipment
- [ ] `/equipment` assets list

### Injuries
- [ ] `/injuries` portal
- [ ] `player_injuries` CRUD

### Finance *(post-patch)*
- [ ] `/finance` dashboard loads
- [ ] RPC `get_finance_dashboard_totals`
- [ ] Create income row (empty module)

### Inventory *(post-patch)*
- [ ] `/inventory` dashboard
- [ ] RPC `get_inventory_dashboard_stats`
- [ ] Create category + item

### Academy *(post-patch)*
- [ ] `/academy` hub
- [ ] `/academy/groups` — `academy_groups` query
- [ ] `/academy/development` — `player_development`

### Integrations *(post-patch)*
- [ ] `/integrations` hub
- [ ] `/integrations/sync` — `sync_jobs` list
- [ ] `/integrations/imports` — dry import UI

---

## Automated checks

```bash
node scripts/audit-prod-parity-174.mjs          # missingTables === 0
node scripts/validate-baseline-173.mjs          # piorunRefs === 0
npm run typecheck
npm run build
```

## Pass criteria

| Metric | Target |
|--------|--------|
| missingTables | 0 |
| missingRpc (module) | 0 |
| Build | PASS |
| Piorun smoke routes | PASS (existing modules) |
| New module routes | PASS (finance/inventory/academy/integrations) |

## Estimated time

| Phase | Duration |
|-------|----------|
| Staging setup | 1 h |
| Apply baseline + patch | 30 min |
| Bootstrap + auth | 30 min |
| Manual smoke tests | 2–3 h |
| **Total** | **4–5 h** |
