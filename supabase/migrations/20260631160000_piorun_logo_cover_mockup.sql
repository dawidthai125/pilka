-- Logo klubu + okładka z importu FB (zamiast monogramu PW i stockowego stadionu)

UPDATE public.website_settings
SET
  logo_path = 'club-media/club-logo.jpg',
  hero_image_path = 'club-media/cover.jpg',
  updated_at = timezone('utc', now())
WHERE club_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- Etykieta FB czytelna w hero (jak w mockupie)
UPDATE public.website_social_integrations
SET
  profile_url = 'https://facebook.com/piorunwawrzenczyce',
  is_enabled = true,
  updated_at = timezone('utc', now())
WHERE club_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND platform = 'facebook';
