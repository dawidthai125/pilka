-- ETAP 15A seed: Content Hub — Piorun Wawrzeńczyce

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_owner_id UUID;
  v_coach_id UUID;
  v_president_id UUID;
  v_match_id UUID;
  v_sponsor_id UUID;
  v_video_id UUID := 'e7010001-0001-4000-8000-000000000001';
  v_p1 UUID := 'c7010001-0001-4000-8000-000000000001';
  v_p2 UUID := 'c7010002-0002-4000-8000-000000000002';
  v_p3 UUID := 'c7010003-0003-4000-8000-000000000003';
  v_p4 UUID := 'c7010004-0004-4000-8000-000000000004';
  v_p5 UUID := 'c7010005-0005-4000-8000-000000000005';
BEGIN
  SELECT id INTO v_owner_id FROM public.profiles WHERE email = 'wlasciciel@piorun.test' LIMIT 1;
  SELECT id INTO v_coach_id FROM public.profiles WHERE email = 'trener@piorun.test' LIMIT 1;
  SELECT id INTO v_president_id FROM public.profiles WHERE email = 'prezes@piorun.test' LIMIT 1;
  IF v_coach_id IS NULL THEN v_coach_id := v_owner_id; END IF;
  IF v_president_id IS NULL THEN v_president_id := v_owner_id; END IF;

  SELECT id INTO v_match_id FROM public.matches
  WHERE club_id = v_club_id AND status IN ('planned', 'completed')
  ORDER BY match_date DESC LIMIT 1;

  SELECT id INTO v_sponsor_id FROM public.sponsors
  WHERE club_id = v_club_id ORDER BY created_at LIMIT 1;

  DELETE FROM public.content_ai_generations WHERE club_id = v_club_id;
  DELETE FROM public.content_approvals WHERE club_id = v_club_id;
  DELETE FROM public.content_calendar WHERE club_id = v_club_id;
  DELETE FROM public.content_assets WHERE club_id = v_club_id;
  DELETE FROM public.content_channel_variants WHERE club_id = v_club_id;
  DELETE FROM public.content_posts WHERE club_id = v_club_id;

  INSERT INTO public.content_posts (
    id, club_id, content_type, status, title, slug, summary, body_website,
    match_id, sponsor_id, video_id, created_by, ai_generated, scheduled_at
  ) VALUES
    (
      v_p1, v_club_id, 'match_preview', 'approved',
      'Zapowiedź: Piorun vs Orzeł Proszowice',
      'zapowiedz-piorun-orzel-proszowice',
      'W niedzielę czeka nas ważny mecz ligowy na własnym boisku.',
      'Klub Piorun Wawrzeńczyce zaprasza kibiców na mecz z Orłem Proszowice. Początek o 16:00. Wstęp wolny.',
      v_match_id, NULL, NULL, v_coach_id, TRUE, NOW() + INTERVAL '2 days'
    ),
    (
      v_p2, v_club_id, 'match_report', 'pending_approval',
      'Relacja: Piorun 3:1 Orzeł Proszowice',
      'relacja-piorun-orzel-proszowice',
      'Dominacja gospodarzy i trzy bramki w drugiej połowie.',
      'Piorun Wawrzeńczyce odniósł pewne zwycięstwo 3:1 z Orłem Proszowice. MVP meczu: kapitan zespołu.',
      v_match_id, NULL, v_video_id, v_coach_id, TRUE, NULL
    ),
    (
      v_p3, v_club_id, 'sponsor_post', 'draft',
      'Sponsor meczu — podziękowania',
      'sponsor-meczu-podziekowania',
      'Podziękowania dla sponsora meczu.',
      'Dziękujemy naszemu sponsorowi meczu za wsparcie drużyny Piorun Wawrzeńczyce!',
      NULL, v_sponsor_id, NULL, v_owner_id, FALSE, NULL
    ),
    (
      v_p4, v_club_id, 'club_announcement', 'published',
      'Komunikat: trening otwarty dla rodziców',
      'komunikat-trening-rodzice',
      'Zapraszamy rodziców na trening otwarty w sobotę.',
      'Informujemy, że w najbliższą sobotę odbędzie się trening otwarty dla rodziców i kibiców. Zbiórka o 10:00.',
      NULL, NULL, NULL, v_president_id, FALSE, NOW() - INTERVAL '1 day'
    ),
    (
      v_p5, v_club_id, 'round_summary', 'draft',
      'Podsumowanie 12. kolejki',
      'podsumowanie-12-kolejki',
      'Krótkie podsumowanie wyników naszej grupy.',
      'W 12. kolejce Piorun utrzymał pozycję w czołówce tabeli. Kolejny mecz za tydzień.',
      NULL, NULL, NULL, v_coach_id, TRUE, NULL
    );

  UPDATE public.content_posts
  SET published_at = NOW() - INTERVAL '1 day', approved_by = v_president_id, approved_at = NOW() - INTERVAL '1 day'
  WHERE id = v_p4;

  INSERT INTO public.content_channel_variants (post_id, club_id, channel, title, body, status, queue_position) VALUES
    (v_p1, v_club_id, 'website', 'Zapowiedź meczu', 'Klub Piorun Wawrzeńczyce zaprasza kibiców na mecz z Orłem Proszowice. Początek o 16:00.', 'approved', 1),
    (v_p1, v_club_id, 'facebook', 'Zapowiedź meczu', '⚽ W niedzielę gramy u siebie! Piorun vs Orzeł Proszowice, 16:00. Do zobaczenia na stadionie! #PiorunWawrzenczyce', 'queued', 1),
    (v_p1, v_club_id, 'instagram', 'Zapowiedź', '⚽ Niedziela 16:00 | Piorun vs Orzeł | Do zobaczenia! 🔵⚪', 'queued', 2),
    (v_p2, v_club_id, 'website', 'Relacja meczowa', 'Piorun Wawrzeńczyce odniósł pewne zwycięstwo 3:1 z Orłem Proszowice.', 'draft', 0),
    (v_p2, v_club_id, 'facebook', 'Relacja', '🏆 Wygrana 3:1! Dziękujemy kibicom za wsparcie. Pełna relacja na stronie klubu.', 'draft', 0),
    (v_p2, v_club_id, 'instagram', 'Wynik', '🏆 3:1 | MVP: kapitan | #Piorun', 'draft', 0),
    (v_p3, v_club_id, 'sponsor', 'Podziękowania', 'Dziękujemy sponsorowi meczu za wsparcie naszej drużyny!', 'draft', 0),
    (v_p4, v_club_id, 'club_announcement', 'Trening otwarty', 'Zapraszamy rodziców na trening otwarty w sobotę o 10:00.', 'published', 0);

  INSERT INTO public.content_calendar (post_id, club_id, scheduled_at, all_day) VALUES
    (v_p1, v_club_id, NOW() + INTERVAL '2 days', FALSE),
    (v_p2, v_club_id, NOW() + INTERVAL '1 day', FALSE);

  INSERT INTO public.content_approvals (post_id, club_id, action, actor_id, note) VALUES
    (v_p1, v_club_id, 'submitted', v_coach_id, 'Zapowiedź meczu — do akceptacji'),
    (v_p1, v_club_id, 'approved', v_president_id, 'Zatwierdzono publikację zapowiedzi'),
    (v_p2, v_club_id, 'submitted', v_coach_id, 'Relacja meczowa po wygranej'),
    (v_p4, v_club_id, 'published', v_president_id, 'Opublikowano komunikat klubowy');

  INSERT INTO public.content_ai_generations (club_id, post_id, generation_type, prompt_summary, model, source, created_by) VALUES
    (v_club_id, v_p1, 'match_preview', 'Wygeneruj zapowiedź spotkania Piorun vs Orzeł', 'gpt-4o-mini', 'generator', v_coach_id),
    (v_club_id, v_p2, 'match_report', 'Wygeneruj podsumowanie meczu na podstawie wyniku 3:1', 'gpt-4o-mini', 'match', v_coach_id),
    (v_club_id, v_p5, 'round_summary', 'Przygotuj podsumowanie 12. kolejki', 'template', 'generator', v_coach_id);

  INSERT INTO public.content_assets (club_id, post_id, asset_type, title, uploaded_by, tags) VALUES
    (v_club_id, v_p2, 'photo', 'Zdjęcie z meczu — strzał na bramkę', v_coach_id, '["mecz","2025"]'::jsonb),
    (v_club_id, NULL, 'graphic', 'Szablon posta sponsorskiego', v_owner_id, '["sponsor","szablon"]'::jsonb);
END $$;
