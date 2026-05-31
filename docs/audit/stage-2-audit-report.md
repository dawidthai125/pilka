# Raport audytu — ETAP 2 (moduł zawodników)

**Data:** 2026-05-31  
**Zakres:** moduł zawodników, dokumenty, Storage, RLS, UI  
**Status po audycie:** poprawki wdrożone

---

## Podsumowanie

| Obszar | Ocena przed | Ocena po | Naprawione |
|--------|-------------|----------|------------|
| Bezpieczeństwo danych | ⚠️ Średnie | ✅ Dobre | 8 |
| Polityki RLS | ⚠️ Średnie | ✅ Dobre | 5 |
| Wydajność zapytań | ⚠️ Średnie | ✅ Dobre | 4 |
| Relacje bazy danych | ⚠️ Średnie | ✅ Dobre | 4 |
| Obsługa błędów | ⚠️ Średnie | ✅ Dobre | 6 |
| TypeScript | ✅ Dobre | ✅ Dobre | 1 |
| Mobile / responsywność | ⚠️ Średnie | ✅ Dobre | 3 |
| Upload Storage | ⚠️ Średnie | ✅ Dobre | 5 |

**Weryfikacja:** `npm run typecheck` — ✅ | migracja audytu — ✅

---

## 1. Bezpieczeństwo danych zawodników

### Naprawione

| # | Problem | Severity | Rozwiązanie |
|---|---------|----------|-------------|
| 1 | IDOR w `getDocumentSignedUrl` — dowolna ścieżka Storage | **Krytyczne** | Walidacja `isClubPlayerAssetPath()` + weryfikacja rekordu w `player_documents` / `players.photo_url` |
| 2 | Brak walidacji MIME i rozmiaru pliku po stronie serwera | Wysokie | `src/lib/players/uploads.ts` — whitelist MIME, limit 10 MB |
| 3 | Path traversal w nazwie pliku (`../`) | Wysokie | `sanitizeStorageFileName()` przed zapisem ścieżki |
| 4 | Rozszerzenie zdjęcia z `file.type` (spoofing) | Średnie | `photoExtensionForMime()` — tylko dozwolone typy |
| 5 | Brak weryfikacji `playerId` przed mutacjami | Średnie | `verifyPlayerInClub()` we wszystkich akcjach |
| 6 | Przypisanie drużyny z innego klubu | Wysokie | `verifyTeamInClub()` + trigger DB `enforce_player_team_club_consistency` |
| 7 | Niespójność `club_id` / `player_id` w tabelach podrzędnych | Wysokie | Trigger `enforce_player_child_club_consistency` na 5 tabelach |
| 8 | Storage bez walidacji struktury ścieżki | Średnie | Funkcja `storage_is_club_player_asset_path()` w politykach Storage |

### Pozostaje (świadome, bez zmian scope)

| Problem | Rekomendacja |
|---------|--------------|
| Rola `player`/`parent` widzi wszystkich zawodników klubu | W przyszłości: scope do drużyny / powiązania rodzic↔zawodnik |
| Brak szyfrowania at-rest poza Supabase | Po stronie infrastruktury Supabase |

---

## 2. Polityki RLS

### Stan po audycie

| Tabela | SELECT | INSERT/UPDATE/DELETE |
|--------|--------|----------------------|
| `players` | `actor_can_read_players` + `user_club_ids` | `actor_can_manage_players` |
| `player_documents` | j.w. | j.w. + trigger spójności |
| `player_stats` | j.w. | j.w. |
| `player_club_history` | j.w. | j.w. |
| `player_injuries` | j.w. | j.w. |
| `player_coach_notes` | **`actor_is_coaching_staff`** | j.w. |
| `storage.objects` (`club-assets`) | `actor_can_read_players` + walidacja ścieżki | `actor_can_manage_players` + walidacja ścieżki |

### Naprawione

- Polityki Storage rozszerzone o `storage_is_club_player_asset_path()`
- Triggery DB jako druga linia obrony (poza RLS aplikacji)
- Notatki trenerskie — bez zmian (poprawnie ograniczone do sztabu)

---

## 3. Wydajność zapytań

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | Dashboard ładował pełną listę 25+ zawodników tylko dla licznika | `getPlayerCounts()` — `count` head-only |
| 2 | `getDocumentAlerts` pobierał wszystkie dokumenty z datą ważności | Filtr SQL `expires_at <= today + 30 dni` |
| 3 | `getPlayerDetail` wywoływał `getPlayer()` + 5 zapytań (duplikat) | Jedna runda `Promise.all` (7 zapytań równoległych) |
| 4 | `loadTeamNameMap` bez cache w ramach requestu | `loadTeamNameMapCached` z `React.cache()` |

