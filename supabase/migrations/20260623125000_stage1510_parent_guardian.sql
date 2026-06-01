-- ETAP 15.10 — upewnij powiązanie rodzic ↔ zawodnik testowy (portal urazów)

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_player_id UUID;
  v_parent_id UUID;
BEGIN
  IF to_regclass('public.player_guardians') IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_parent_id FROM public.profiles WHERE email = 'rodzic@piorun.test' LIMIT 1;

  SELECT p.id INTO v_player_id
  FROM public.players p
  WHERE p.club_id = v_club_id AND p.email = 'zawodnik@piorun.test'
  LIMIT 1;

  IF v_player_id IS NULL THEN
    v_player_id := 'c1000001-0000-4000-8000-000000000006';
  END IF;

  IF v_parent_id IS NULL OR v_player_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.player_guardians (club_id, player_id, profile_id, relationship)
  VALUES (v_club_id, v_player_id, v_parent_id, 'Rodzic')
  ON CONFLICT (club_id, player_id, profile_id) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.actor_can_read_injury_row(p_club_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_injury_staff(p_club_id)
      OR public.actor_can_read_player_row(p_club_id, p_player_id)
      OR p_player_id IN (SELECT public.actor_managed_player_ids(p_club_id))
    );
$$;
