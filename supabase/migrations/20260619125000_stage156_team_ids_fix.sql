-- Fix: player_guardians optional — dynamic EXECUTE (re-apply safe)

CREATE OR REPLACE FUNCTION public.actor_communication_team_ids(p_club_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT t.id
  FROM public.teams t
  WHERE t.club_id = p_club_id
    AND (
      public.actor_can_manage_communication(p_club_id)
      OR EXISTS (
        SELECT 1 FROM public.club_memberships cm
        WHERE cm.club_id = p_club_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
          AND cm.team_id = t.id
          AND cm.role IN ('player','coach','parent')
      )
    );

  IF to_regclass('public.player_guardians') IS NOT NULL THEN
    RETURN QUERY EXECUTE $guardian$
      SELECT DISTINCT t.id
      FROM public.teams t
      WHERE t.club_id = $1
        AND EXISTS (
          SELECT 1
          FROM public.player_guardians pg
          JOIN public.players p ON p.id = pg.player_id AND p.club_id = pg.club_id
          WHERE pg.club_id = $1
            AND pg.profile_id = auth.uid()
            AND p.team_id = t.id
        )
    $guardian$ USING p_club_id;
  END IF;
END;
$$;
