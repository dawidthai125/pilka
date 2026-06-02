-- Grafiki mockupowe: podpisy galerii + tekst przypiętego posta

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
BEGIN
  UPDATE public.website_media
  SET caption = CASE slot_key
    WHEN 'gallery-01' THEN 'Akcja meczowa'
    WHEN 'gallery-02' THEN 'Kibice ze smokami'
    WHEN 'gallery-03' THEN 'Celebracja po meczu'
    WHEN 'kids' THEN 'Młodzicy w kręgu'
    ELSE caption
  END,
  updated_at = timezone('utc', now())
  WHERE club_id = v_club_id
    AND (
      (section = 'gallery' AND slot_key IN ('gallery-01', 'gallery-02', 'gallery-03'))
      OR (section = 'academy' AND slot_key = 'kids')
    );

  UPDATE public.website_news
  SET
    excerpt = '💚💛 Przed nami kolejne wyzwanie! Młodzicy w ten weekend rozegrają kolejny mecz ligowy. Trzymajcie kciuki za naszych zawodników! 💪',
    updated_at = timezone('utc', now())
  WHERE club_id = v_club_id
    AND slug = 'przed-nami-kolejne-wyzwanie-mlodzicy';

  UPDATE public.website_news
  SET
    excerpt = 'Sobotni mecz za nami! 💚💛 Dziękujemy kibicom za wsparcie! 👏',
    updated_at = timezone('utc', now())
  WHERE club_id = v_club_id
    AND slug = 'zapowiedz-trampkarze-gwarek-walbrzych';
END $$;
