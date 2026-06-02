-- Website 4.0 — lokalny copy hero dla klubu demo (idempotent)
UPDATE public.website_settings
SET
  hero_subtitle = 'Od Skrzata do Seniora — jedna rodzina, jeden klub',
  updated_at = timezone('utc', now())
WHERE club_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND (
    hero_subtitle IS NULL
    OR hero_subtitle LIKE 'Oficjalna strona%'
    OR hero_subtitle = 'Oficjalna strona klubu · GLKS Mietków · B Klasa · Dolnośląskie'
  );
