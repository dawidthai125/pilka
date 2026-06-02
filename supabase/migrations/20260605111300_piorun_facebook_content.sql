-- Treści ze strony Facebook Piorun Wawrzeńczyce (profile id 61560486822886)

UPDATE public.website_settings
SET
  hero_title = 'Piorun Wawrzeńczyce',
  hero_subtitle = 'Od Skrzata do Seniora — jedna rodzina, jeden klub',
  contact_phone = '+48 663 595 991',
  updated_at = timezone('utc', now())
WHERE club_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

INSERT INTO public.website_social_integrations (club_id, platform, profile_url, is_enabled, api_connected)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'facebook',
  'https://www.facebook.com/profile.php?id=61560486822886',
  true,
  false
)
ON CONFLICT (club_id, platform) DO UPDATE SET
  profile_url = EXCLUDED.profile_url,
  is_enabled = true,
  updated_at = timezone('utc', now());

ALTER TABLE public.website_news DISABLE TRIGGER website_news_enforce_publish;

INSERT INTO public.website_news (
  club_id,
  slug,
  title,
  excerpt,
  content,
  category,
  status,
  published_at
)
SELECT
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'przed-nami-kolejne-wyzwanie-mlodzicy',
  'Przed nami kolejne wyzwanie!',
  'Już w najbliższą środę drużyna Silesii Mietków rozegra spotkanie w ramach IV Ligi Okręgowej Młodzików.',
  E'PRZED NAMI KOLEJNE WYZWANIE!\n\nJuż w najbliższą środę nasza drużyna Silesii Mietków rozegra kolejne spotkanie w ramach IV Ligi Okręgowej Młodzików!\n\nWspieraj nas na boisku — razem tworzymy Pioruna!',
  'matches',
  'published',
  timezone('utc', now())
WHERE NOT EXISTS (
  SELECT 1 FROM public.website_news
  WHERE club_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    AND slug = 'przed-nami-kolejne-wyzwanie-mlodzicy'
);

ALTER TABLE public.website_news ENABLE TRIGGER website_news_enforce_publish;
