-- P1 Real Content Sprint — Piorun Wawrzeńczyce
-- Treści i media klubowe (bez zmian layoutu)

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_album_mecze UUID := 'e9010001-0001-4000-8000-000000000001';
  v_album_trening UUID := 'e9010002-0002-4000-8000-000000000002';
  v_album_klub UUID := 'e9010003-0003-4000-8000-000000000003';
  v_album_wydarzenia UUID := 'e9010004-0004-4000-8000-000000000004';
  v_news_mlodzicy UUID;
  v_news_trampkarze UUID;
  v_news_seniorzy UUID;
  v_news_trampkarze2 UUID;
  v_news_akademia UUID;
BEGIN
  -- ── Branding / kontakt ─────────────────────────────────────────────
  UPDATE public.website_settings
  SET
    hero_title = 'Piorun Wawrzeńczyce',
    hero_subtitle = 'Od Skrzata do Seniora — jedna rodzina, jeden klub',
    hero_image_path = 'club-media/cover.jpg',
    logo_path = 'club-media/club-logo.jpg',
    contact_phone = '+48 663 595 991',
    contact_address = 'GLKS Mietków, ul. Bystrzycka, Mietków (Wawrzeńczyce)',
    contact_email = NULL,
    seo_title = 'Piorun Wawrzeńczyce — oficjalna strona klubu piłkarskiego',
    seo_description = 'Aktualności, terminarz, wyniki i akademia klubu Piorun Wawrzeńczyce (GLKS Mietków). Od Skrzata do Seniora — jedna rodzina, jeden klub.',
    updated_at = timezone('utc', now())
  WHERE club_id = v_club_id;

  -- ── Social — tylko Facebook ────────────────────────────────────────
  UPDATE public.website_social_integrations
  SET is_enabled = FALSE, updated_at = timezone('utc', now())
  WHERE club_id = v_club_id AND platform <> 'facebook';

  UPDATE public.website_social_integrations
  SET
    profile_url = 'https://www.facebook.com/profile.php?id=61560486822886',
    is_enabled = TRUE,
    updated_at = timezone('utc', now())
  WHERE club_id = v_club_id AND platform = 'facebook';

  -- ── Sponsorzy demo — ukryci ────────────────────────────────────────
  UPDATE public.sponsors
  SET show_on_website = FALSE, updated_at = timezone('utc', now())
  WHERE club_id = v_club_id;

  -- ── Usuń fake newsy ────────────────────────────────────────────────
  DELETE FROM public.website_media
  WHERE club_id = v_club_id
    AND section = 'news'
    AND news_id IN (
      SELECT id FROM public.website_news
      WHERE club_id = v_club_id
        AND slug IN (
          'wygrana-u-siebie-z-ks-orzel',
          'nowy-zawodnik-w-kadrze',
          'zaproszenie-na-dzien-otwarty-akademii',
          'podziekowania-dla-sponsorow',
          'remont-szatni-zakonczony',
          'podsumowanie-kolejki-12',
          'wolontariat-na-mecz-domowy',
          'szkic-relacji-wyjazdowej'
        )
    );

  DELETE FROM public.website_news
  WHERE club_id = v_club_id
    AND slug IN (
      'wygrana-u-siebie-z-ks-orzel',
      'nowy-zawodnik-w-kadrze',
      'zaproszenie-na-dzien-otwarty-akademii',
      'podziekowania-dla-sponsorow',
      'remont-szatni-zakonczony',
      'podsumowanie-kolejki-12',
      'wolontariat-na-mecz-domowy',
      'szkic-relacji-wyjazdowej'
    );

  ALTER TABLE public.website_news DISABLE TRIGGER website_news_enforce_publish;

  -- ── Aktualności z Facebooka ────────────────────────────────────────
  SELECT id INTO v_news_mlodzicy FROM public.website_news
  WHERE club_id = v_club_id AND slug = 'przed-nami-kolejne-wyzwanie-mlodzicy';

  IF v_news_mlodzicy IS NULL THEN
    INSERT INTO public.website_news (
      club_id, slug, title, excerpt, content, category, status, published_at
    ) VALUES (
      v_club_id,
      'przed-nami-kolejne-wyzwanie-mlodzicy',
      'Przed nami kolejne wyzwanie!',
      'Już w najbliższą środę drużyna Silesii Mietków rozegra spotkanie w ramach IV Ligi Okręgowej Młodzików.',
      E'PRZED NAMI KOLEJNE WYZWANIE!\n\nJuż w najbliższą środę nasza drużyna Silesii Mietków rozegra kolejne spotkanie w ramach IV Ligi Okręgowej Młodzików!\n\nWspieraj nas na boisku — razem tworzymy Pioruna!',
      'matches',
      'published',
      timezone('utc', now()) - INTERVAL '1 day'
    )
    RETURNING id INTO v_news_mlodzicy;
  ELSE
    UPDATE public.website_news
    SET
      title = 'Przed nami kolejne wyzwanie!',
      excerpt = 'Już w najbliższą środę drużyna Silesii Mietków rozegra spotkanie w ramach IV Ligi Okręgowej Młodzików.',
      content = E'PRZED NAMI KOLEJNE WYZWANIE!\n\nJuż w najbliższą środę nasza drużyna Silesii Mietków rozegra kolejne spotkanie w ramach IV Ligi Okręgowowej Młodzików!\n\nWspieraj nas na boisku — razem tworzymy Pioruna!',
      category = 'matches',
      status = 'published',
      published_at = timezone('utc', now()) - INTERVAL '1 day',
      updated_at = timezone('utc', now())
    WHERE id = v_news_mlodzicy;
  END IF;

  INSERT INTO public.website_news (club_id, slug, title, excerpt, content, category, status, published_at)
  VALUES (
    v_club_id,
    'zapowiedz-trampkarze-gwarek-walbrzych',
    'Kolejny mecz trampkarzy — Gwarek Wałbrzych',
    'W środę o 18:00 Silesia Mietków gra z Gwarekiem Wałbrzych w X kolejce V Ligi Okręgowej Trampkarzy.',
    E'KOLEJNY MECZ, KOLEJNE WYZWANIE!\n\nW środę o 18:00 nasi trampkarze Silesii Mietków zmierzą się z Gwarekiem Wałbrzych na wyjeździe.\n\nWalczmy od pierwszej do ostatniej minuty! Kibicujmy razem — tworzymy siłę!',
    'matches',
    'published',
    timezone('utc', now()) - INTERVAL '2 days'
  )
  ON CONFLICT (club_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    category = EXCLUDED.category,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = timezone('utc', now())
  RETURNING id INTO v_news_trampkarze;

  IF v_news_trampkarze IS NULL THEN
    SELECT id INTO v_news_trampkarze FROM public.website_news
    WHERE club_id = v_club_id AND slug = 'zapowiedz-trampkarze-gwarek-walbrzych';
  END IF;

  INSERT INTO public.website_news (club_id, slug, title, excerpt, content, category, status, published_at)
  VALUES (
    v_club_id,
    'zapowiedz-seniorzy-sparta-pustkow',
    'Zapowiedź: Sparta Pustków vs Piorun',
    'W sobotę o 16:00 seniorzy Pioruna Wawrzeńczyce grają wyjazdowo ze Spartą Pustków Żurawski.',
    E'JEDNO SERCE! JEDNA DRUŻYNA! JEDEN CEL!\n\nW sobotę o 16:00 nasi seniorzy rozgrywają mecz wyjazdowy ze Spartą Pustków Żurawski w ramach B Klasy.\n\nPrzyjdźcie, dopingujcie, bądźcie z nami! Walczymy razem do końca!',
    'matches',
    'published',
    timezone('utc', now()) - INTERVAL '3 days'
  )
  ON CONFLICT (club_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    category = EXCLUDED.category,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = timezone('utc', now())
  RETURNING id INTO v_news_seniorzy;

  IF v_news_seniorzy IS NULL THEN
    SELECT id INTO v_news_seniorzy FROM public.website_news
    WHERE club_id = v_club_id AND slug = 'zapowiedz-seniorzy-sparta-pustkow';
  END IF;

  INSERT INTO public.website_news (club_id, slug, title, excerpt, content, category, status, published_at)
  VALUES (
    v_club_id,
    'zapowiedz-trampkarze-zdroj-jedlina',
    'Dzień meczowy trampkarzy',
    'W sobotę o 11:00 trampkarze Silesii Mietków grają u siebie z Zdrojem Jedlina.',
    E'DZIEŃ MECZOWY!\n\nW sobotę o 11:00 na boisku w Mietkowie nasi trampkarze podejmują Zdrój Jedlina.\n\nGramy dla Silesii! Walczymy o każdą piłkę — wspieraj nas na trybunach!',
    'matches',
    'published',
    timezone('utc', now()) - INTERVAL '4 days'
  )
  ON CONFLICT (club_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    category = EXCLUDED.category,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = timezone('utc', now())
  RETURNING id INTO v_news_trampkarze2;

  IF v_news_trampkarze2 IS NULL THEN
    SELECT id INTO v_news_trampkarze2 FROM public.website_news
    WHERE club_id = v_club_id AND slug = 'zapowiedz-trampkarze-zdroj-jedlina';
  END IF;

  INSERT INTO public.website_news (club_id, slug, title, excerpt, content, category, status, published_at)
  VALUES (
    v_club_id,
    'akademia-pioruna-zapisy',
    'Akademia Pioruna — zapisy cały rok',
    'Od Skrzatów po Juniorów — trenujemy na naszym boisku w Mietkowie. Zapisz dziecko do akademii!',
    E'Akademia Pioruna Wawrzeńczyce to miejsce, gdzie dzieci uczą się piłki nożnej w rodzinnej atmosferze.\n\nGrupy: Skrzaty, Żaki, Orliki, Młodziki, Trampkarze, Juniorzy.\n\nTreningi na boisku klubowym. Zapisy: +48 663 595 991.',
    'academy',
    'published',
    timezone('utc', now()) - INTERVAL '5 days'
  )
  ON CONFLICT (club_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    category = EXCLUDED.category,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = timezone('utc', now())
  RETURNING id INTO v_news_akademia;

  IF v_news_akademia IS NULL THEN
    SELECT id INTO v_news_akademia FROM public.website_news
    WHERE club_id = v_club_id AND slug = 'akademia-pioruna-zapisy';
  END IF;

  -- Media wyróżniające dla newsów
  INSERT INTO public.website_media (club_id, section, slot_key, news_id, demo_asset_key, caption, sort_order)
  VALUES
    (v_club_id, 'news', v_news_mlodzicy::TEXT, v_news_mlodzicy, 'news-matches', 'Młodzicy — zapowiedź meczu', 0),
    (v_club_id, 'news', v_news_trampkarze::TEXT, v_news_trampkarze, 'news-sponsors', 'Trampkarze — mecz ligowy', 0),
    (v_club_id, 'news', v_news_seniorzy::TEXT, v_news_seniorzy, 'news-transfers', 'Seniorzy — zapowiedź', 0),
    (v_club_id, 'news', v_news_trampkarze2::TEXT, v_news_trampkarze2, 'news-club', 'Trampkarze u siebie', 0),
    (v_club_id, 'news', v_news_akademia::TEXT, v_news_akademia, 'news-academy', 'Akademia klubu', 0)
  ON CONFLICT (club_id, news_id) WHERE (section = 'news')
  DO UPDATE SET
    demo_asset_key = EXCLUDED.demo_asset_key,
    caption = EXCLUDED.caption,
    updated_at = timezone('utc', now());

  ALTER TABLE public.website_news ENABLE TRIGGER website_news_enforce_publish;

  -- ── Galeria — naprawa ścieżek (public/club-media) ──────────────────
  UPDATE public.website_gallery_albums
  SET
    title = CASE slug
      WHEN 'mecze-2026' THEN 'Mecze sezonu 2025/2026'
      WHEN 'treningi-zima' THEN 'Treningi i przygotowania'
      WHEN 'zycie-klubu' THEN 'Nasz klub'
      WHEN 'turniej-spoleczny' THEN 'Akademia i młodzież'
      ELSE title
    END,
    description = CASE slug
      WHEN 'mecze-2026' THEN 'Zapowiedzi i relacje meczowe Silesii Mietków i Pioruna.'
      WHEN 'treningi-zima' THEN 'Treningi na boisku w Mietkowie.'
      WHEN 'zycie-klubu' THEN 'Drużyna, boisko i wspólnota klubu.'
      WHEN 'turniej-spoleczny' THEN 'Młodzi zawodnicy Pioruna Wawrzeńczyce.'
      ELSE description
    END,
    updated_at = timezone('utc', now())
  WHERE club_id = v_club_id;

  UPDATE public.website_gallery_photos SET image_path = 'club-media/gallery-01.jpg', caption = 'Zapowiedź meczu młodzików', sort_order = 1
  WHERE club_id = v_club_id AND album_id = v_album_mecze AND sort_order = 1;
  UPDATE public.website_gallery_photos SET image_path = 'club-media/gallery-02.jpg', caption = 'Mecz ligowy — grafika klubu', sort_order = 2
  WHERE club_id = v_club_id AND album_id = v_album_mecze AND sort_order = 2;
  UPDATE public.website_gallery_photos SET image_path = 'club-media/gallery-03.jpg', caption = 'Trampkarze — dzień meczowy', sort_order = 3
  WHERE club_id = v_club_id AND album_id = v_album_mecze AND sort_order = 3;

  UPDATE public.website_gallery_photos SET image_path = 'club-media/academy-training.jpg', caption = 'Trening drużyny', sort_order = 1
  WHERE club_id = v_club_id AND album_id = v_album_trening AND sort_order = 1;
  UPDATE public.website_gallery_photos SET image_path = 'club-media/academy-kids.jpg', caption = 'Młodzi piłkarze na boisku', sort_order = 2
  WHERE club_id = v_club_id AND album_id = v_album_trening AND sort_order = 2;

  UPDATE public.website_gallery_photos SET image_path = 'club-media/team-seniors.jpg', caption = 'Drużyna na boisku', sort_order = 1
  WHERE club_id = v_club_id AND album_id = v_album_klub AND sort_order = 1;

  UPDATE public.website_gallery_photos SET image_path = 'club-media/team-youth.jpg', caption = 'Młodzież Pioruna', sort_order = 1
  WHERE club_id = v_club_id AND album_id = v_album_wydarzenia AND sort_order = 1;
  UPDATE public.website_gallery_photos SET image_path = 'club-media/team-u12.jpg', caption = 'Młodzicy — mecz ligowy', sort_order = 2
  WHERE club_id = v_club_id AND album_id = v_album_wydarzenia AND sort_order = 2;

END $$;
