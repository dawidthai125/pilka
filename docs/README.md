# Dokumentacja — Football Club OS · Dawid Thai Thanh

## Dla agentów AI (START)

**Przeczytaj najpierw:** [`docs/ai/README.md`](./ai/README.md) — kompletna baza wiedzy o produkcie, architekturze, trasach, stronie publicznej, panelu, lidze i zasadach pracy.

Stan bieżący: [`docs/audit/project-handoff-current.md`](./audit/project-handoff-current.md)

## Spis treści

| Sekcja | Opis |
|--------|------|
| [**ai/**](./ai/README.md) | **Dokumentacja dla agentów AI** — produkt, routing, moduły, DB, liga |
| [architecture/](./architecture/overview.md) | Architektura systemu, warstwy, multi-tenant |
| [database/](./database/schema-proposal.md) | Propozycja schematu bazy i migracje |
| [environment/](./environment/setup.md) | Konfiguracja środowiska lokalnego i Vercel |
| [plans/](./plans/implementation-plan.md) | Szczegółowy plan realizacji modułów |
| [audit/](./audit/audit-report.md) | Raport audytu jakości i bezpieczeństwa |
| [audit/stage-11.5-architecture-audit.md](./audit/stage-11.5-architecture-audit.md) | Audyt architektury ETAP 11.5 |
| [stage-11.5-fixes-report.md](./stage-11.5-fixes-report.md) | Raport poprawek ETAP 11.5 |
| [audit/stage-11.6-production-audit.md](./audit/stage-11.6-production-audit.md) | Audyt produkcyjny ETAP 11.6 |
| [stage-11.6-fixes-report.md](./stage-11.6-fixes-report.md) | Raport poprawek ETAP 11.6 (production hardening) |
| [modules/stage-12-pwa.md](./modules/stage-12-pwa.md) | ETAP 12 — architektura PWA |
| [stage-12-report.md](./stage-12-report.md) | Raport ETAP 12 (PWA) |
| [modules/stage-13-ai-manager.md](./modules/stage-13-ai-manager.md) | ETAP 13 — AI Club Manager |
| [stage-13-report.md](./stage-13-report.md) | Raport ETAP 13 (AI Agent) |
| [audit/stage-12-audit.md](./audit/stage-12-audit.md) | Audyt ETAP 12 PWA (post-fix) |
| [audit/stage-13-audit.md](./audit/stage-13-audit.md) | Audyt ETAP 13 AI Club Manager (post-fix) |
| [audit/stage-13.5-performance-audit.md](./audit/stage-13.5-performance-audit.md) | Audyt wydajności ETAP 13.5 (post-fix) |
| [audit/stage-13.6-performance-measurements.md](./audit/stage-13.6-performance-measurements.md) | Pomiar rzeczywistych czasów ETAP 13.6 |
| [audit/stage-13.7-performance-audit.md](./audit/stage-13.7-performance-audit.md) | Optymalizacja TTFB ETAP 13.7 (PRZED/PO) |
| [audit/stage-13.8-production-infrastructure.md](./audit/stage-13.8-production-infrastructure.md) | Infrastruktura produkcyjna ETAP 13.8 (regiony) |
| [audit/stage-13.9-pwa-api-diagnosis.md](./audit/stage-13.9-pwa-api-diagnosis.md) | Diagnoza TTFB `/api/pwa/offline-data` ETAP 13.9 |
| [audit/stage-13.10-pwa-api-optimization.md](./audit/stage-13.10-pwa-api-optimization.md) | Optymalizacja TTFB PWA API ETAP 13.10 (PRZED/PO) |
| [modules/stage-14-video-center.md](./modules/stage-14-video-center.md) | ETAP 14 — Video Center / AI Video Analysis |
| [stage-14-report.md](./stage-14-report.md) | Raport ETAP 14 (Video Center) |
| [audit/stage-14-audit.md](./audit/stage-14-audit.md) | Audyt ETAP 14 Video Center (post-fix) |
| [modules/stage-15a-content-hub.md](./modules/stage-15a-content-hub.md) | ETAP 15A — Content Hub |
| [stage-15a-report.md](./stage-15a-report.md) | Raport ETAP 15A (Content Hub) |
| [audit/stage-15a-audit.md](./audit/stage-15a-audit.md) | Audyt ETAP 15A Content Hub (post-fix) |
| [audit/stage-15.5-consolidation-audit.md](./audit/stage-15.5-consolidation-audit.md) | Konsolidacja ETAP 15.5 (ETAPY 1–15A) |
| [stage-15.5-report.md](./stage-15.5-report.md) | Raport ETAP 15.5 (konsolidacja) |
| [audit/stage-15.5-audit.md](./audit/stage-15.5-audit.md) | Audyt ETAP 15.5 — weryfikacja regresji (post-fix) |
| [audit/stage-15b2-league-data-research.md](./audit/stage-15b2-league-data-research.md) | ETAP 15B.2 — research automatycznego pobierania danych ligowych |
| [audit/stage-15b2a-club-president-access-architecture.md](./audit/stage-15b2a-club-president-access-architecture.md) | ETAP 15B.2A — dostęp prezesa: kluby24 / Extranet / mPZPN (architektura) |
| [modules/stage-156-communication-hub.md](./modules/stage-156-communication-hub.md) | ETAP 15.6 — Communication Hub |
| [stage-156-report.md](./stage-156-report.md) | Raport ETAP 15.6 Communication Hub |
| [audit/stage-156-audit-report.md](./audit/stage-156-audit-report.md) | Audyt końcowy ETAP 15.6 (RLS, role, push) |
| [research/pzpn-data-ecosystem.md](./research/pzpn-data-ecosystem.md) | Ekosystem danych PZPN/DZPN — mPZPN, API, mirror, integracja |
| [audit/stage-11.6-security-audit-post-fix.md](./audit/stage-11.6-security-audit-post-fix.md) | Audyt bezpieczeństwa po poprawkach 11.6 |
| [deployment/production-checklist.md](./deployment/production-checklist.md) | Checklist wdrożenia produkcyjnego |
| [modules/](./modules/README.md) | Dokumentacja modułów (tworzona etapami) |

## Pierwszy klub testowy

Konfiguracja instancji testowej: [`FIRST_CLUB.md`](../FIRST_CLUB.md) w katalogu głównym.
