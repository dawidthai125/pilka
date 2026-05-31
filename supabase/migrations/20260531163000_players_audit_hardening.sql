-- ETAP 2 audit: spójność relacji, numer koszulki, polityki storage

ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_jersey_unique_per_team;

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_jersey_unique_per_team
  ON public.players (club_id, team_id, jersey_number)
  WHERE team_id IS NOT NULL AND jersey_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_player_team_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = NEW.team_id
      AND t.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'team_id does not belong to club_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_player_child_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.id = NEW.player_id
      AND p.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to club_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.storage_is_club_player_asset_path(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT object_name ~ (
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/players/'
    || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
  )
  AND position('..' IN object_name) = 0;
$$;

DROP TRIGGER IF EXISTS players_enforce_team_club ON public.players;
CREATE TRIGGER players_enforce_team_club
  BEFORE INSERT OR UPDATE OF team_id, club_id ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_player_team_club_consistency();

DROP TRIGGER IF EXISTS player_documents_enforce_club ON public.player_documents;
CREATE TRIGGER player_documents_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_player_child_club_consistency();

DROP TRIGGER IF EXISTS player_stats_enforce_club ON public.player_stats;
CREATE TRIGGER player_stats_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_player_child_club_consistency();

DROP TRIGGER IF EXISTS player_history_enforce_club ON public.player_club_history;
CREATE TRIGGER player_history_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_club_history
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_player_child_club_consistency();

DROP TRIGGER IF EXISTS player_injuries_enforce_club ON public.player_injuries;
CREATE TRIGGER player_injuries_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_injuries
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_player_child_club_consistency();

DROP TRIGGER IF EXISTS player_coach_notes_enforce_club ON public.player_coach_notes;
CREATE TRIGGER player_coach_notes_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_coach_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_player_child_club_consistency();

DROP POLICY IF EXISTS "club_assets_select" ON storage.objects;
DROP POLICY IF EXISTS "club_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "club_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "club_assets_delete" ON storage.objects;

CREATE POLICY "club_assets_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND public.storage_is_club_player_asset_path(name)
    AND public.storage_club_id_from_path(name) IN (SELECT public.user_club_ids())
    AND public.actor_can_read_players(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets'
    AND public.storage_is_club_player_asset_path(name)
    AND public.actor_can_manage_players(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND public.storage_is_club_player_asset_path(name)
    AND public.actor_can_manage_players(public.storage_club_id_from_path(name))
  )
  WITH CHECK (
    bucket_id = 'club-assets'
    AND public.storage_is_club_player_asset_path(name)
    AND public.actor_can_manage_players(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND public.storage_is_club_player_asset_path(name)
    AND public.actor_can_manage_players(public.storage_club_id_from_path(name))
  );

GRANT EXECUTE ON FUNCTION public.storage_is_club_player_asset_path(TEXT) TO authenticated;
