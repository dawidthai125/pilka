-- ETAP 15.10 seed — injury categories & sample records

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_player_id UUID;
  v_team_id UUID;
  v_cat_muscle UUID;
  v_cat_match UUID;
  v_injury_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE id = v_club_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.injury_categories (club_id, slug, name, sort_order)
  VALUES
    (v_club_id, 'muscle', 'Mięśniowy', 1),
    (v_club_id, 'joint', 'Stawowy', 2),
    (v_club_id, 'overload', 'Przeciążeniowy', 3),
    (v_club_id, 'match', 'Uraz meczowy', 4),
    (v_club_id, 'training', 'Uraz treningowy', 5),
    (v_club_id, 'other', 'Inny', 99)
  ON CONFLICT (club_id, slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

  SELECT id INTO v_cat_muscle FROM public.injury_categories WHERE club_id = v_club_id AND slug = 'muscle' LIMIT 1;
  SELECT id INTO v_cat_match FROM public.injury_categories WHERE club_id = v_club_id AND slug = 'match' LIMIT 1;

  SELECT p.id, p.team_id INTO v_player_id, v_team_id
  FROM public.players p
  WHERE p.club_id = v_club_id AND p.email = 'zawodnik@piorun.test'
  LIMIT 1;

  IF v_player_id IS NULL THEN
    SELECT p.id, p.team_id INTO v_player_id, v_team_id
    FROM public.players p
    WHERE p.club_id = v_club_id
    ORDER BY p.created_at
    LIMIT 1;
  END IF;

  IF v_player_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.return_to_play WHERE club_id = v_club_id AND player_id = v_player_id;
  DELETE FROM public.rehabilitation_plans WHERE club_id = v_club_id AND player_id = v_player_id;
  DELETE FROM public.player_injuries WHERE club_id = v_club_id AND player_id = v_player_id
    AND description LIKE '[ETAP 15.10]%';

  INSERT INTO public.player_injuries (
    club_id, player_id, team_id, category_id, injury_date, expected_return_date,
    description, injury_status, availability_impact, is_active
  )
  VALUES (
    v_club_id, v_player_id, v_team_id, v_cat_muscle,
    (CURRENT_DATE - INTERVAL '5 days')::date,
    (CURRENT_DATE + INTERVAL '10 days')::date,
    '[ETAP 15.10] Napięcie mięśnia uda — ograniczony udział w treningu',
    'rehabilitation',
    'limited',
    TRUE
  )
  RETURNING id INTO v_injury_id;

  INSERT INTO public.rehabilitation_plans (
    club_id, injury_id, player_id, stage_label, coach_note, progress_note, status
  )
  VALUES (
    v_club_id, v_injury_id, v_player_id,
    'Etap II — wzmacnianie',
    'Praca indywidualna z fizjoterapeutą klubowym (trening funkcjonalny).',
    'Zawodnik wykonuje ćwiczenia bez bólu.',
    'in_progress'
  )
  ON CONFLICT (injury_id) DO UPDATE SET
    stage_label = EXCLUDED.stage_label,
    coach_note = EXCLUDED.coach_note,
    progress_note = EXCLUDED.progress_note,
    status = EXCLUDED.status;

  INSERT INTO public.return_to_play (
    club_id, injury_id, player_id, training_status, match_status, notes
  )
  VALUES (
    v_club_id, v_injury_id, v_player_id,
    'partial',
    'unavailable',
    'Powrót do meczu po pełnym treningu zespołowym bez ograniczeń.'
  )
  ON CONFLICT (injury_id) DO UPDATE SET
    training_status = EXCLUDED.training_status,
    match_status = EXCLUDED.match_status,
    notes = EXCLUDED.notes;

  INSERT INTO public.player_injuries (
    club_id, player_id, team_id, category_id, injury_date, expected_return_date,
    description, injury_status, availability_impact, is_active
  )
  VALUES (
    v_club_id, v_player_id, v_team_id, v_cat_match,
    (CURRENT_DATE - INTERVAL '90 days')::date,
    (CURRENT_DATE - INTERVAL '75 days')::date,
    '[ETAP 15.10] Stłuczenie kostki — zamknięty wpis historyczny',
    'closed',
    NULL,
    FALSE
  );
END $$;
