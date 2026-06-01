# Raport ETAP 15.5 — Konsolidacja Football Club OS

**Data:** 2026-05-31  
**Zakres:** ETAPY 1–15A  
**Cel:** Jakość kodu, spójność architektury, eliminacja długu technicznego — **bez nowych funkcji**

Pełny audyt: [stage-15.5-consolidation-audit.md](./audit/stage-15.5-consolidation-audit.md)

---

## Podsumowanie

| Metryka | Wartość |
|---------|---------|
| Nowe pliki współdzielone | 4 (`strings`, `form-data`, `row-helpers`, `stats-grid`) |
| Usunięte pliki martwe | 3 |
| Usunięte eksporty martwe | 6 funkcji |
| Szacunkowo usunięte linie | ~400 |
| Migracje SQL usunięte | 0 (polityka: raport only) |
| Health Score | **7.7/10** |
| `audit:stage155` | 11/11 PASS |

---

## 1. Co zostało uporządkowane

- **Utility:** wspólny slugify, readString, mapper row helpers  
- **UI:** komponent `StatsGrid` dla dashboardów modułowych  
- **PWA/Security:** `/video`, `/content` w SW; `/settings` w middleware  
- **Lint:** czysty ESLint w `src/`, ignore wygenerowanego SW  
- **Martwy kod:** 3 pliki + 6 nieużywanych eksportów  
- **Dokumentacja:** raport konsolidacji + mapa architektury

---

## 2. Usunięte duplikacje

| Duplikat | Rozwiązanie |
|----------|-------------|
| slugifyContentTitle / slugifyNewsTitle | `lib/strings.ts` |
| readString × 6 | `lib/form-data.ts` |
| str/num/optStr × 3 mappery | `lib/mappers/row-helpers.ts` |
| Stats grid JSX × 5 | `components/ui/stats-grid.tsx` |

---

## 3. Nieużywane elementy

**Usunięte:** notification-queue, NotificationsCenter (training), IntegrationsPanel re-export, buildWebsiteAiContext, buildIntegrationsSyncReport, formatImportTypeLabel, buildScoutingAiContext, scoutingPlayerFullName, parsePlayerPosition (academy).

**Pozostawione (celowe):** stub integracji PZPN/DZPN, historyczne migracje SQL, automations.ts skeleton.

---

## 4. Wymagające przebudowy w przyszłości (ETAP 15B+)

- `lib/auth/session.ts` — rozbicie na moduły  
- 3 pipeline publikacji treści → Content Hub jako hub  
- AI report generator — wspólny wrapper  
- Dual RBAC — jeden model uprawnień  
- Squash dokumentacji migracji RBAC

---

## 5. Największe ryzyka

1. Monolit session.ts  
2. Rozbieżność permissions app vs RLS (treasurer AI)  
3. Historyczny szum w migracjach SQL  
4. Brak SQL VIEW — raportowanie tylko przez RPC

---

## 6. Rekomendacje przed ETAP 15B

1. Per-module loaders zamiast session hub  
2. Unified content publication flow  
3. `lib/ai/report-generator.ts`  
4. Permission matrix (app ↔ RLS ↔ middleware)  
5. Health check CI: `audit:stage155` + istniejące audyty modułowe

---

## Weryfikacja

```bash
npm run audit:stage155
npm run typecheck
npm run lint
npm run build
```
