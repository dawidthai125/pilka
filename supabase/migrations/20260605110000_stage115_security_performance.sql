-- ETAP 11.5: Security hardening (row-level players, coach teams) + performance indexes

-- ---------------------------------------------------------------------------
-- Helpers: coach teams, row-level player/team access
-- ---------------------------------------------------------------------------

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
        AND (
          NOT public.actor_is_coach_team_scoped(p_club_id)
          OR p_team_id IS NULL
          OR p_team_id IN (SELECT public.coach_team_ids(p_club_id))
        )
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
        ARRAY['owner','sports_director']::public.club_role[]
      )
      OR (
        public.user_has_club_role(p_club_id, ARRAY['coach']::public.club_role[])
        AND (
          NOT public.actor_is_coach_team_scoped(p_club_id)
          OR p_team_id IS NULL
          OR p_team_id IN (SELECT public.coach_team_ids(p_club_id))
        )
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
            AND (
              NOT public.actor_is_coach_team_scoped(p_club_id)
              OR pl.team_id IS NULL
              OR pl.team_id IN (SELECT public.coach_team_ids(p_club_id))
            )
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
          ARRAY['owner','sports_director','coach']::public.club_role[]
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

CREATE OR REPLACE FUNCTION public.storage_player_id_from_path(object_name TEXT)
RETURNS UUID
LANGUAGE sql IMMUTABLE AS $$
  SELECT (regexp_match(object_name, '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/players/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'))[1]::uuid;
$$;

-- Club-wide gate: leadership + coach (row policies enforce scope)
CREATE OR REPLACE FUNCTION public.actor_can_read_players(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.user_has_club_role(
    p_club_id,
    ARRAY['owner','president','sports_director','coach','player','parent']::public.club_role[]
  );
$$;

-- ---------------------------------------------------------------------------
-- Players module RLS
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "players_select" ON public.players;
CREATE POLICY "players_select" ON public.players FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_player_row(club_id, id)
  );

DROP POLICY IF EXISTS "players_insert" ON public.players;
CREATE POLICY "players_insert" ON public.players FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_manage_team_resource(club_id, team_id));

DROP POLICY IF EXISTS "players_update" ON public.players;
CREATE POLICY "players_update" ON public.players FOR UPDATE TO authenticated
  USING (public.actor_can_manage_player_row(club_id, id))
  WITH CHECK (public.actor_can_manage_team_resource(club_id, team_id));

DROP POLICY IF EXISTS "players_delete" ON public.players;
CREATE POLICY "players_delete" ON public.players FOR DELETE TO authenticated
  USING (public.actor_can_manage_player_row(club_id, id));

DROP POLICY IF EXISTS "player_documents_select" ON public.player_documents;
CREATE POLICY "player_documents_select" ON public.player_documents FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_player_row(club_id, player_id)
  );

DROP POLICY IF EXISTS "player_stats_select" ON public.player_stats;
CREATE POLICY "player_stats_select" ON public.player_stats FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_player_row(club_id, player_id)
  );

DROP POLICY IF EXISTS "player_history_select" ON public.player_club_history;
CREATE POLICY "player_history_select" ON public.player_club_history FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_player_row(club_id, player_id)
  );

DROP POLICY IF EXISTS "player_injuries_select" ON public.player_injuries;
CREATE POLICY "player_injuries_select" ON public.player_injuries FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_player_row(club_id, player_id)
  );

DROP POLICY IF EXISTS "player_documents_manage" ON public.player_documents;
CREATE POLICY "player_documents_manage" ON public.player_documents FOR ALL TO authenticated
  USING (public.actor_can_manage_player_row(club_id, player_id))
  WITH CHECK (public.actor_can_manage_player_row(club_id, player_id));

DROP POLICY IF EXISTS "player_stats_manage" ON public.player_stats;
CREATE POLICY "player_stats_manage" ON public.player_stats FOR ALL TO authenticated
  USING (public.actor_can_manage_player_row(club_id, player_id))
  WITH CHECK (public.actor_can_manage_player_row(club_id, player_id));

DROP POLICY IF EXISTS "player_history_manage" ON public.player_club_history;
CREATE POLICY "player_history_manage" ON public.player_club_history FOR ALL TO authenticated
  USING (public.actor_can_manage_player_row(club_id, player_id))
  WITH CHECK (public.actor_can_manage_player_row(club_id, player_id));

