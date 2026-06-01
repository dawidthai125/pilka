-- ETAP 11.6: Production hardening — RLS, storage, anon grants, sponsor RPC
-- Wymaga ETAP 1–11. Tworzy brakujące helpery stage115, jeśli nie wdrożono wcześniej.

CREATE OR REPLACE FUNCTION public.coach_team_ids(p_club_id UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cm.team_id
  FROM public.club_memberships cm
  WHERE cm.club_id = p_club_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'coach'
    AND cm.status = 'active'
    AND cm.team_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.actor_is_coach_team_scoped(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_memberships cm
    WHERE cm.club_id = p_club_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'coach'
      AND cm.status = 'active'
      AND cm.team_id IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.storage_player_id_from_path(object_name TEXT)
RETURNS UUID
LANGUAGE sql IMMUTABLE AS $$
  SELECT (regexp_match(object_name, '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/players/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'))[1]::uuid;
$$;

DO $$
BEGIN
  IF to_regclass('public.player_guardians') IS NOT NULL THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.parent_player_ids(p_club_id UUID)
      RETURNS SETOF UUID
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $body$
        SELECT pg.player_id
        FROM public.player_guardians pg
        WHERE pg.club_id = p_club_id
          AND pg.profile_id = auth.uid()
          AND p_club_id IN (SELECT public.user_club_ids());
      $body$;
    $fn$;
  ELSE
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.parent_player_ids(p_club_id UUID)
      RETURNS SETOF UUID
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $body$
        SELECT NULL::UUID WHERE FALSE;
      $body$;
    $fn$;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.parent_player_ids(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- H1 + H5: president in manage; coaches must be team-scoped (fail closed)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.actor_can_read_team_resource(
  p_club_id UUID,
  p_team_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.user_has_club_role(
        p_club_id,
        ARRAY['owner','president','sports_director']::public.club_role[]
      )
      OR (
        public.user_has_club_role(p_club_id, ARRAY['coach']::public.club_role[])
        AND public.actor_is_coach_team_scoped(p_club_id)
        AND p_team_id IS NOT NULL
        AND p_team_id IN (SELECT public.coach_team_ids(p_club_id))
      )
      OR (
        public.player_id_for_user(p_club_id, auth.uid()) IS NOT NULL
        AND p_team_id = (
          SELECT pl.team_id
          FROM public.players pl
          WHERE pl.id = public.player_id_for_user(p_club_id, auth.uid())
        )
      )
      OR p_team_id IN (
        SELECT pl.team_id
        FROM public.players pl
        WHERE pl.id IN (SELECT public.parent_player_ids(p_club_id))
          AND pl.team_id IS NOT NULL
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_team_resource(
  p_club_id UUID,
  p_team_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.user_has_club_role(
        p_club_id,
        ARRAY['owner','president','sports_director']::public.club_role[]
      )
      OR (
        public.user_has_club_role(p_club_id, ARRAY['coach']::public.club_role[])
        AND public.actor_is_coach_team_scoped(p_club_id)
        AND p_team_id IS NOT NULL
        AND p_team_id IN (SELECT public.coach_team_ids(p_club_id))
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_player_row(
  p_club_id UUID,
  p_player_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND EXISTS (
      SELECT 1
      FROM public.players pl
      WHERE pl.id = p_player_id
        AND pl.club_id = p_club_id
        AND (
          public.user_has_club_role(
            p_club_id,
            ARRAY['owner','president','sports_director']::public.club_role[]
          )
          OR (
            public.user_has_club_role(p_club_id, ARRAY['coach']::public.club_role[])
            AND public.actor_is_coach_team_scoped(p_club_id)
            AND pl.team_id IS NOT NULL
            AND pl.team_id IN (SELECT public.coach_team_ids(p_club_id))
          )
          OR pl.id = public.player_id_for_user(p_club_id, auth.uid())
          OR pl.id IN (SELECT public.parent_player_ids(p_club_id))
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_player_row(
  p_club_id UUID,
  p_player_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      (
        p_player_id IS NULL
        AND public.user_has_club_role(
          p_club_id,
          ARRAY['owner','president','sports_director','coach']::public.club_role[]
        )
      )
      OR EXISTS (
        SELECT 1
        FROM public.players pl
        WHERE pl.id = p_player_id
          AND pl.club_id = p_club_id
          AND public.actor_can_manage_team_resource(p_club_id, pl.team_id)
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.coach_team_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_is_coach_team_scoped(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_player_row(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_player_row(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- H2: player_coach_notes — team / row scoped
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "player_coach_notes_select" ON public.player_coach_notes;
DROP POLICY IF EXISTS "player_coach_notes_manage" ON public.player_coach_notes;

CREATE POLICY "player_coach_notes_select" ON public.player_coach_notes FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_is_coaching_staff(club_id)
    AND public.actor_can_read_player_row(club_id, player_id)
  );

CREATE POLICY "player_coach_notes_manage" ON public.player_coach_notes FOR ALL TO authenticated
  USING (
    public.actor_is_coaching_staff(club_id)
    AND public.actor_can_manage_player_row(club_id, player_id)
  )
  WITH CHECK (
    public.actor_is_coaching_staff(club_id)
    AND public.actor_can_manage_player_row(club_id, player_id)
  );

-- ---------------------------------------------------------------------------
-- H3: Storage player assets — align write with row-level manage
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "club_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "club_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "club_assets_delete" ON storage.objects;

CREATE POLICY "club_assets_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets'
    AND public.storage_is_club_player_asset_path(name)
    AND public.storage_club_id_from_path(name) IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_player_row(
      public.storage_club_id_from_path(name),
      public.storage_player_id_from_path(name)
    )
  );

CREATE POLICY "club_assets_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND public.storage_is_club_player_asset_path(name)
    AND public.storage_club_id_from_path(name) IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_player_row(
      public.storage_club_id_from_path(name),
      public.storage_player_id_from_path(name)
    )
  )
  WITH CHECK (
    bucket_id = 'club-assets'
    AND public.storage_is_club_player_asset_path(name)
    AND public.actor_can_manage_player_row(
      public.storage_club_id_from_path(name),
      public.storage_player_id_from_path(name)
    )
  );

CREATE POLICY "club_assets_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND public.storage_is_club_player_asset_path(name)
    AND public.storage_club_id_from_path(name) IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_player_row(
      public.storage_club_id_from_path(name),
      public.storage_player_id_from_path(name)
    )
  );

-- ---------------------------------------------------------------------------
-- H4: Website storage — only when public site enabled
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "club_assets_website_public_read" ON storage.objects;
CREATE POLICY "club_assets_website_public_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'club-assets'
    AND (storage.foldername(name))[2] = 'website'
    AND public.website_is_public((storage.foldername(name))[1]::uuid)
  );

-- ---------------------------------------------------------------------------
-- H6: Academy manage — team-scoped for coaches
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.player_development') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.actor_can_manage_academy_player(
      p_club_id UUID,
      p_player_id UUID
    )
    RETURNS BOOLEAN
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $body$
      SELECT
        p_club_id IN (SELECT public.user_club_ids())
        AND (
          public.user_has_club_role(
            p_club_id,
            ARRAY['owner','sports_director']::public.club_role[]
          )
          OR (
            public.user_has_club_role(p_club_id, ARRAY['coach']::public.club_role[])
            AND public.actor_is_coach_team_scoped(p_club_id)
            AND EXISTS (
              SELECT 1
              FROM public.players pl
              WHERE pl.id = p_player_id
                AND pl.club_id = p_club_id
                AND pl.team_id IN (SELECT public.coach_team_ids(p_club_id))
            )
          )
        );
    $body$;
  $fn$;

  EXECUTE 'DROP POLICY IF EXISTS "player_development_manage" ON public.player_development';
  EXECUTE 'CREATE POLICY "player_development_manage" ON public.player_development FOR ALL TO authenticated
    USING (public.actor_can_manage_academy_player(club_id, player_id))
    WITH CHECK (public.actor_can_manage_academy_player(club_id, player_id))';

  EXECUTE 'DROP POLICY IF EXISTS "player_development_history_manage" ON public.player_development_history';
  EXECUTE 'CREATE POLICY "player_development_history_manage" ON public.player_development_history FOR ALL TO authenticated
    USING (public.actor_can_manage_academy_player(club_id, player_id))
    WITH CHECK (public.actor_can_manage_academy_player(club_id, player_id))';

  EXECUTE 'DROP POLICY IF EXISTS "player_assessments_manage" ON public.player_assessments';
  EXECUTE 'CREATE POLICY "player_assessments_manage" ON public.player_assessments FOR ALL TO authenticated
    USING (public.actor_can_manage_academy_player(club_id, player_id))
    WITH CHECK (public.actor_can_manage_academy_player(club_id, player_id))';

  EXECUTE 'DROP POLICY IF EXISTS "player_goals_manage" ON public.player_goals';
  EXECUTE 'CREATE POLICY "player_goals_manage" ON public.player_goals FOR ALL TO authenticated
    USING (public.actor_can_manage_academy_player(club_id, player_id))
    WITH CHECK (public.actor_can_manage_academy_player(club_id, player_id))';

  EXECUTE 'DROP POLICY IF EXISTS "fitness_tests_manage" ON public.fitness_tests';
  EXECUTE 'CREATE POLICY "fitness_tests_manage" ON public.fitness_tests FOR ALL TO authenticated
    USING (public.actor_can_manage_academy_player(club_id, player_id))
    WITH CHECK (public.actor_can_manage_academy_player(club_id, player_id))';

  EXECUTE 'DROP POLICY IF EXISTS "player_team_transitions_manage" ON public.player_team_transitions';
  EXECUTE 'CREATE POLICY "player_team_transitions_manage" ON public.player_team_transitions FOR ALL TO authenticated
    USING (public.actor_can_manage_academy_player(club_id, player_id))
    WITH CHECK (public.actor_can_manage_academy_player(club_id, player_id))';

  EXECUTE 'GRANT EXECUTE ON FUNCTION public.actor_can_manage_academy_player(UUID, UUID) TO authenticated';
END $$;

-- ---------------------------------------------------------------------------
-- H10: Anon grants for public website (post security_hardening REVOKE)
-- ---------------------------------------------------------------------------

GRANT SELECT ON public.matches TO anon, authenticated;
GRANT SELECT ON public.league_table_entries TO anon, authenticated;
GRANT SELECT ON public.clubs TO anon, authenticated;
GRANT SELECT ON public.teams TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;

DROP POLICY IF EXISTS profiles_public_website_author_select ON public.profiles;
CREATE POLICY profiles_public_website_author_select ON public.profiles FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.website_news n
    WHERE n.author_id = profiles.id
      AND n.status = 'published'
      AND public.website_is_public(n.club_id)
  )
);

-- ---------------------------------------------------------------------------
-- M2: Parent inventory kits
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regprocedure('public.actor_can_read_inventory(uuid)') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.actor_can_read_own_inventory(p_club_id UUID, p_player_id UUID)
    RETURNS BOOLEAN
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $body$
      SELECT
        p_club_id IN (SELECT public.user_club_ids())
        AND (
          public.actor_can_read_inventory(p_club_id)
          OR (
            public.user_has_club_role(p_club_id, ARRAY['player']::public.club_role[])
            AND p_player_id = public.player_id_for_user(p_club_id, auth.uid())
          )
          OR (
            public.user_has_club_role(p_club_id, ARRAY['parent']::public.club_role[])
            AND p_player_id IN (SELECT public.parent_player_ids(p_club_id))
          )
        );
    $body$;
  $fn$;
END $$;

-- ---------------------------------------------------------------------------
-- M3: Integrations read — leadership only (no coach config access)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.actor_can_read_integrations(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director']::public.club_role[]
    );
$$;

-- ---------------------------------------------------------------------------
-- M4: Website social config — exclude coach
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.website_social_integrations') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "website_social_staff_select" ON public.website_social_integrations';
  EXECUTE $pol$
    CREATE POLICY "website_social_staff_select" ON public.website_social_integrations FOR SELECT TO authenticated
      USING (
        public.actor_can_manage_website(club_id)
        OR public.user_has_club_role(
          club_id,
          ARRAY['owner','president','website_admin','sports_director']::public.club_role[]
        )
      )
  $pol$;
END $$;

-- ---------------------------------------------------------------------------
-- M6: Teams CRUD — leadership only (coaches read via teams_select_member)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "teams_manage_staff" ON public.teams;
CREATE POLICY "teams_manage_staff" ON public.teams FOR ALL TO authenticated
  USING (public.user_has_club_role(club_id, ARRAY['owner', 'president', 'sports_director']::public.club_role[]))
  WITH CHECK (public.user_has_club_role(club_id, ARRAY['owner', 'president', 'sports_director']::public.club_role[]));

-- ---------------------------------------------------------------------------
-- M7: Sponsor portal schedule — validate team belongs to club
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regprocedure('public.actor_is_sponsor_user(uuid)') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.get_sponsor_portal_schedule(
      p_club_id UUID,
      p_team_id UUID
    )
    RETURNS JSONB
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $body$
      SELECT jsonb_build_object(
        'upcoming', COALESCE((
          SELECT jsonb_agg(row_to_json(u)::JSONB ORDER BY u.match_date, u.match_time)
          FROM (
            SELECT
              m.id,
              m.home_team_name,
              m.away_team_name,
              m.match_date,
              to_char(m.match_time, 'HH24:MI') AS match_time,
              m.status::TEXT AS status
            FROM public.matches m
            WHERE m.club_id = p_club_id
              AND m.team_id = p_team_id
              AND m.status = 'planned'
              AND m.match_date >= CURRENT_DATE
            ORDER BY m.match_date, m.match_time
            LIMIT 5
          ) u
        ), '[]'::JSONB),
        'results', COALESCE((
          SELECT jsonb_agg(row_to_json(r)::JSONB ORDER BY r.match_date DESC)
          FROM (
            SELECT
              m.id,
              m.home_team_name,
              m.away_team_name,
              m.home_score,
              m.away_score,
              m.match_date
            FROM public.matches m
            WHERE m.club_id = p_club_id
              AND m.team_id = p_team_id
              AND m.status = 'completed'
            ORDER BY m.match_date DESC
            LIMIT 5
          ) r
        ), '[]'::JSONB)
      )
      WHERE public.actor_is_sponsor_user(p_club_id)
        AND EXISTS (
          SELECT 1
          FROM public.teams t
          WHERE t.id = p_team_id
            AND t.club_id = p_club_id
            AND t.is_active = TRUE
        );
    $body$;
  $fn$;
END $$;

-- ---------------------------------------------------------------------------
-- L1: AI report categories — academy, scouting, integrations, website
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regtype('public.ai_report_category') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'club_role'
      AND e.enumlabel = 'treasurer'
  ) THEN
    RETURN;
  END IF;

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.actor_can_read_ai_report(
      p_club_id UUID,
      p_category public.ai_report_category
    )
    RETURNS BOOLEAN
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $body$
      SELECT
        p_club_id IN (SELECT public.user_club_ids())
        AND (
          (
            p_category::text IN ('management', 'sponsors', 'finance', 'inventory')
            AND public.user_has_club_role(
              p_club_id,
              ARRAY['owner','president','treasurer','sports_director']::public.club_role[]
            )
          )
          OR (
            p_category::text IN ('matches', 'trainings', 'players', 'academy', 'scouting')
            AND public.user_has_club_role(
              p_club_id,
              ARRAY['owner','president','sports_director','coach']::public.club_role[]
            )
          )
          OR (
            p_category::text IN ('website', 'integrations')
            AND public.user_has_club_role(
              p_club_id,
              ARRAY['owner','president','sports_director','website_admin']::public.club_role[]
            )
          )
        );
    $body$;
  $fn$;
END $$;
