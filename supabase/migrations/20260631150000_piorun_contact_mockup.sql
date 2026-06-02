-- Kontakt zgodny z docelowym mockupem strony klubu

UPDATE public.website_settings
SET
  contact_email = 'piorun@mietkow.pl',
  contact_address = 'Wawrzeńczyce, gm. Mietków',
  updated_at = timezone('utc', now())
WHERE club_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
