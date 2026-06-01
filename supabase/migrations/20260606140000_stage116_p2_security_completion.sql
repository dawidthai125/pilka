-- ETAP 11.6 P2: training availability scope, memberships visibility

-- M1: Rodzic/zawodnik widzą tylko własne wiersze availability (nie cały skład drużyny)
DO $$
BEGIN
  IF to_regclass('public.training_availability') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "training_availability_select" ON public.training_availability';
  EXECUTE $pol$
    CREATE POLICY "training_availability_select" ON public.training_availability FOR SELECT TO authenticated
      USING (
        club_id IN (SELECT public.user_club_ids())
        AND (
          public.actor_can_read_player_row(club_id, player_id)
          OR (
            public.user_has_club_role(
              club_id,
              ARRAY['owner','president','sports_director','coach']::public.club_role[]
            )
            AND EXISTS (
              SELECT 1
              FROM public.trainings t
              WHERE t.id = training_id
                AND t.club_id = club_id
                AND public.actor_can_read_team_resource(club_id, t.team_id)
            )
          )
        )
      )
  $pol$;
END $$;

-- M5: Trener nie widzi membership innych użytkowników klubu
DROP POLICY IF EXISTS "memberships_select_own_or_leadership" ON public.club_memberships;
CREATE POLICY "memberships_select_own_or_leadership" ON public.club_memberships FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.user_has_club_role(
      club_id,
      ARRAY['owner', 'president', 'sports_director']::public.club_role[]
    )
  );
