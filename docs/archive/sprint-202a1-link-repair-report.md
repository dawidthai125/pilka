# Sprint 20.2A.1 — Documentation Link Repair

**Data:** 2026-06-06  
**Kontekst:** po Sprint 20.2A (`docs/audit/` → `docs/archive/audit/`, sprinty 17x–20.1 → `docs/archive/`).  
**Commit:** nie wykonany (zgodnie z poleceniem).

---

## Cel

Naprawić **aktywne** odwołania do `docs/audit/` i `docs/architecture/sprint-*` (poza aktywnymi `sprint-200a`, `sprint-201a`).  
**Nie** przepisywać `docs/archive/**`.

---

## Before / After

| Metryka | Before (20.2A scan) | After (20.2A.1) |
|---------|---------------------|-----------------|
| Stale `docs/audit/` / `./audit/` w aktywnych docs | **34** wystąpień w 11 plikach | **0** |
| Stale `docs/architecture/sprint-*` w `scripts/` | **19** wystąpień w 12 plikach | **0** |
| Martwe linki względne w aktywnych `.md` (cel istnieje) | **2** (pre-existing) | **0** |
| Ścieżki odczytu w skryptach → plik istnieje | 6× `docs/audit/` fail | **PASS** (0 missing) |
| Historyczne linki w `docs/archive/` | ~30× `docs/audit/`, ~44× `docs/architecture/sprint-*` | **bez zmian** (zamierzone) |

**Walidatory:** `node scripts/validate-doc-links-202a1.mjs` → exit **0** · `node scripts/validate-script-paths-202a1.mjs` → exit **0**

---

## Naprawione pliki (26)

### Dokumentacja

| Plik | Zmiana |
|------|--------|
| `docs/README.md` | `./audit/` → `./archive/audit/` (19 linków w spisie) |
| `docs/ai/README.md` | `docs/audit/*.md` → `docs/archive/audit/*.md` |
| `docs/ai/01-product-overview.md` | piorun-brand / visual-dna → `docs/archive/audit/` |
| `docs/research/pzpn-data-ecosystem.md` | `../audit/` → `../archive/audit/` |
| `docs/stage-11.5-report.md` | `docs/audit/` → `docs/archive/audit/` |
| `docs/stage-11.6-fixes-report.md` | link + ścieżka względna |
| `docs/stage-12-report.md` | link + ścieżka względna |
| `docs/stage-14-report.md` | `../modules/` → `./modules/` (martwy link modułu) |
| `docs/stage-15.5-report.md` | `./audit/` → `./archive/audit/` |
| `docs/stage-15b-report.md` | `audit/` → `archive/audit/` |
| `docs/stage-156-report.md` | `audit/` → `archive/audit/` |
| `docs/architecture/sprint-200a-platform-scale-review.md` | `./sprint-193a-*` → `../archive/19-3-scale/sprint-193a-*` |

### Skrypty — `docs/audit/` → `docs/archive/audit/`

| Skrypt | Uwagi |
|--------|-------|
| `scripts/audit-stage14-security.mjs` | W `package.json`: `audit:stage14` |
| `scripts/audit-stage15a-security.mjs` | `audit:stage15a` |
| `scripts/audit-stage15b-security.mjs` | `audit:stage15b` |
| `scripts/audit-stage155-consolidation.mjs` | `audit:stage155` |
| `scripts/audit-stage155-modules.mjs` | `audit:stage155-modules` |
| `scripts/capture-cover-screenshot.mjs` | domyślny output screenshotów |

### Skrypty — `docs/architecture/sprint-*` → `docs/archive/17x-infrastructure/sprint-*`

| Skrypt | Status |
|--------|--------|
| `scripts/validate-baseline-173.mjs` | **LEGACY** — brak wpisu w `package.json` |
| `scripts/generate-baseline-173.mjs` | **LEGACY** |
| `scripts/emit-classification-md-173.mjs` | **LEGACY** |
| `scripts/audit-runtime-impact-174.mjs` | **LEGACY** |
| `scripts/audit-prod-parity-174.mjs` | **LEGACY** |
| `scripts/generate-prod-parity-patch-174.mjs` | **LEGACY** (komentarz SQL + output JSON) |
| `scripts/prod-inventory-snapshot-176.mjs` | **LEGACY** |
| `scripts/staging-apply-migrations-175.mjs` | **LEGACY** |
| `scripts/staging-create-project-175.mjs` | **LEGACY** |
| `scripts/staging-local-validation-175.mjs` | **LEGACY** |
| `scripts/staging-run-validation-175.mjs` | **LEGACY** |
| `scripts/staging-run-validation-175b.mjs` | **LEGACY** |

> Skrypty LEGACY pozostają w repo (Sprint 17.x infrastruktura). Po 20.2A odczyt/zapis idzie do archiwum; nie są częścią bieżącego CI Platform.

### Nowe narzędzia walidacji (20.2A.1)

| Plik | Rola |
|------|------|
| `scripts/validate-doc-links-202a1.mjs` | skan stale paths w aktywnych docs + scripts |
| `scripts/validate-script-paths-202a1.mjs` | weryfikacja istnienia ścieżek odczytu w skryptach |

---

## Mapowanie ścieżek

| Stara | Nowa |
|-------|------|
| `docs/audit/<file>` | `docs/archive/audit/<file>` |
| `./audit/<file>` (z `docs/`) | `./archive/audit/<file>` |
| `../audit/<file>` (z `docs/research/`) | `../archive/audit/<file>` |
| `docs/architecture/sprint-17*` | `docs/archive/17x-infrastructure/sprint-17*` |
| `docs/architecture/sprint-193a-*` (link z 200a) | `docs/archive/19-3-scale/sprint-193a-*` |

**Aktywne** w `docs/architecture/` (bez zmian): `project-handoff-*`, `AGENTS.md`, `sprint-200a-*`, `sprint-201a-*`.

---

## Historyczne linki w `docs/archive/` (pozostawione)

Łącznie w **123** plikach `.md` archiwum:

| Wzorzec | Liczba wystąpień |
|---------|------------------|
| `docs/audit/` | **30** |
| `docs/architecture/sprint-` | **44** |

Przykłady (nie naprawiane):

- `docs/archive/audit/stage-11.5-architecture-audit.md` — metadane `docs/audit/stage-*`
- `docs/archive/17x-infrastructure/sprint-173-final-report.md` — ścieżki artefaktów sprzed archiwizacji
- `docs/archive/20-2a-documentation-cleanup-report.md` — opis migracji (referencje do starych katalogów)

Kliknięcie tych linków w IDE nadal wskazuje stare lokalizacje — to **akceptowalne** jako dokumentacja historyczna.

---

## Werdykt

| Kryterium | Status |
|-----------|--------|
| 1. Brak martwych linków w aktywnej dokumentacji | **PASS** |
| 2. Brak martwych ścieżek odczytu w aktywnych skryptach | **PASS** |
| 3. Lista historycznych linków w `docs/archive/` | **udokumentowana powyżej** |

---

## Następny krok

Po review: commit 20.2A + 20.2A.1 razem (lub osobno według decyzji operatora).
