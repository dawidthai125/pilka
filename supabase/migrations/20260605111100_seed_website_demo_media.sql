-- Demo media slots (greenfield-safe: after academy teams @ 20260605101000 + media system @ 20260605111000)
-- Idempotent upserts — no DELETE; preserves storage_path / custom uploads.

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_team RECORD;
  v_news RECORD;
  v_sort INT;
BEGIN
  INSERT INTO public.website_media (club_id, section, slot_key, demo_asset_key, caption, sort_order)
  VALUES
    (v_club_id, 'hero', 'team', 'hero-team', 'Drużyna na boisku', 1),
    (v_club_id, 'hero', 'match', 'hero-match', 'Emocje meczowe', 2),
    (v_club_id, 'hero', 'stadium', 'hero-stadium', 'Stadion klubowy', 3)
  ON CONFLICT (club_id, slot_key) WHERE (section = 'hero')
  DO UPDATE SET
    demo_asset_key = CASE
      WHEN website_media.storage_path IS NULL THEN EXCLUDED.demo_asset_key
      ELSE website_media.demo_asset_key
    END,
    caption = EXCLUDED.caption,
    sort_order = EXCLUDED.sort_order,
    updated_at = timezone('utc', now());

  INSERT INTO public.website_media (club_id, section, slot_key, demo_asset_key, caption, sort_order)
  VALUES
    (v_club_id, 'academy', 'training', 'academy-training', 'Trening akademii', 1),
    (v_club_id, 'academy', 'kids', 'academy-kids', 'Młodzi piłkarze', 2),
    (v_club_id, 'academy', 'path', 'academy-path', 'Ścieżka rozwoju', 3)
  ON CONFLICT (club_id, slot_key) WHERE (section = 'academy')
  DO UPDATE SET
    demo_asset_key = CASE
      WHEN website_media.storage_path IS NULL THEN EXCLUDED.demo_asset_key
      ELSE website_media.demo_asset_key
    END,
    caption = EXCLUDED.caption,
    sort_order = EXCLUDED.sort_order,
    updated_at = timezone('utc', now());

  FOR v_team IN
    SELECT id, category FROM public.teams WHERE club_id = v_club_id AND is_active = TRUE
  LOOP
    INSERT INTO public.website_media (club_id, section, slot_key, team_id, demo_asset_key, caption, sort_order)
    VALUES (
      v_club_id,
      'team',
      v_team.id::TEXT,
      v_team.id,
      CASE v_team.category
        WHEN 'seniors' THEN 'team-seniors'
        WHEN 'u18' THEN 'team-u18'
        WHEN 'u12' THEN 'team-u12'
        ELSE 'team-youth'
      END,
      'Zdjęcie drużyny',
      0
    )
    ON CONFLICT (club_id, team_id) WHERE (section = 'team')
    DO UPDATE SET
      slot_key = EXCLUDED.slot_key,
      demo_asset_key = CASE
        WHEN website_media.storage_path IS NULL THEN EXCLUDED.demo_asset_key
        ELSE website_media.demo_asset_key
      END,
      caption = EXCLUDED.caption,
      updated_at = timezone('utc', now());
  END LOOP;

  FOR v_sort IN 1..8 LOOP
    INSERT INTO public.website_media (club_id, section, slot_key, demo_asset_key, caption, sort_order)
    VALUES (
      v_club_id,
      'gallery',
      'gallery-' || LPAD(v_sort::TEXT, 2, '0'),
      'gallery-' || LPAD(v_sort::TEXT, 2, '0'),
      CASE v_sort
        WHEN 1 THEN 'Mecz domowy'
        WHEN 2 THEN 'Radost po golu'
        WHEN 3 THEN 'Kibice na trybunach'
        WHEN 4 THEN 'Ćwiczenia taktyczne'
        WHEN 5 THEN 'Trening zimowy'
        WHEN 6 THEN 'Życie klubu'
        WHEN 7 THEN 'Turniej społeczny'
        ELSE 'Finał turnieju'
      END,
      v_sort
    )
    ON CONFLICT (club_id, slot_key) WHERE (section = 'gallery')
    DO UPDATE SET
      demo_asset_key = CASE
        WHEN website_media.storage_path IS NULL THEN EXCLUDED.demo_asset_key
        ELSE website_media.demo_asset_key
      END,
      caption = EXCLUDED.caption,
      sort_order = EXCLUDED.sort_order,
      updated_at = timezone('utc', now());
  END LOOP;

  FOR v_news IN
    SELECT id, category FROM public.website_news
    WHERE club_id = v_club_id AND status = 'published'
    ORDER BY published_at DESC NULLS LAST
    LIMIT 6
  LOOP
    INSERT INTO public.website_media (club_id, section, slot_key, news_id, demo_asset_key, caption, sort_order)
    VALUES (
      v_club_id,
      'news',
      v_news.id::TEXT,
      v_news.id,
      CASE v_news.category
        WHEN 'matches' THEN 'news-matches'
        WHEN 'academy' THEN 'news-academy'
        WHEN 'transfers' THEN 'news-transfers'
        WHEN 'sponsors' THEN 'news-sponsors'
        ELSE 'news-club'
      END,
      'Zdjęcie wyróżniające',
      0
    )
    ON CONFLICT (club_id, news_id) WHERE (section = 'news')
    DO UPDATE SET
      slot_key = EXCLUDED.slot_key,
      demo_asset_key = CASE
        WHEN website_media.storage_path IS NULL THEN EXCLUDED.demo_asset_key
        ELSE website_media.demo_asset_key
      END,
      caption = EXCLUDED.caption,
      updated_at = timezone('utc', now());
  END LOOP;
END $$;
