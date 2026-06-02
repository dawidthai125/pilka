-- Publiczna strona klubu — odczyt włączonych linków social (hero + sidebar)

DROP POLICY IF EXISTS "website_social_public_read" ON public.website_social_integrations;

CREATE POLICY "website_social_public_read" ON public.website_social_integrations
  FOR SELECT TO anon, authenticated
  USING (
    is_enabled = true
    AND public.website_is_public(club_id)
  );
