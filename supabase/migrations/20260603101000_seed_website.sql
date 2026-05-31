-- ETAP 9 seed: strona publiczna Piorun Wawrzeńczyce

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_director_id UUID;
  v_coach_id UUID;
  v_owner_id UUID;
  v_album_mecze UUID := 'e9010001-0001-4000-8000-000000000001';
  v_album_trening UUID := 'e9010002-0002-4000-8000-000000000002';
  v_album_klub UUID := 'e9010003-0003-4000-8000-000000000003';
  v_album_wydarzenia UUID := 'e9010004-0004-4000-8000-000000000004';
BEGIN
  SELECT id INTO v_owner_id FROM public.profiles WHERE email = 'wlasciciel@piorun.test' LIMIT 1;
  SELECT id INTO v_director_id FROM public.profiles WHERE email = 'dyrektor@piorun.test' LIMIT 1;
  SELECT id INTO v_coach_id FROM public.profiles WHERE email = 'trener@piorun.test' LIMIT 1;

  DELETE FROM public.website_gallery_photos WHERE club_id = v_club_id;
  DELETE FROM public.website_gallery_albums WHERE club_id = v_club_id;
  DELETE FROM public.website_news WHERE club_id = v_club_id;
  DELETE FROM public.website_social_integrations WHERE club_id = v_club_id;
  DELETE FROM public.website_settings WHERE club_id = v_club_id;

  INSERT INTO public.website_settings (
    club_id, public_site_enabled,
    primary_color, secondary_color, accent_color,
    hero_title, hero_subtitle,
    contact_address, contact_email, contact_phone,
    google_maps_embed_url,
    seo_title, seo_description
  ) VALUES (
    v_club_id, TRUE,
    '#0B3D2E', '#F4C430', '#FFFFFF',
    'Piorun Wawrzeńczyce',
    'Oficjalna strona klubu · GLKS Mietków · B Klasa · Dolnośląskie',
    'ul. Sportowa 1, 32-020 Wawrzeńczyce',
    'kontakt@piorun-wawrzenczyce.pl',
    '+48 12 345 67 89',
    'https://maps.google.com/?q=Wawrze%C5%84czyce',
    'Piorun Wawrzeńczyce — oficjalna strona klubu piłkarskiego',
    'Aktualności, terminarz, wyniki, tabela ligi, kadra i sponsorzy klubu Piorun Wawrzeńczyce (GLKS Mietków).'
  );

  INSERT INTO public.website_social_integrations (club_id, platform, profile_url, is_enabled, api_connected)
  VALUES
    (v_club_id, 'facebook', 'https://facebook.com/piorunwawrzenczyce', TRUE, FALSE),
    (v_club_id, 'instagram', 'https://instagram.com/piorunwawrzenczyce', TRUE, FALSE),
    (v_club_id, 'tiktok', 'https://tiktok.com/@piorunwawrzenczyce', FALSE, FALSE),
    (v_club_id, 'youtube', 'https://youtube.com/@piorunwawrzenczyce', TRUE, FALSE);

  UPDATE public.sponsors SET
    show_on_website = TRUE,
    public_tier = 'main',
    public_description = 'Sponsor główny — logo na strojach meczowych i banerze przy boisku.'
  WHERE club_id = v_club_id AND company_name = 'Budmax Sp. z o.o.';

  UPDATE public.sponsors SET
    show_on_website = TRUE,
    public_tier = 'supporting',
    public_description = 'Partner techniczny — serwis autobusu drużyny.'
  WHERE club_id = v_club_id AND company_name IN ('AutoSerwis Kowalski', 'Pizzeria Roma', 'Hotel Wawrzeńczyce', 'Sklep Sportowy PRO', 'MediaPress Group');

  UPDATE public.sponsors SET
    show_on_website = TRUE,
    public_tier = 'partner',
    public_description = 'Partner klubu — wsparcie lokalnej społeczności.'
  WHERE club_id = v_club_id AND company_name IN ('Kancelaria Prawna Nowak', 'Agro-Farm Sp. z o.o.');

  INSERT INTO public.website_news (
    id, club_id, slug, title, excerpt, content, category, status, author_id, published_at, seo_title
  ) VALUES
    ('f9010001-0001-4000-8000-000000000001', v_club_id, 'wygrana-u-siebie-z-ks-orzel',
      'Wygrana u siebie z KS Orzeł',
      'Piorun pokonał Orła 3:1 w emocjonującym meczu ligowym.',
      'Seniorzy Pioruna odnieśli cenne zwycięstwo w starciu z KS Orzeł. Bramki zdobyli zawodnicy klubu po dobrej grze w drugiej połowie. Trener podkreślił znaczenie wspólnej presji i dyscypliny taktycznej.',
      'matches', 'published', COALESCE(v_coach_id, v_director_id), timezone('utc', now()) - INTERVAL '3 days',
      'Wygrana Pioruna z KS Orzeł — relacja'),
    ('f9010002-0002-4000-8000-000000000002', v_club_id, 'nowy-zawodnik-w-kadrze',
      'Nowy zawodnik dołącza do kadry',
      'Klub ogłasza transfer pomocnika z lokalnej ligi.',
      'Z radością witamy nowego zawodnika w zespole seniorów. To wzmocnienie środka pola przed decydującą fazą sezonu. Oficjalna prezentacja odbędzie się przed najbliższym meczem domowym.',
      'transfers', 'published', COALESCE(v_director_id, v_owner_id), timezone('utc', now()) - INTERVAL '7 days',
      'Transfer w Piorunie Wawrzeńczyce'),
    ('f9010003-0003-4000-8000-000000000003', v_club_id, 'zaproszenie-na-dzien-otwarty-akademii',
      'Dzień otwarty akademii klubu',
      'Zapraszamy młodych piłkarzy na trening pokazowy.',
      'Akademia Pioruna Wawrzeńczyce organizuje dzień otwarty dla chłopców urodzonych 2014–2018. Trening odbędzie się na boisku klubowym w sobotę o godz. 10:00.',
      'academy', 'published', COALESCE(v_coach_id, v_director_id), timezone('utc', now()) - INTERVAL '5 days',
      'Dzień otwarty akademii Pioruna'),
    ('f9010004-0004-4000-8000-000000000004', v_club_id, 'podziekowania-dla-sponsorow',
      'Podziękowania dla sponsorów sezonu',
      'Klub dziękuje partnerom za wsparcie w bieżącym sezonie.',
      'Bez wsparcia lokalnych firm rozwój klubu byłby niemożliwy. Dziękujemy Budmax, AutoSerwis Kowalski, Pizzerii Roma i wszystkim partnerom za zaangażowanie.',
      'sponsors', 'published', COALESCE(v_owner_id, v_director_id), timezone('utc', now()) - INTERVAL '10 days',
      'Sponsorzy Pioruna Wawrzeńczyce'),
    ('f9010005-0005-4000-8000-000000000005', v_club_id, 'remont-szatni-zakonczony',
      'Remont szatni zakończony',
      'Nowe wyposażenie i odświeżone pomieszczenia dla zawodników.',
      'Po kilku tygodniach prac szatnia klubowa została oddana do użytku. To ważny krok w poprawie warunków treningowych i meczowych.',
      'club', 'published', COALESCE(v_director_id, v_owner_id), timezone('utc', now()) - INTERVAL '14 days',
      'Remont szatni — Piorun Wawrzeńczyce'),
    ('f9010006-0006-4000-8000-000000000006', v_club_id, 'podsumowanie-kolejki-12',
      'Podsumowanie 12. kolejki',
      'Przegląd wyników ligi i sytuacji w tabeli.',
      'Po 12. kolejce Piorun utrzymuje pozycję w górnej połowie tabeli B Klasy. Kolejny mecz domowy już w najbliższą niedzielę.',
      'matches', 'published', COALESCE(v_coach_id, v_director_id), timezone('utc', now()) - INTERVAL '2 days',
      'Podsumowanie kolejki — Piorun'),
    ('f9010007-0007-4000-8000-000000000007', v_club_id, 'wolontariat-na-mecz-domowy',
      'Poszukujemy wolontariuszy na mecz domowy',
      'Dołącz do ekipy organizacyjnej i wspieraj klub.',
      'Szukamy osób do obsługi kasy, bufetu i strefy kibica podczas najbliższego meczu. Zgłoszenia przyjmujemy mailowo.',
      'club', 'published', COALESCE(v_director_id, v_owner_id), timezone('utc', now()) - INTERVAL '1 day',
      'Wolontariat — Piorun Wawrzeńczyce'),
    ('f9010008-0008-4000-8000-000000000008', v_club_id, 'szkic-relacji-wyjazdowej',
      'Szkic relacji z meczu wyjazdowego',
      'Robocza relacja — oczekuje na zatwierdzenie redaktora.',
      'Mecz wyjazdowy zakończył się remisem. Zespół pokazał charakter w końcówce. Pełna relacja po weryfikacji.',
      'matches', 'draft', COALESCE(v_coach_id, v_director_id), NULL,
      NULL);

  INSERT INTO public.website_gallery_albums (id, club_id, slug, title, description, category, sort_order, is_published)
  VALUES
    (v_album_mecze, v_club_id, 'mecze-2026', 'Mecze sezonu 2025/2026', 'Zdjęcia z meczów ligowych i pucharowych.', 'matches', 1, TRUE),
    (v_album_trening, v_club_id, 'treningi-zima', 'Treningi zimowe', 'Przygotowania do rundy wiosennej.', 'trainings', 2, TRUE),
    (v_album_klub, v_club_id, 'zycie-klubu', 'Życie klubu', 'Wydarzenia klubowe i spotkania.', 'club', 3, TRUE),
    (v_album_wydarzenia, v_club_id, 'turniej-spoleczny', 'Turniej społeczny', 'Turniej charytatywny na boisku klubowym.', 'events', 4, TRUE);

  INSERT INTO public.website_gallery_photos (club_id, album_id, image_path, caption, sort_order)
  VALUES
    (v_club_id, v_album_mecze, v_club_id::TEXT || '/website/gallery/' || v_album_mecze::TEXT || '/01.jpg', 'Mecz domowy z KS Orzeł', 1),
    (v_club_id, v_album_mecze, v_club_id::TEXT || '/website/gallery/' || v_album_mecze::TEXT || '/02.jpg', 'Radost po golu', 2),
    (v_club_id, v_album_mecze, v_club_id::TEXT || '/website/gallery/' || v_album_mecze::TEXT || '/03.jpg', 'Kibice na trybunach', 3),
    (v_club_id, v_album_trening, v_club_id::TEXT || '/website/gallery/' || v_album_trening::TEXT || '/01.jpg', 'Ćwiczenia taktyczne', 1),
    (v_club_id, v_album_trening, v_club_id::TEXT || '/website/gallery/' || v_album_trening::TEXT || '/02.jpg', 'Biegi interwałowe', 2),
    (v_club_id, v_album_klub, v_club_id::TEXT || '/website/gallery/' || v_album_klub::TEXT || '/01.jpg', 'Spotkanie zarządu z kibicami', 1),
    (v_club_id, v_album_wydarzenia, v_club_id::TEXT || '/website/gallery/' || v_album_wydarzenia::TEXT || '/01.jpg', 'Ceremonia otwarcia turnieju', 1),
    (v_club_id, v_album_wydarzenia, v_club_id::TEXT || '/website/gallery/' || v_album_wydarzenia::TEXT || '/02.jpg', 'Mecz finałowy', 2);

END $$;

-- Konto administratora strony (jeśli istnieje profil webadmin)
DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_webadmin_id UUID;
BEGIN
  SELECT id INTO v_webadmin_id FROM public.profiles WHERE email = 'webadmin@piorun.test' LIMIT 1;
  IF v_webadmin_id IS NOT NULL THEN
    INSERT INTO public.club_memberships (club_id, user_id, role, status)
    VALUES (v_club_id, v_webadmin_id, 'website_admin', 'active')
    ON CONFLICT (club_id, user_id, role) DO UPDATE SET status = 'active';
  END IF;
END $$;
