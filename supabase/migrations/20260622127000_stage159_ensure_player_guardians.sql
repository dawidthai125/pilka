-- ETAP 15.9 — ensure player_guardians for parent portal (dev bez pełnego finance seed)

CREATE TABLE IF NOT EXISTS public.player_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT player_guardians_unique UNIQUE (club_id, player_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_player_guardians_profile ON public.player_guardians (club_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_player_guardians_player ON public.player_guardians (club_id, player_id);

ALTER TABLE public.player_guardians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS player_guardians_select ON public.player_guardians;
DROP POLICY IF EXISTS "player_guardians_select" ON public.player_guardians;

CREATE POLICY player_guardians_select ON public.player_guardians FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.user_has_club_role(
      club_id,
      ARRAY['owner', 'president', 'sports_director', 'coach']::public.club_role[]
    )
  );

DROP POLICY IF EXISTS player_guardians_manage ON public.player_guardians;
DROP POLICY IF EXISTS "player_guardians_manage" ON public.player_guardians;

CREATE POLICY player_guardians_manage ON public.player_guardians FOR ALL TO authenticated
  USING (
    public.user_has_club_role(
      club_id,
      ARRAY['owner', 'president', 'sports_director']::public.club_role[]
    )
  )
  WITH CHECK (
    public.user_has_club_role(
      club_id,
      ARRAY['owner', 'president', 'sports_director']::public.club_role[]
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_guardians TO authenticated;

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_player_id UUID := 'c1000001-0000-4000-8000-000000000006';
  v_parent_id UUID;
BEGIN
  SELECT id INTO v_parent_id FROM public.profiles WHERE email = 'rodzic@piorun.test' LIMIT 1;
  IF v_parent_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.player_guardians (club_id, player_id, profile_id, relationship)
  VALUES (v_club_id, v_player_id, v_parent_id, 'Rodzic')
  ON CONFLICT (club_id, player_id, profile_id) DO NOTHING;
END $$;