DROP POLICY IF EXISTS "player_injuries_manage" ON public.player_injuries;
CREATE POLICY "player_injuries_manage" ON public.player_injuries FOR ALL TO authenticated
  USING (public.actor_can_manage_player_row(club_id, player_id))
  WITH CHECK (public.actor_can_manage_player_row(club_id, player_id));

-- ---------------------------------------------------------------------------
-- Trainings: team-scoped read for coach/player/parent
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "trainings_select" ON public.trainings;
CREATE POLICY "trainings_select" ON public.trainings FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_trainings(club_id)
    AND public.actor_can_read_team_resource(club_id, team_id)
  );

DROP POLICY IF EXISTS "trainings_manage" ON public.trainings;
CREATE POLICY "trainings_manage" ON public.trainings FOR ALL TO authenticated
  USING (public.actor_can_manage_team_resource(club_id, team_id))
  WITH CHECK (public.actor_can_manage_team_resource(club_id, team_id));

DROP POLICY IF EXISTS "training_availability_select" ON public.training_availability;
CREATE POLICY "training_availability_select" ON public.training_availability FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_trainings(club_id)
    AND (
      public.actor_can_read_player_row(club_id, player_id)
      OR EXISTS (
        SELECT 1 FROM public.trainings t
        WHERE t.id = training_id
          AND t.club_id = club_id
          AND public.actor_can_read_team_resource(club_id, t.team_id)
      )
    )
  );

DROP POLICY IF EXISTS "training_attendance_select" ON public.training_attendance;
CREATE POLICY "training_attendance_select" ON public.training_attendance FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_trainings(club_id)
    AND EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = training_id
        AND t.club_id = club_id
        AND public.actor_can_read_team_resource(club_id, t.team_id)
    )
  );

DROP POLICY IF EXISTS "training_notes_select" ON public.training_session_notes;
CREATE POLICY "training_notes_select" ON public.training_session_notes FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_is_coaching_staff(club_id)
    AND EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = training_id
        AND t.club_id = club_id
        AND public.actor_can_read_team_resource(club_id, t.team_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Matches: team-scoped read
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "matches_select" ON public.matches;
CREATE POLICY "matches_select" ON public.matches FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_matches(club_id)
    AND public.actor_can_read_team_resource(club_id, team_id)
  );

DROP POLICY IF EXISTS "matches_manage" ON public.matches;
CREATE POLICY "matches_manage" ON public.matches FOR ALL TO authenticated
  USING (public.actor_can_manage_team_resource(club_id, team_id))
  WITH CHECK (public.actor_can_manage_team_resource(club_id, team_id));

DROP POLICY IF EXISTS "match_squad_select" ON public.match_squad;
CREATE POLICY "match_squad_select" ON public.match_squad FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_matches(club_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = club_id
        AND public.actor_can_read_team_resource(club_id, m.team_id)
    )
  );

DROP POLICY IF EXISTS "match_lineup_select" ON public.match_lineup_positions;
CREATE POLICY "match_lineup_select" ON public.match_lineup_positions FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_matches(club_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = club_id
        AND public.actor_can_read_team_resource(club_id, m.team_id)
    )
  );

DROP POLICY IF EXISTS "match_events_select" ON public.match_events;
CREATE POLICY "match_events_select" ON public.match_events FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_matches(club_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = club_id
        AND public.actor_can_read_team_resource(club_id, m.team_id)
    )
  );

DROP POLICY IF EXISTS "match_player_stats_select" ON public.match_player_stats;
CREATE POLICY "match_player_stats_select" ON public.match_player_stats FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_matches(club_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = club_id
        AND public.actor_can_read_team_resource(club_id, m.team_id)
    )
  );

DROP POLICY IF EXISTS "match_mvp_select" ON public.match_mvp_history;
CREATE POLICY "match_mvp_select" ON public.match_mvp_history FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_matches(club_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = club_id
        AND public.actor_can_read_team_resource(club_id, m.team_id)
    )
  );

DROP POLICY IF EXISTS "match_squad_manage" ON public.match_squad;
CREATE POLICY "match_squad_manage" ON public.match_squad FOR ALL TO authenticated
  USING (
    public.actor_can_manage_matches(club_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, m.team_id)
    )
  )
  WITH CHECK (
    public.actor_can_manage_matches(club_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, m.team_id)
    )
  );

DROP POLICY IF EXISTS "match_lineup_manage" ON public.match_lineup_positions;
CREATE POLICY "match_lineup_manage" ON public.match_lineup_positions FOR ALL TO authenticated
  USING (
    public.actor_can_manage_matches(club_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, m.team_id)
    )
  )
  WITH CHECK (
    public.actor_can_manage_matches(club_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, m.team_id)
    )
  );

