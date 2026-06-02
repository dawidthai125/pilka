-- Nowy herb Pioruna (tarcza + okrągły) zamiast starego club-logo.jpg z FB

UPDATE public.website_settings
SET
  logo_path = 'club-media/club-logo-circle.png',
  updated_at = timezone('utc', now())
WHERE club_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
