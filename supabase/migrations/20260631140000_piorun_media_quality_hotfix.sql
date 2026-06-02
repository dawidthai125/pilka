-- Hotfix jakości mediów: cover = ostry baner, logo = monogram do czasu uploadu HD

UPDATE public.website_settings
SET
  hero_image_path = 'club-media/cover.jpg',
  logo_path = NULL,
  updated_at = timezone('utc', now())
WHERE club_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
