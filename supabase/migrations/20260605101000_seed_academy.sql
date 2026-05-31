-- ETAP 11: Seed akademii — Piorun Wawrzeńczyce

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_senior_team UUID := 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  v_coach_id UUID;
  v_player RECORD;
  v_i INTEGER;
BEGIN
  SELECT id INTO v_coach_id FROM public.profiles WHERE email = 'trener@piorun.test' LIMIT 1;

  DELETE FROM public.opponent_analysis WHERE club_id = v_club_id;
  DELETE FROM public.scouting_reports WHERE club_id = v_club_id;
  DELETE FROM public.scouting_players WHERE club_id = v_club_id;
  DELETE FROM public.scouting_clubs WHERE club_id = v_club_id;
  DELETE FROM public.player_team_transitions WHERE club_id = v_club_id;
  DELETE FROM public.fitness_tests WHERE club_id = v_club_id;
  DELETE FROM public.player_goals WHERE club_id = v_club_id;
  DELETE FROM public.player_assessments WHERE club_id = v_club_id;
  DELETE FROM public.player_development_history WHERE club_id = v_club_id;
  DELETE FROM public.player_development WHERE club_id = v_club_id;
  DELETE FROM public.academy_group_staff WHERE club_id = v_club_id;
  DELETE FROM public.academy_groups WHERE club_id = v_club_id;

  INSERT INTO public.teams (id, club_id, name, category, season, is_active) VALUES
    ('b2c3d4e5-f6a7-8901-bcde-f12345678902', v_club_id, 'Skrzaty', 'u10', '2025/2026', TRUE),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678903', v_club_id, 'Żaki', 'u10', '2025/2026', TRUE),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678904', v_club_id, 'Orliki', 'u12', '2025/2026', TRUE),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678905', v_club_id, 'Młodziki', 'u12', '2025/2026', TRUE),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678906', v_club_id, 'Trampkarze', 'u18', '2025/2026', TRUE),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678907', v_club_id, 'Juniorzy', 'u18', '2025/2026', TRUE)
  ON CONFLICT (club_id, name, category) DO UPDATE SET season = EXCLUDED.season, is_active = TRUE;

  INSERT INTO public.academy_groups (id, club_id, age_group, team_id, name, description) VALUES
    ('a1100001-0000-4000-8000-000000000001', v_club_id, 'skrzaty', 'b2c3d4e5-f6a7-8901-bcde-f12345678902', 'Skrzaty', 'Grupa najmłodsza — roczniki 2018+'),
    ('a1100001-0000-4000-8000-000000000002', v_club_id, 'zaki', 'b2c3d4e5-f6a7-8901-bcde-f12345678903', 'Żaki', 'Rozwój techniki podstawowej'),
    ('a1100001-0000-4000-8000-000000000003', v_club_id, 'orliki', 'b2c3d4e5-f6a7-8901-bcde-f12345678904', 'Orliki', 'Gra zespołowa i motoryka'),
    ('a1100001-0000-4000-8000-000000000004', v_club_id, 'mlodziki', 'b2c3d4e5-f6a7-8901-bcde-f12345678905', 'Młodziki', 'Przygotowanie do 11-osobowej'),
    ('a1100001-0000-4000-8000-000000000005', v_club_id, 'trampkarze', 'b2c3d4e5-f6a7-8901-bcde-f12345678906', 'Trampkarze', 'Taktyka i wydolność'),
    ('a1100001-0000-4000-8000-000000000006', v_club_id, 'juniorzy', 'b2c3d4e5-f6a7-8901-bcde-f12345678907', 'Juniorzy', 'Most do seniorów'),
    ('a1100001-0000-4000-8000-000000000007', v_club_id, 'seniorzy', v_senior_team, 'Seniorzy', 'Pierwsza drużyna — B Klasa DZPN')
  ON CONFLICT (club_id, age_group) DO UPDATE SET team_id = EXCLUDED.team_id, name = EXCLUDED.name;

  IF v_coach_id IS NOT NULL THEN
    INSERT INTO public.academy_group_staff (club_id, group_id, profile_id, staff_role) VALUES
      (v_club_id, 'a1100001-0000-4000-8000-000000000007', v_coach_id, 'head_coach'),
      (v_club_id, 'a1100001-0000-4000-8000-000000000006', v_coach_id, 'head_coach')
    ON CONFLICT DO NOTHING;
  END IF;

  FOR v_player IN SELECT id FROM public.players WHERE club_id = v_club_id LOOP
    v_i := (ABS(hashtext(v_player.id::TEXT)) % 30) + 55;
    INSERT INTO public.player_development (club_id, player_id, potential, development_level, overall_rating, updated_by)
    VALUES (v_club_id, v_player.id, LEAST(100, v_i + 10), v_i, v_i - 5, v_coach_id);

    INSERT INTO public.player_development_history (club_id, player_id, potential, development_level, overall_rating, note, recorded_by, recorded_at)
    VALUES
      (v_club_id, v_player.id, v_i - 8, v_i - 12, v_i - 15, 'Ocena początkowa sezonu', v_coach_id, timezone('utc', now()) - INTERVAL '120 days'),
      (v_club_id, v_player.id, v_i - 3, v_i - 6, v_i - 8, 'Poprawa po okresie przygotowawczym', v_coach_id, timezone('utc', now()) - INTERVAL '60 days'),
      (v_club_id, v_player.id, LEAST(100, v_i + 10), v_i, v_i - 5, 'Aktualna ocena', v_coach_id, timezone('utc', now()) - INTERVAL '7 days');

    INSERT INTO public.player_assessments (
      club_id, player_id, assessor_id, assessed_at,
      technique, speed, motorics, endurance, strength, tactics, engagement, discipline, cooperation, average_score, notes
    ) VALUES (
      v_club_id, v_player.id, v_coach_id, CURRENT_DATE - ((ABS(hashtext(v_player.id::TEXT)) % 14)),
      6 + (ABS(hashtext(v_player.id::TEXT || 't')) % 4),
      6 + (ABS(hashtext(v_player.id::TEXT || 's')) % 4),
      6 + (ABS(hashtext(v_player.id::TEXT || 'm')) % 3),
      6 + (ABS(hashtext(v_player.id::TEXT || 'e')) % 4),
      6 + (ABS(hashtext(v_player.id::TEXT || 'st')) % 3),
      6 + (ABS(hashtext(v_player.id::TEXT || 'ta')) % 4),
      7 + (ABS(hashtext(v_player.id::TEXT || 'en')) % 3),
      7 + (ABS(hashtext(v_player.id::TEXT || 'd')) % 3),
      7 + (ABS(hashtext(v_player.id::TEXT || 'c')) % 3),
      7.2,
      'Ocena okresowa — trening i mecze ligowe'
    );

    INSERT INTO public.player_goals (club_id, player_id, title, description, status, target_date, created_by) VALUES
      (v_club_id, v_player.id, 'Poprawa szybkości', 'Sprinty i praca nad pierwszym krokiem', 'active', CURRENT_DATE + 90, v_coach_id),
      (v_club_id, v_player.id, 'Poprawa wytrzymałości', 'Beep test — cel +1 poziom', 'active', CURRENT_DATE + 120, v_coach_id);

    INSERT INTO public.fitness_tests (club_id, player_id, test_type, result_value, unit, test_date, recorded_by) VALUES
      (v_club_id, v_player.id, 'sprint_10m', 1.85 + (ABS(hashtext(v_player.id::TEXT)) % 30) / 100.0, 's', CURRENT_DATE - 30, v_coach_id),
      (v_club_id, v_player.id, 'sprint_30m', 4.5 + (ABS(hashtext(v_player.id::TEXT)) % 50) / 100.0, 's', CURRENT_DATE - 30, v_coach_id),
      (v_club_id, v_player.id, 'vertical_jump', 45 + (ABS(hashtext(v_player.id::TEXT)) % 15), 'cm', CURRENT_DATE - 14, v_coach_id),
      (v_club_id, v_player.id, 'beep_test', 8 + (ABS(hashtext(v_player.id::TEXT)) % 4), 'level', CURRENT_DATE - 7, v_coach_id);
  END LOOP;

  UPDATE public.player_goals SET status = 'completed', completed_at = timezone('utc', now()) - INTERVAL '10 days'
  WHERE club_id = v_club_id AND player_id = 'c1000001-0000-4000-8000-000000000007' AND title = 'Poprawa szybkości';

  INSERT INTO public.player_team_transitions (
    club_id, player_id, from_age_group, to_age_group, from_team_id, to_team_id,
    transition_date, transition_type, reason, decision_by
  ) VALUES
    (v_club_id, 'c1000001-0000-4000-8000-000000000017', 'juniorzy', 'seniorzy',
     'b2c3d4e5-f6a7-8901-bcde-f12345678907', v_senior_team,
     '2024-07-01', 'promotion', 'Awans do pierwszej drużyny — decyzja trenera', v_coach_id),
    (v_club_id, 'c1000001-0000-4000-8000-000000000006', 'juniorzy', 'seniorzy',
     'b2c3d4e5-f6a7-8901-bcde-f12345678907', v_senior_team,
     '2024-01-15', 'promotion', 'Wyróżniająca forma w sparingach', v_coach_id);

  INSERT INTO public.scouting_clubs (id, club_id, name, club_type, city, notes) VALUES
    ('a1200001-0000-4000-8000-000000000001', v_club_id, 'GLKS Mietków', 'league_opponent', 'Mietków', 'Bezpośredni rywal w B Klasie'),
    ('a1200001-0000-4000-8000-000000000002', v_club_id, 'KS Wawrzeńczyce', 'academy', 'Wawrzeńczyce', 'Lokalna akademia — potencjalne współprace'),
    ('a1200001-0000-4000-8000-000000000003', v_club_id, 'Śląsk Wrocław Akademia', 'partner', 'Wrocław', 'Klub partnerski — wymiany młodzieżowe')
  ON CONFLICT (club_id, name) DO NOTHING;

  INSERT INTO public.scouting_players (id, club_id, first_name, last_name, external_club_name, position, age_years, status, scouted_by, notes) VALUES
    ('a1300001-0000-4000-8000-000000000001', v_club_id, 'Kacper', 'Baran', 'KS Wawrzeńczyce', 'midfielder', 16, 'recommended', v_coach_id, 'Dobry drybling, słabsza gra głową'),
    ('a1300001-0000-4000-8000-000000000002', v_club_id, 'Oskar', 'Lis', 'GLKS Mietków', 'forward', 17, 'observed', v_coach_id, 'Obserwacja po meczu ligowym'),
    ('a1300001-0000-4000-8000-000000000003', v_club_id, 'Alan', 'Sobczak', 'Śląsk Wrocław Akademia', 'defender', 15, 'testing', v_coach_id, 'Zaproszony na trening testowy'),
    ('a1300001-0000-4000-8000-000000000004', v_club_id, 'Igor', 'Kaczmarek', 'Dobrzykowice UKS', 'goalkeeper', 18, 'rejected', v_coach_id, 'Brak reakcji na wysokie piłki'),
    ('a1300001-0000-4000-8000-000000000005', v_club_id, 'Mikołaj', 'Zawadzki', 'Smolec FC', 'midfielder', 16, 'observed', v_coach_id, 'Wysoka motoryka');

  INSERT INTO public.scouting_reports (
    club_id, scouting_player_id, author_id, report_date,
    technique, motorics, tactics, character, potential, final_rating, summary
  ) VALUES
    (v_club_id, 'a1300001-0000-4000-8000-000000000001', v_coach_id, CURRENT_DATE - 5,
     8, 7, 7, 8, 8, 8, 'Rekomendacja do testów w Juniorach — technika powyżej średniej ligi.'),
    (v_club_id, 'a1300001-0000-4000-8000-000000000002', v_coach_id, CURRENT_DATE - 12,
     7, 6, 6, 7, 7, 7, 'Perspektywiczny napastnik, wymaga pracy nad grą tyłem do bramki.'),
    (v_club_id, 'a1300001-0000-4000-8000-000000000003', v_coach_id, CURRENT_DATE - 2,
     6, 8, 6, 7, 8, 7, 'Obrońca o profilu motorycznym — testy w toku.');

  INSERT INTO public.opponent_analysis (
    club_id, opponent_name, scouting_club_id, strengths, weaknesses, key_players, tactical_setup, analysis_date, author_id
  ) VALUES
    (v_club_id, 'GLKS Mietków', 'a1200001-0000-4000-8000-000000000001',
     'Silna gra stałymi fragmentami, dośrodkowania z narożników',
     'Słaba presja po stracie, wolni obrońcy przy kontrach',
     'Kapitan #10 (playmaker), napastnik #9 (główki)',
     '4-4-2 z wysokim pressingiem w pierwszych 15 min',
     CURRENT_DATE - 3, v_coach_id),
    (v_club_id, 'KS Dobrzykowice', NULL,
     'Szybkie skrzydła, gra prosta w przód',
     'Problemy w defensywie przy stałych fragmentach',
     'Skrzydłowy #7, pomocnik #6',
     '4-3-3, rotacja skrzydłowych',
     CURRENT_DATE - 14, v_coach_id);

END $$;