Dodatkowo: selektywne kolumny zamiast `select("*")` w profilu zawodnika.

---

## 4. Poprawność relacji bazy danych

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | `UNIQUE (club_id, team_id, jersey_number)` — NULL team_id omija unikalność | Indeks częściowy `WHERE team_id IS NOT NULL AND jersey_number IS NOT NULL` |
| 2 | Brak FK logicznego team → club | Trigger `enforce_player_team_club_consistency` |
| 3 | Brak spójności player_id ↔ club_id w dokumentach/stats/historii | Trigger na tabelach podrzędnych |
| 4 | Migracja | `20260531163000_players_audit_hardening.sql` |

---

## 5. Obsługa błędów

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | Ciche niepowodzenie insertu historii przy tworzeniu zawodnika | Sprawdzenie `historyError` + komunikat |
| 2 | Upload zdjęcia — brak rollback Storage po błędzie UPDATE | `remove([path])` przy błędzie DB |
| 3 | Usuwanie dokumentu — brak obsługi błędu Storage | Sprawdzenie `storageError` |
| 4 | Pobieranie/usuwanie dokumentu w UI bez feedbacku | `actionMessage` w zakładce Dokumenty |
| 5 | `getDocumentAlerts` rzucał wyjątek i psuł dashboard | Zwraca `[]` przy błędzie |
| 6 | Upload dokumentu — brak rollback metadanych (już był) | Bez zmian — OK |

Komunikaty pozostają generyczne (bez ujawniania szczegółów Supabase) — zgodnie z audytem ETAP 1.

---

## 6. TypeScript

- Usunięto nieużywany import `CoachNoteType`
- `parsePlayerFormData` — jawny typ `PlayerFormData`
- `npm run typecheck` — **0 błędów**

---

## 7. Mobile / responsywność

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | Lista zawodników — `md:contents` psuło układ siatki | Przepisany layout mobile/desktop |
| 2 | Select filtru statusu — mały touch target | `h-11` na mobile |
| 3 | Zakładki profilu — niski touch target | `min-h-11` na przyciskach tabów |
| 4 | Link alertu `?tab=documents` nie otwierał zakładki | Prop `initialTab` z server component |

---

## 8. Upload plików (Supabase Storage)

| Element | Status |
|---------|--------|
| Bucket `club-assets` prywatny | ✅ |
| Limit 10 MB (bucket + walidacja serwera) | ✅ |
| Dozwolone MIME (bucket + serwer) | ✅ |
| Ścieżka `{club_id}/players/{player_id}/...` | ✅ |
| Signed URL tylko po weryfikacji rekordu | ✅ |
| Rollback pliku przy błędzie metadanych | ✅ (dokumenty) |
| Rollback pliku przy błędzie photo_url | ✅ (naprawione) |

---

## Pliki zmienione w audycie

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/20260531163000_players_audit_hardening.sql` | Triggery, indeks, Storage |
| `src/lib/players/uploads.ts` | Walidacja uploadów |
| `src/features/players/actions.ts` | Bezpieczeństwo, weryfikacje, rollback |
| `src/lib/auth/session.ts` | Wydajność loaderów |
| `src/app/(dashboard)/dashboard/page.tsx` | `getPlayerCounts` |
| `src/features/players/components/player-detail-view.tsx` | Błędy UI, taby, touch |
| `src/features/players/components/players-list.tsx` | Layout mobile |
| `scripts/setup-stage2.mjs` | Nowa migracja |

---

## Jak zastosować poprawki

```bash
npm run db:migrate:players-audit
# lub pełny ETAP 2:
npm run setup:stage2
```

---

## Test plan po audycie

- [ ] Pobierz dokument jako trener — działa
- [ ] Próba signed URL z obcą ścieżką — odrzucona
- [ ] Upload PDF > 10 MB — komunikat błędu
- [ ] Upload zdjęcia JPG — sukces + rollback przy symulowanym błędzie DB
- [ ] Dashboard — licznik zawodników bez pełnego listingu
- [ ] Alert dokumentu → link otwiera zakładkę Dokumenty
- [ ] Lista zawodników — czytelna na telefonie (< 768px)
- [ ] Rola sponsor — brak dostępu do `/players`

---

## Werdykt

Moduł ETAP 2 po audycie spełnia wymagania bezpieczeństwa dla środowiska testowego klubu. Krytyczna luka IDOR w signed URL została zamknięta. Baza danych ma spójność referencyjną wymuszana triggerami. Wydajność dashboardu i profilu zawodnika poprawiona bez dodawania nowych funkcji biznesowych.
