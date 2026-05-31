-- Seed: Piorun Wawrzeńczyce + drużyna Seniorzy
-- Fixed UUIDs for deterministic setup scripts

INSERT INTO public.clubs (
  id,
  slug,
  public_name,
  official_name,
  association,
  competition_level,
  country,
  voivodeship,
  status
)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'piorun-wawrzenczyce',
  'Piorun Wawrzeńczyce',
  'GLKS Mietków',
  'DZPN',
  'B Klasa',
  'PL',
  'Dolnośląskie',
  'active'
)
ON CONFLICT (slug) DO UPDATE SET
  public_name = EXCLUDED.public_name,
  official_name = EXCLUDED.official_name,
  association = EXCLUDED.association,
  competition_level = EXCLUDED.competition_level,
  voivodeship = EXCLUDED.voivodeship,
  updated_at = timezone('utc', now());

INSERT INTO public.teams (
  id,
  club_id,
  name,
  category,
  season,
  is_active
)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Seniorzy',
  'seniors',
  '2025/2026',
  TRUE
)
ON CONFLICT (club_id, name, category) DO UPDATE SET
  season = EXCLUDED.season,
  is_active = EXCLUDED.is_active,
  updated_at = timezone('utc', now());
