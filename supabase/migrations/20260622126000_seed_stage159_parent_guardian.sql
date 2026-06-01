-- ETAP 15.9 — powiązanie rodzica z zawodnikiem (portal equipment kits / assignments)

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_player_id UUID := 'c1000001-0000-4000-8000-000000000006';
  v_parent_id UUID;
BEGIN
  IF to_regclass('public.player_guardians') IS NULL THEN
    RAISE NOTICE 'ETAP 15.9 parent guardian SKIP — brak tabeli player_guardians (setup:stage7)';
    RETURN;
  END IF;

  SELECT id INTO v_parent_id FROM public.profiles WHERE email = 'rodzic@piorun.test' LIMIT 1;

  IF v_parent_id IS NULL THEN
    RAISE NOTICE 'ETAP 15.9 parent guardian SKIP — brak rodzic@piorun.test';
    RETURN;
  END IF;

  INSERT INTO public.player_guardians (club_id, player_id, profile_id, relationship)
  VALUES (v_club_id, v_player_id, v_parent_id, 'Rodzic')
  ON CONFLICT (club_id, player_id, profile_id) DO NOTHING;
END $$;
