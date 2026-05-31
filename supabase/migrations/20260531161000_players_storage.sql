-- ETAP 2: Supabase Storage dla zdjęć i dokumentów zawodników

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'club-assets',
  'club-assets',
  FALSE,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]::TEXT[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.storage_club_id_from_path(object_name TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 1), '')::UUID;
$$;

CREATE POLICY "club_assets_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND public.storage_club_id_from_path(name) IN (SELECT public.user_club_ids())
    AND public.actor_can_read_players(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets'
    AND public.actor_can_manage_players(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND public.actor_can_manage_players(public.storage_club_id_from_path(name))
  )
  WITH CHECK (
    bucket_id = 'club-assets'
    AND public.actor_can_manage_players(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND public.actor_can_manage_players(public.storage_club_id_from_path(name))
  );
