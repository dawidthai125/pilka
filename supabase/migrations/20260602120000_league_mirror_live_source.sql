-- Mirror live sync source (90minut + regionalnyfutbol) — do czasu API PZPN/DZPN
INSERT INTO public.league_sources (id, club_id, competition_id, name, adapter, provider_label, is_active, config, last_sync_at)
VALUES (
  'f9023004-0004-4000-8000-000000000004',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'f9022001-0001-4000-8000-000000000001',
  'Mirror live — 90minut + regionalnyfutbol',
  'json',
  'Mirror (mPZPN/ŁNP)',
  TRUE,
  '{
    "ninetyMinutUrl": "http://www.90minut.pl/liga/1/liga14526.html",
    "regionalnyFutbolUrl": "https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,tabela-terminarz.html",
    "sources": [
      "http://www.90minut.pl/liga/1/liga14526.html",
      "https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,tabela-terminarz.html"
    ],
    "ownLeagueName": "GLKS Mietków",
    "ownDisplayName": "Piorun Wawrzeńczyce",
    "cron": "0 6 */3 * *",
    "note": "Tymczasowy kanał do uzyskania credentials competition-api-pro."
  }'::jsonb,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  adapter = EXCLUDED.adapter,
  provider_label = EXCLUDED.provider_label,
  is_active = EXCLUDED.is_active,
  config = EXCLUDED.config;
