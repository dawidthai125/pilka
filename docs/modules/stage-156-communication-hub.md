# ETAP 15.6 — Communication Hub

Centralny moduł komunikacji klubowej — zastępuje Messenger/WhatsApp/SMS/grupy FB w ramach FC OS.

## Zakres

| Sekcja | Status |
|--------|--------|
| Ogłoszenia klubowe (CRUD, kategorie, priorytet, widoczność) | ✅ |
| Potwierdzenie odczytu (announcement_reads) | ✅ |
| Komunikaty trenera + RSVP obecności | ✅ |
| Czaty drużynowe / zarządu / sponsorów | ✅ |
| Push PWA (notification_queue + club_notifications) | ✅ |
| AI Assistant (szkic, bez auto-wysyłki) | ✅ |
| Filtry (team, priority, read status) | ✅ |
| RBAC + RLS | ✅ |

## Trasy

- `/communication` — dashboard
- `/communication/announcements` — ogłoszenia
- `/communication/coach` — komunikaty trenera
- `/communication/chats` — lista czatów
- `/communication/chats/[id]` — wątek
- `/communication/ai` — generator AI

## Setup

```bash
npm run setup:stage156
```

Migracje: `20260619120000_stage156_communication_hub.sql`, seed, audit hardening.

## Tabele

- `announcements`, `announcement_reads`
- `coach_messages`, `coach_message_responses` *(RSVP — rozszerzenie sekcji 4)*
- `team_chats`, `chat_messages`, `chat_attachments`
- `notification_events`

Powiązane: [stage-156-report.md](../stage-156-report.md)
