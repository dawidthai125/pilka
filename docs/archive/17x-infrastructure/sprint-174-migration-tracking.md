# Sprint 17.4 — Migration Tracking Recommendation

## Stan obecny (prod)

| Element | Wartość |
|---------|---------|
| Wpisy `schema_migrations` | **2** |
| Ręcznie apply migracji | **~103** |
| Baseline version | nie istnieje w tracking |
| Parity patch version | nie istnieje |

---

## Po osiągnięciu parity — dwie opcje

### Opcja A — Backfill 103 wpisów historycznych

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260531120000', 'foundation'), ...
ON CONFLICT DO NOTHING;
```

| Pro | Contra |
|-----|--------|
| Pełna historia audytowalna | 103 wpisy **bez gwarancji** że SQL był identyczny |
| Supabase CLI „widzi” przeszłość | Mylące — sugeruje apply, którego nie było |
| | Nie obejmuje hotfix 410 (untracked) |

**Verdict:** ❌ **Nie rekomendowane** — fałszywe poczucie bezpieczeństwa.

---

### Opcja B — Reset tracking od baseline (REKOMENDOWANE)

```sql
-- Po prod-parity-patch na prod:

-- 1. Marker baseline (logiczny punkt startowy)
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260704000000', 'fc_os_baseline_173')
ON CONFLICT DO NOTHING;

-- 2. Marker parity patch
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260704100000', 'fc_os_prod_parity_patch_174')
ON CONFLICT DO NOTHING;

-- 3. Opcjonalnie: archiwum legacy (informational tag, nie re-run)
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260531120000', 'legacy_applied_manual_pre_baseline')
ON CONFLICT DO NOTHING;
```

| Pro | Contra |
|-----|--------|
| Uczciwy stan — wiemy co jest tracked | Stare wersje nie w pełnej liście |
| Prosta reguła: nowe migracje od `20260705*` | Wymaga dokumentacji cutover |
| Zgodne z baseline-first model | |

**Verdict:** ✅ **Rekomendowane**

---

## Docelowa struktura (post 17.5)

```
supabase/
  baseline.sql                           # v20260704000000
  prod-parity-patch.sql                  # v20260704100000 (prod only)
  migrations/                            # NEW from 20260705*
    20260705120000_example.sql
  migrations-archive/                    # 105 historical (read-only)
```

### Reguła każdej nowej migracji

```sql
-- na końcu pliku:
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260705120000', 'example')
ON CONFLICT DO NOTHING;
```

### CI (Sprint 17.5+)

```yaml
- apply baseline.sql on ephemeral PG
- apply pending migrations/
- verify schema_migrations count matches files
```

---

## Czy potrzebny backfill 103 wpisów?

**NIE.**

Lepszy reset tracking od baseline + parity patch marker + opcjonalny single `legacy_pre_baseline` tag.

Historyczne pliki pozostają w `migrations-archive/` dla audytu forensics (Sprint 17.2).

---

## Sprint 17.5 scope (propozycja)

1. Apply parity patch on staging → PASS
2. Insert tracking markers (baseline + parity)
3. CI migration smoke test
4. Template for new migrations with tracking insert
5. Optional: prod apply in maintenance window