DROP POLICY IF EXISTS "match_events_manage" ON public.match_events;
CREATE POLICY "match_events_manage" ON public.match_events FOR ALL TO authenticated
  USING (
    public.actor_can_manage_matches(club_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, m.team_id)
    )
  )
  WITH CHECK (
    public.actor_can_manage_matches(club_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, m.team_id)
    )
  );

DROP POLICY IF EXISTS "match_player_stats_manage" ON public.match_player_stats;
CREATE POLICY "match_player_stats_manage" ON public.match_player_stats FOR ALL TO authenticated
  USING (
    public.actor_can_manage_matches(club_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, m.team_id)
    )
  )
  WITH CHECK (
    public.actor_can_manage_matches(club_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, m.team_id)
    )
  );

DROP POLICY IF EXISTS "match_mvp_manage" ON public.match_mvp_history;
CREATE POLICY "match_mvp_manage" ON public.match_mvp_history FOR ALL TO authenticated
  USING (
    public.actor_can_manage_matches(club_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, m.team_id)
    )
  )
  WITH CHECK (
    public.actor_can_manage_matches(club_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, m.team_id)
    )
  );

DROP POLICY IF EXISTS "training_attendance_manage" ON public.training_attendance;
CREATE POLICY "training_attendance_manage" ON public.training_attendance FOR ALL TO authenticated
  USING (
    public.actor_can_mark_training_attendance(club_id)
    AND EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = training_id AND t.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, t.team_id)
    )
  )
  WITH CHECK (
    public.actor_can_mark_training_attendance(club_id)
    AND EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = training_id AND t.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, t.team_id)
    )
  );

DROP POLICY IF EXISTS "training_availability_manage_staff" ON public.training_availability;
CREATE POLICY "training_availability_manage_staff" ON public.training_availability FOR ALL TO authenticated
  USING (
    public.actor_can_manage_trainings(club_id)
    AND EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = training_id AND t.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, t.team_id)
    )
  )
  WITH CHECK (
    public.actor_can_manage_trainings(club_id)
    AND EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = training_id AND t.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, t.team_id)
    )
  );

DROP POLICY IF EXISTS "training_notes_manage" ON public.training_session_notes;
CREATE POLICY "training_notes_manage" ON public.training_session_notes FOR ALL TO authenticated
  USING (
    public.actor_can_manage_trainings(club_id)
    AND EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = training_id AND t.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, t.team_id)
    )
  )
  WITH CHECK (
    public.actor_can_manage_trainings(club_id)
    AND EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = training_id AND t.club_id = club_id
        AND public.actor_can_manage_team_resource(club_id, t.team_id)
    )
  );

DROP POLICY IF EXISTS "match_mvp_history_select" ON public.match_mvp_history;

-- ---------------------------------------------------------------------------
-- Storage: row-level player assets
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "club_assets_select" ON storage.objects;
CREATE POLICY "club_assets_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND public.storage_is_club_player_asset_path(name)
    AND public.storage_club_id_from_path(name) IN (SELECT public.user_club_ids())
    AND public.actor_can_read_player_row(
      public.storage_club_id_from_path(name),
      public.storage_player_id_from_path(name)
    )
  );

-- ---------------------------------------------------------------------------
-- Performance indexes (ETAP 11.5 audit)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_integration_club_mappings_club
  ON public.integration_club_mappings (club_id);

CREATE INDEX IF NOT EXISTS idx_sync_logs_job
  ON public.sync_logs (sync_job_id);

CREATE INDEX IF NOT EXISTS idx_sync_logs_club_integration
  ON public.sync_logs (club_id, integration_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_log
  ON public.sync_conflicts (sync_log_id);

CREATE INDEX IF NOT EXISTS idx_player_coach_notes_player
  ON public.player_coach_notes (club_id, player_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_session_notes_training
  ON public.training_session_notes (club_id, training_id);

CREATE INDEX IF NOT EXISTS idx_club_notifications_user
  ON public.club_notifications (club_id, user_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_club_memberships_team
  ON public.club_memberships (club_id, team_id)
  WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_player_stats_club_season
  ON public.player_stats (club_id, season);

CREATE INDEX IF NOT EXISTS idx_match_squad_player
  ON public.match_squad (club_id, player_id);

-- ---------------------------------------------------------------------------
-- GRANTs
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.coach_team_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_is_coach_team_scoped(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_team_resource(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_team_resource(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_player_row(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_player_row(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_player_id_from_path(TEXT) TO authenticated;
