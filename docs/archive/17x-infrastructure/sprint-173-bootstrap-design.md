# FC OS Bootstrap Club — Design

Sprint 17.3 · `scripts/bootstrap-club.mjs`

## Prerequisites

```
Empty Supabase project
  └── supabase/baseline.sql applied
  └── .env.local configured
```

## Flow

```mermaid
sequenceDiagram
  participant CLI as bootstrap-club.mjs
  participant DB as PostgreSQL
  participant Auth as Supabase Auth

  CLI->>DB: INSERT clubs (random UUID)
  CLI->>DB: INSERT teams (seniors)
  CLI->>DB: INSERT website_settings
  CLI->>DB: INSERT content_channels
  CLI->>DB: INSERT league_season / competition / source
  CLI->>DB: INSERT availability_reasons
  alt profile exists
    CLI->>DB: INSERT club_memberships (owner)
  else no profile
    CLI->>Auth: inviteUserByEmail
    CLI->>DB: INSERT club_memberships (invited)
  end
```

## vs setup-stage1.mjs

| Aspekt | setup-stage1 | bootstrap-club |
|--------|--------------|----------------|
| Club UUID | Hardcoded Piorun | `gen_random_uuid()` |
| Migracje | All 105 files | Wymaga prior baseline |
| Test users | 8 fixed emails | Tylko owner |
| League config | Seed Piorun/GLKS | Empty inactive source |
| Multi-club | ❌ | ✅ |

## League config (manual after bootstrap)

`league_sources.config` example structure (not inserted by bootstrap):

```json
{
  "sources": ["90minut.pl/ligaXXXXX", "regionalnyfutbol.pl/..."],
  "ownLeagueName": "Team Official Name",
  "ownDisplayName": "Public Display Name"
}
```

Enable sync: set `is_active = true`, then `npm run sync:league-live`.
