# Sprint 20.2A — Documentation Cleanup & Archive

**Data:** 2026-06-06  
**Typ:** wyłącznie dokumentacja · **bez** zmian kodu / SQL / migracji  
**Commit:** oczekuje na review użytkownika

---

## Cel

Uprościć `docs/architecture/` do aktywnych handoffów Platform bez utraty historii (git mv, R100).

---

## Struktura PRZED / PO

### PRZED

```
docs/
├── architecture/     (~66 plików — sprinty 173–201, overview, rbac, …)
├── audit/            (~100 plików — stage reports, backup handoff, screenshots)
├── ai/               (bez zmian)
├── modules/          (bez zmian)
└── …
```

### PO

```
docs/
├── architecture/          (5 aktywnych plików)
│   ├── AGENTS.md
│   ├── project-handoff-current.md      ← przeniesiony z docs/audit/
│   ├── project-handoff-20.1.md
│   ├── sprint-200a-platform-scale-review.md
│   └── sprint-201a-deploy-recovery-rca.md
│
├── archive/               (164 plików + README)
│   ├── README.md
│   ├── 20-2a-documentation-cleanup-report.md
│   ├── 17x-infrastructure/    (26)
│   ├── 18-early-platform/       (8)
│   ├── 18-5-health/             (5)
│   ├── 18-6-alerts/             (5)
│   ├── 19-0-operations/         (5)
│   ├── 19-2-lifecycle/          (3)
│   ├── 19-3-scale/              (4)
│   ├── 20-1-performance/        (3)
│   ├── general/                 (4)
│   └── audit/                   (100)
│
├── ai/                    (zaktualizowane linki)
└── audit/                 (USUNIĘTY katalog — zawartość w archive/audit/)
```

---

## Pliki pozostawione w `docs/architecture/` (5)

| Plik | Rola |
|------|------|
| `AGENTS.md` | Indeks aktywnej dokumentacji Platform |
| `project-handoff-current.md` | Skrót START HERE |
| `project-handoff-20.1.md` | Pełny handoff 18.5A→20.1 |
| `sprint-200a-platform-scale-review.md` | Audyt skali GO/NO-GO |
| `sprint-201a-deploy-recovery-rca.md` | Reguła P0 client/server |

---

## Przeniesione pliki (podsumowanie)

| Cel archiwum | Liczba | Źródło |
|--------------|--------|--------|
| `17x-infrastructure/` | 26 | `docs/architecture/sprint-17[3-7]*` |
| `18-early-platform/` | 8 | `docs/architecture/sprint-18[0-4]*` |
| `18-5-health/` | 5 | `docs/architecture/sprint-185*` |
| `18-6-alerts/` | 5 | `docs/architecture/sprint-186*` |
| `19-0-operations/` | 5 | `docs/architecture/sprint-190*`, `191*` |
| `19-2-lifecycle/` | 3 | `docs/architecture/sprint-192*` |
| `19-3-scale/` | 4 | `docs/architecture/sprint-193*` |
| `20-1-performance/` | 3 | `docs/architecture/sprint-201a-*` (bez RCA) |
| `general/` | 4 | overview, rbac, multi-tenant, folder-structure |
| `audit/` | 100 | cały `docs/audit/` |
| **Razem** | **163** | + `project-handoff-current` z audit → architecture |

Wszystkie operacje: `git mv` (R100) — historia zachowana.

---

## Wpływ na handoff i AGENTS.md

| Plik | Zmiana |
|------|--------|
| `AGENTS.md` (root) | `project-handoff-current` → `docs/architecture/`; archiwum → `docs/archive/` |
| `docs/architecture/AGENTS.md` | **NOWY** — indeks Platform |
| `docs/architecture/project-handoff-current.md` | Sekcja archiwum; linki `docs/archive/` |
| `docs/architecture/project-handoff-20.1.md` | Linki do `20-1-performance/` w archiwum |
| `docs/ai/README.md` | Ścieżki handoff + archiwum |
| `docs/ai/09-agent-rules.md` | Ścieżka handoff |
| `docs/ai/10-platform-admin-multi-club.md` | Raporty 18.x → `archive/18-early-platform/` |
| `docs/README.md` | Entry point architecture |

**Root `AGENTS.md` pozostaje** w repozytorium (wymagane przez Cursor) — uzupełniony o `docs/architecture/AGENTS.md`.

---

## Walidacja

| Check | Wynik |
|-------|--------|
| `docs/architecture/` = 5 plików | **PASS** |
| Brak usuniętych plików (tylko mv) | **PASS** (git R100) |
| Kod aplikacji nietknięty | **PASS** |
| `docs/audit/` pusty / usunięty | **PASS** |
| Handoff wskazuje archiwum | **PASS** |

---

## Uwagi dla agentów

- Stare linki w **zarchiwizowanych** dokumentach mogą wskazywać `docs/architecture/sprint-*` — używaj `docs/archive/` lub [README.md](./README.md).
- Aktywny punkt wejścia: [`../architecture/project-handoff-current.md`](../architecture/project-handoff-current.md).
