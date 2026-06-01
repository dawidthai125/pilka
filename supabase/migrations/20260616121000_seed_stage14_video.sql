-- ETAP 14 seed: Video Center — Piorun Wawrzeńczyce

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_owner_id UUID;
  v_coach_id UUID;
  v_match_id UUID;
  v_training_id UUID;
  v_v1 UUID := 'e7010001-0001-4000-8000-000000000001';
  v_v2 UUID := 'e7010002-0002-4000-8000-000000000002';
  v_v3 UUID := 'e7010003-0003-4000-8000-000000000003';
  v_v4 UUID := 'e7010004-0004-4000-8000-000000000004';
  v_j1 UUID := 'f7010001-0001-4000-8000-000000000001';
  v_j2 UUID := 'f7010002-0002-4000-8000-000000000002';
  v_j3 UUID := 'f7010003-0003-4000-8000-000000000003';
  v_r1 UUID := 'a7010001-0001-4000-8000-000000000001';
  v_r2 UUID := 'a7010002-0002-4000-8000-000000000002';
  v_r3 UUID := 'a7010003-0003-4000-8000-000000000003';
BEGIN
  SELECT id INTO v_owner_id FROM public.profiles WHERE email = 'wlasciciel@piorun.test' LIMIT 1;
  SELECT id INTO v_coach_id FROM public.profiles WHERE email = 'trener@piorun.test' LIMIT 1;
  IF v_coach_id IS NULL THEN v_coach_id := v_owner_id; END IF;

  SELECT id INTO v_match_id FROM public.matches
  WHERE club_id = v_club_id AND status = 'completed'
  ORDER BY match_date DESC LIMIT 1;

  SELECT id INTO v_training_id FROM public.trainings
  WHERE club_id = v_club_id ORDER BY training_date DESC LIMIT 1;

  DELETE FROM public.video_news_drafts WHERE club_id = v_club_id;
  DELETE FROM public.video_shares WHERE club_id = v_club_id;
  DELETE FROM public.video_clips WHERE club_id = v_club_id;
  DELETE FROM public.video_notes WHERE club_id = v_club_id;
  DELETE FROM public.video_events WHERE club_id = v_club_id;
  DELETE FROM public.video_reports WHERE club_id = v_club_id;
  DELETE FROM public.video_jobs WHERE club_id = v_club_id;
  DELETE FROM public.videos WHERE club_id = v_club_id;

  INSERT INTO public.videos (
    id, club_id, uploaded_by, title, description, category, storage_path, file_name,
    mime_type, file_size_bytes, duration_seconds, match_id, job_status, view_count, recorded_at
  ) VALUES
    (
      v_v1, v_club_id, v_coach_id,
      'Mecz ligowy — Piorun vs Orzeł Proszowice',
      'Pełne nagranie meczu domowego, kamera główna.',
      'match', NULL, 'piorun-orzel-mecz.mp4', 'video/mp4', 524288000, 5400,
      v_match_id, 'ready', 42, NOW() - INTERVAL '5 days'
    ),
    (
      v_v2, v_club_id, v_coach_id,
      'Trening tygodniowy — pressing i wyjście z pressingu',
      'Nagranie z boiska treningowego, widok całego boiska.',
      'training', NULL, 'trening-pressing.mp4', 'video/mp4', 314572800, 3600,
      NULL, 'ready', 28, NOW() - INTERVAL '3 days'
    ),
    (
      v_v3, v_club_id, v_owner_id,
      'Analiza przeciwnika — KS Cracovia II',
      'Materiał z meczu przeciwnika do analizy taktycznej.',
      'opponent_analysis', NULL, 'cracovia-ii-analiza.mp4', 'video/mp4', 419430400, 4800,
      NULL, 'ready', 15, NOW() - INTERVAL '7 days'
    ),
    (
      v_v4, v_club_id, v_coach_id,
      'Materiał szkoleniowy — ustawienie linii obrony',
      'Krótki materiał dla zawodników U18.',
      'educational', NULL, 'obrona-u18.mov', 'video/quicktime', 104857600, 900,
      NULL, 'processing', 8, NOW() - INTERVAL '1 day'
    );

  UPDATE public.videos SET training_id = v_training_id WHERE id = v_v2;
  UPDATE public.videos SET opponent_name = 'KS Cracovia II' WHERE id = v_v3;

  INSERT INTO public.video_jobs (id, club_id, video_id, status, step, progress_percent, started_at, completed_at)
  VALUES
    (v_j1, v_club_id, v_v1, 'ready', 'completed', 100, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '12 minutes'),
    (v_j2, v_club_id, v_v2, 'ready', 'completed', 100, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '8 minutes'),
    (v_j3, v_club_id, v_v4, 'processing', 'ai_analysis', 65, NOW() - INTERVAL '30 minutes', NULL);

  INSERT INTO public.video_reports (
    id, club_id, video_id, report_type, title, summary,
    strengths, weaknesses, key_moments, coaching_recommendations, extra_sections, created_by
  ) VALUES
    (
      v_r1, v_club_id, v_v1, 'match',
      'Raport AI — mecz Piorun vs Orzeł Proszowice',
      'Drużyna dominowała w drugiej połowie dzięki lepszemu pressingowi i szybkiemu wyjściu z własnej połowy. Wygrana 3:1 zasłużona.',
      '["Skuteczny pressing po stracie piłki","Dobra organizacja stałych fragmentów","Wysoka intensywność biegu bez piłki"]'::jsonb,
      '["Słaba gra głową przy rzutach rożnych przeciwnika","Zbyt głęboko ustawiona linia obrony w 1. połowie"]'::jsonb,
      '[{"minute":23,"label":"Gol","description":"Strzał z ok. 16 m po akcji skrzydłowej"},{"minute":67,"label":"Gol","description":"Kontra po odbiorze na środku pola"},{"minute":81,"label":"Kartka","description":"Drugie ostrzeżenie za tactical foul"}]'::jsonb,
      '["Praca nad ustawieniem linii przy długich piłkach","Trening gry głową — 2× w tygodniu","Utrzymać intensywność pressingu z 2. połowy"]'::jsonb,
      '{"intensity":"wysoka","possession_estimate":"58%"}'::jsonb,
      v_coach_id
    ),
    (
      v_r2, v_club_id, v_v2, 'training',
      'Raport AI — trening pressing',
      'Trening przebiegł w wysokiej intensywności. Zawodnicy dobrze reagowali na sygnały trenera.',
      '["Wysoka intensywność","Dobra organizacja ćwiczeń","Zaangażowanie całej grupy"]'::jsonb,
      '["Zbyt długie przerwy między seriami","Kilku zawodników spóźnionych na briefing"]'::jsonb,
      '[{"minute":15,"label":"Ćwiczenie","description":"Pressing 6v6 na połowie przeciwnika"},{"minute":45,"label":"SSG","description":"Gra 8v8 z limitem dotknięć"}]'::jsonb,
      '["Skrócić przerwy do 90 s","Rotacja grup w ćwiczeniach pressingowych"]'::jsonb,
      '{"intensity":"wysoka","organization":"dobra","engagement":"bardzo dobre"}'::jsonb,
      v_coach_id
    ),
    (
      v_r3, v_club_id, v_v3, 'opponent',
      'Raport AI — analiza KS Cracovia II',
      'Przeciwnik preferuje grę skrzydłami i szybkie przejścia. Słabszy przy pressingu na obrońców.',
      '["Szybkie skrzydła","Dobre stałe fragmenty ofensywne"]'::jsonb,
      '["Problemy z wyjściem piłki pod pressingiem","Słaba gra głową w defensywie"]'::jsonb,
      '[{"minute":34,"label":"Kluczowy zawodnik","description":"Nr 10 — kreator akcji, 70% ataków"},{"minute":72,"label":"Słabość","description":"Błąd bramkarza przy wypuścieniu piłki"}]'::jsonb,
      '["Pressing na obrońców w ich połowie","Blokada skrzydeł — wysunięty boczny pomocnik"]'::jsonb,
      '{"key_players":["Nr 10 — playmaker","Nr 9 — target man"]}'::jsonb,
      v_owner_id
    );

  INSERT INTO public.video_events (club_id, video_id, event_type, source, timestamp_seconds, label, description, created_by)
  VALUES
    (v_club_id, v_v1, 'goal', 'ai_confirmed', 1380, 'Gol 1:0', 'Strzał z dystansu po akcji skrzydłowej', v_coach_id),
    (v_club_id, v_v1, 'corner', 'manual', 2100, 'Rzut rożny', 'Niebezpieczny rzut rożny przeciwnika', v_coach_id),
    (v_club_id, v_v1, 'goal', 'ai_suggested', 4020, 'Gol 2:1', 'Kontra po odbiorze — do weryfikacji', NULL),
    (v_club_id, v_v1, 'card', 'manual', 4860, 'Kartka żółta', 'Tactical foul na środku pola', v_coach_id),
    (v_club_id, v_v2, 'substitution', 'manual', 1800, 'Zmiana', 'Rotacja składów w SSG', v_coach_id);

  INSERT INTO public.video_notes (club_id, video_id, author_id, timestamp_seconds, content)
  VALUES
    (v_club_id, v_v1, v_coach_id, 754, 'Błąd ustawienia linii obrony — za głęboko, zostawiamy przestrzeń za plecami'),
    (v_club_id, v_v1, v_coach_id, 1380, 'Świetna akcja skrzydłowa — wzór do powtórzenia'),
    (v_club_id, v_v2, v_coach_id, 900, 'Zbyt wolne wyjście z pressingu — poprawić komunikację');

  INSERT INTO public.video_clips (club_id, video_id, title, category, start_seconds, end_seconds, created_by)
  VALUES
    (v_club_id, v_v1, 'Gol 1:0 — akcja skrzydłowa', 'goal', 1360, 1395, v_coach_id),
    (v_club_id, v_v1, 'Pressing — odbiór i kontra', 'offensive', 3980, 4030, v_coach_id),
    (v_club_id, v_v1, 'Błąd defensywy — linia za głęboko', 'defensive', 730, 780, v_coach_id);

  INSERT INTO public.video_news_drafts (club_id, video_id, report_id, draft_type, title, content, status)
  VALUES
    (
      v_club_id, v_v1, v_r1, 'club_news',
      'Wygrana 3:1 z Orłem Proszowice!',
      'Piorun Wawrzeńczyce odniósł zasłużone zwycięstwo 3:1 z Orłem Proszowice. Drużyna pokazała charakter w drugiej połowie dzięki skutecznemu pressingowi. Szczegóły w raporcie wideo w Video Center.',
      'pending_approval'
    ),
    (
      v_club_id, v_v1, v_r1, 'facebook_post',
      'Post Facebook — mecz z Orłem',
      '⚡ Piorun 3:1 Orzeł Proszowice! Dziękujemy kibicom za wsparcie. Pełna relacja wkrótce na stronie klubu. #PiorunWawrzeńczyce #3liga',
      'pending_approval'
    );
END $$;
