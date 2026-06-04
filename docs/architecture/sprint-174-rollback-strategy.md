# Sprint 17.4 — Rollback Strategy

Moduły objęte `prod-parity-patch.sql`: **Finance**, **Inventory**, **Academy**, **Integrations** (+ suplementy Content/Matches audit).

---

## Ogólne zasady

1. **Przed patchem:** włączyć i zweryfikować Supabase PITR (Point-in-Time Recovery).
2. **Podczas patcha:** transakcja `BEGIN…COMMIT` — błąd przed COMMIT = automatyczny rollback całej sesji.
3. **Po COMMIT:** rollback tylko przez PITR lub ręczne DROP (destrukcyjne, ryzykowne).

---

## Finance (9 tabel)

| Scenariusz | Procedura | Czas | Ryzyko |
|------------|-----------|------|--------|
| **A** Patch nie wykonuje się | Błąd w transakcji → auto ROLLBACK. Diagnoza logu SQL, popraw patch, retry na staging. | 15–30 min | Niskie |
| **B** Patch częściowy (poza transakcją — nie powinno wystąpić) | PITR do timestamp sprzed patcha. | 1–4 h | Średnie |
| **C** Błędy aplikacji po patchu | 1) Sprawdź RPC `get_finance_dashboard_totals` 2) RLS policies 3) Jeśli krytyczne → PITR. Forward-fix preferowany dla drobnych błędów RLS. | 30 min – 4 h | Średnie |

**Manual DROP (ostateczność):** `DROP TABLE finance_* CASCADE` — usuwa dane klubu w module finansów (prod: brak danych dziś).

---

## Inventory (13 tabel)

| Scenariusz | Procedura | Czas | Ryzyko |
|------------|-----------|------|--------|
| **A** Fail before COMMIT | Auto rollback transakcji. | 15–30 min | Niskie |
| **B** Częściowy apply | PITR restore. Duplikaty indeksów/policies — `DROP IF EXISTS` + retry. | 1–4 h | Średnie |
| **C** App errors | Inventory używa triggerów (`refresh_inventory_item_status`). Test `/inventory` routes. Forward-fix triggerów. | 30 min – 4 h | Średnie |

**Uwaga:** Moduł ma 2 pliki audit hardening — patch idempotentny via `IF NOT EXISTS`.

---

## Academy (12 tabel)

| Scenariusz | Procedura | Czas | Ryzyko |
|------------|-----------|------|--------|
| **A** Fail before COMMIT | Auto rollback. | 15–30 min | Niskie |
| **B** Częściowy | PITR. Academy ma cross-FK do `players` — kolejność CREATE TABLE krytyczna (patch zachowuje kolejność migracji). | 1–4 h | Średnie-wysokie |
| **C** App errors | RPC `get_public_home_bundle` używa `academy_groups` — **znany hotfix 410 na prod**. Po patchu zweryfikować RPC. Test `/academy/*`. | 30 min – 4 h | Wysokie dla strony publicznej |

**Kluczowe:** `public_home_bundle_academy_fix` już jest na prod (ręcznie) — patch tworzy tabelę, której brakowało.

---

## Integrations (10 tabel)

| Scenariusz | Procedura | Czas | Ryzyko |
|------------|-----------|------|--------|
| **A** Fail before COMMIT | Auto rollback. | 15–30 min | Niskie |
| **B** Częściowy | PITR. | 1–4 h | Średnie |
| **C** App errors | Test `/integrations/*`, sync-engine queries. League sync **nie zależy** od tych tabel (osobny pipeline). | 30 min – 2 h | Niskie-średnie |

Integrations nie wpływa na działający sync Piorun (90minut/RF).

---

## Scenariusze globalne

### A — Patch nie wykonuje się (całość)

```
1. Przechwyć błąd PostgreSQL (syntax, missing dependency)
2. Potwierdź ROLLBACK (SELECT count(*) FROM finance_income → should fail / not exist)
3. Popraw prod-parity-patch.sql
4. Waliduj na staging
5. Retry w oknie maintenance
```

**Czas:** 30 min – 2 h · **Ryzyko:** Niskie dla prod (zero zmian po rollback)

### B — Patch wykonuje się częściowo

```
1. STOP — nie uruchamiaj aplikacji
2. Porównaj tabele: audit-prod-parity-174.mjs
3. PITR restore do pre-patch timestamp
4. Analiza który moduł failnął
5. Podziel patch per-moduł (4 osobne transakcje) na retry
```

**Czas:** 2–6 h · **Ryzyko:** Średnie

### C — Patch OK, błędy aplikacji

```
1. Identyfikuj route (finance/inventory/academy/integrations)
2. Sprawdź Supabase logs (RLS denial vs missing RPC)
3. Forward-fix SQL (pojedyncza funkcja/policy)
4. PITR tylko jeśli Piorun dashboard globalnie broken
```

**Czas:** 30 min – 4 h · **Ryzyko:** Niskie dla modułów nieużywanych przez Piorun dziś; wyższe jeśli włączą finance/inventory

---

## Wpływ na działający klub Piorun

| Moduł | Dane na prod dziś | Ryzyko regresji |
|-------|-------------------|-----------------|
| Finance | Brak tabel, brak danych | **Niskie** — nowe tabele puste |
| Inventory | Brak tabel | **Niskie** |
| Academy | Brak tabel | **Niskie** — public RPC już patched |
| Integrations | Brak tabel | **Niskie** |
| League/Website/Players | ✅ działają | **Brak wpływu** jeśli patch idempotentny |

**Najbezpieczniejsza strategia:** apply patch w oknie niskiego ruchu + smoke test istniejących modułów **przed** testowaniem nowych.
