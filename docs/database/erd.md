# ERD — Fundament

```mermaid
erDiagram
  auth_users ||--|| profiles : "1:1"
  profiles ||--o{ club_memberships : "member of"
  clubs ||--o{ club_memberships : "has members"
  clubs ||--o{ teams : "has teams"
  teams ||--o{ club_memberships : "optional scope"

  auth_users {
    uuid id PK
    text email
  }

  profiles {
    uuid id PK
    text email
    text full_name
    text locale
  }

  clubs {
    uuid id PK
    text slug UK
    text public_name
    text official_name
    text association
    text competition_level
    jsonb settings
  }

  teams {
    uuid id PK
    uuid club_id FK
    text name
    enum category
    text season
    boolean is_active
  }

  club_memberships {
    uuid id PK
    uuid club_id FK
    uuid user_id FK
    enum role
    enum status
    uuid team_id FK
  }
```

## Relacje

- `profiles.id` → `auth.users.id` (CASCADE)
- `club_memberships` → unikalność `(club_id, user_id, role)`
- `teams` → unikalność `(club_id, name, category)`

## Diagram przepływu danych multi-tenant

```mermaid
flowchart LR
  USER[Authenticated User]
  MEM[club_memberships]
  CLUB[clubs]
  TEAM[teams]
  RLS[RLS Policies]

  USER --> MEM
  MEM --> CLUB
  MEM --> TEAM
  CLUB --> RLS
  TEAM --> RLS
  MEM --> RLS
```
