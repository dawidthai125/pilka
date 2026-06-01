# ETAP 15A — Content Hub

**Moduł:** centralny system publikacji treści Football Club OS  
**Trasa:** `/content`  
**Migracje:** `20260617120000_stage15a_content_hub.sql`, `20260617121000_seed_stage15a_content.sql`

---

## Architektura

```
/content/*  →  features/content (actions, UI)
              →  lib/content (loaders, generator, publish)
              →  Supabase (content_* tables + RLS)
              →  ETAP 9 website_news (publikacja strony)
              →  ETAP 14 videos/reports (AI video posts)
              →  ETAP 13 AI Agent (generateContentPost)
```

### Tabele

| Tabela | Rola |
|--------|------|
| `content_posts` | Główny materiał (typ, status, treść strony) |
| `content_channel_variants` | Wersje: website, Facebook, Instagram, sponsor, komunikat |
| `content_channels` | Konfiguracja kanałów klubu |
| `content_approvals` | Audyt zatwierdzeń |
| `content_calendar` | Harmonogram publikacji |
| `content_assets` | Biblioteka mediów |
| `content_ai_generations` | Log generacji AI |

### Typy treści

Aktualność, relacja/zapowiedź meczu, podsumowanie kolejki, post sponsorski, jubileusz, komunikat klubowy, galeria, raport AI.

### Statusy workflow

`s draft` → `pending_approval` → `approved` → `published` | `rejected`

Publikacja wymaga roli z `content:publish` (owner, president, website_admin).

---

## AI Content Generator

- Panel `/content/ai` — polecenia naturalne (PL)
- Generuje 3 warianty: strona, Facebook, Instagram
- Integracja z meczami (`match_id`) i Video Center (`video_id`, raporty)
- Fallback szablonowy bez OpenAI
- Log w `content_ai_generations`

---

## Integracje

| Moduł | Sposób |
|-------|--------|
| ETAP 9 Strona | `publishContentPostAction` → `website_news` |
| ETAP 14 Video | `video_id`, `video_report_id`, klipy w `content_assets` |
| ETAP 13 Agent | `getContentPosts`, `generateContentPost`, `proposeContentPublication` |

Social (Facebook/Instagram): **draft + kolejka + zatwierdzenie** — bez auto-publikacji w 15A.

---

## Uprawnienia

| Rola | Dostęp |
|------|--------|
| Owner, Prezes | Pełny (`content:*`) |
| website_admin (media) | Pełny |
| Trener | Szkice + wysyłka do akceptacji |
| Sponsor | Własne materiały (RLS) |
| Zawodnik, Rodzic | Brak |

---

## Uruchomienie

```bash
npm run setup:stage15a
npm run typecheck
npm run build
```

Powiązany raport: [stage-15a-report.md](../stage-15a-report.md)
