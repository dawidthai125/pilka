# Multi-Tenant

## Strategia

System obsługuje wiele klubów w jednej instancji aplikacji. Każdy klub to izolowany tenant.

## Identyfikacja tenanta

| Pole | Opis |
|------|------|
| `clubs.id` | UUID — klucz techniczny |
| `clubs.slug` | Identyfikator URL (np. `piorun-wawrzenczyce`) — **stabilny**, niezależny od nazw |

## Model nazw klubu

| Pole | Przeznaczenie | Przykład |
|------|---------------|----------|
| `public_name` | Branding — UI, nawigacja, komunikacja | Piorun Wawrzeńczyce |
| `official_name` | Licencja, protokoły, dokumenty związku | GLKS Mietków |

Pola są niezależne. Po zmianie licencji wystarczy `UPDATE official_name` — bez migracji schematu. Helpery w aplikacji: `src/lib/club/names.ts`.

## Izolacja danych

### Warstwa bazy (RLS)

- Każda tabela biznesowa zawiera `club_id`
- Polityki RLS używają `public.user_club_ids()` i `public.user_has_club_role()`
- Brak dostępu cross-tenant bez roli `platform_admin`

### Warstwa aplikacji

- Server Actions zawsze wymagają `clubId` w kontekście
- Middleware sesji nie wybiera klubu — to robi logika aplikacji (etap 2)
- Kontekst klubu przechowywany w cookie / sesji użytkownika

## Pierwszy klub testowy

Zgodnie z [`FIRST_CLUB.md`](../../FIRST_CLUB.md):

| Pole | Wartość |
|------|---------|
| `slug` | `piorun-wawrzenczyce` |
| `public_name` | Piorun Wawrzeńczyce |
| `official_name` | GLKS Mietków |
| `association` | DZPN |
| `competition_level` | B Klasa |
| `voivodeship` | Dolnośląskie |

Seed SQL dla pierwszego klubu zostanie dodany w etapie 2 (inicjalizacja bazy).

## Skalowanie SaaS (przyszłość)

- Subdomeny: `{slug}.fcos.pl` lub ścieżki: `/club/{slug}`
- Billing per klub
- Panel `platform_admin` do zarządzania tenantami
- Limity planów (użytkownicy, storage, AI tokens)
