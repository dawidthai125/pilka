# First Club Setup Guide

Documentation for setting up the first test club instance in Football Club OS.

## Club Information

### Names
- **Public Name (branding)**: Piorun Wawrzeńczyce — UI, nawigacja, komunikacja
- **Official Name**: GLKS Mietków — licencja, protokoły, związek

Oba pola są niezależne w bazie (`public_name`, `official_name`). Po przejściu licencji wystarczy zaktualizować `official_name` na „Piorun Wawrzeńczyce” — bez migracji schematu ani zmian w kodzie.

### Details
- **Status**: Currently operating as GLKS Mietków due to league license
- **Target Name**: Piorun Wawrzeńczyce (future transition)
- **Association**: DZPN
- **Competition Level**: B Klasa
- **Country**: Polska
- **Voivodeship**: Dolnośląskie

### Teams Structure

#### Current Teams
- Seniorzy (Seniors)

#### Planned Teams
- Trampkarze (U-10)
- Młodziki (U-12)
- Juniorzy (U-18)

### Goals
- Complete digitalization of club management
- Unified system for all teams
- Streamlined operations and data management

## Implementation Status

- [x] Environment setup
- [x] Database initialization (migracje + skrypt setup)
- [x] Auth configuration
- [ ] Storage setup
- [x] Club instance creation
- [x] First team setup (Seniorzy)
- [x] Role-based access implementation
- [x] Moduł zawodników (ETAP 2)
- [x] Documentation completion
