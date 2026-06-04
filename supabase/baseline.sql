-- FC OS Database Baseline
-- Sprint 17.5b — consolidated target schema (repaired ordering)
-- Generated: 2026-06-03
--
-- Repairs: league_player_registry order, ai_report_categories seed strip, superseded RPC excluded
-- Source migrations: 68 of 105 historical files
-- Apply on empty Supabase project BEFORE bootstrap-club.mjs
--
-- DO NOT apply to existing production without migration strategy.


-- =============================================================================
-- Source: 20260531120000_foundation.sql
-- =============================================================================

-- Football Club OS — ETAP 1: foundation schema (multi-tenant + RBAC)
-- Migration: 20260531120000_foundation

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE public.club_role AS ENUM (
  'owner',
  'president',
  'sports_director',
  'coach',
  'player',
  'parent',
  'sponsor'
);

CREATE TYPE public.membership_status AS ENUM (
  'active',
  'invited',
  'suspended',
  'archived'
);

CREATE TYPE public.team_category AS ENUM (
  'seniors',
  'u18',
  'u12',
  'u10',
  'other'
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  locale TEXT NOT NULL DEFAULT 'pl',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  public_name TEXT NOT NULL,
  official_name TEXT,
  association TEXT,
  competition_level TEXT,
  country TEXT NOT NULL DEFAULT 'PL',
  voivodeship TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category public.team_category NOT NULL,
  season TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, name, category)
);

CREATE TABLE public.club_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role public.club_role NOT NULL,
  status public.membership_status NOT NULL DEFAULT 'invited',
  team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, user_id, role)
);

CREATE INDEX idx_club_memberships_club_id ON public.club_memberships (club_id);
CREATE INDEX idx_club_memberships_user_id ON public.club_memberships (user_id);
CREATE INDEX idx_teams_club_id ON public.teams (club_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER clubs_set_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER teams_set_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER club_memberships_set_updated_at
  BEFORE UPDATE ON public.club_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
-- [stripped: public INSERT block]
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.user_club_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT club_id
  FROM public.club_memberships
  WHERE user_id = auth.uid()
    AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.user_has_club_role(
  p_club_id UUID,
  p_roles public.club_role[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_memberships
    WHERE club_id = p_club_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = ANY (p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_club_permission(
  p_club_id UUID,
  p_roles public.club_role[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_club_role(p_club_id, p_roles);
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_select_club_managers"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.club_memberships cm1
      JOIN public.club_memberships cm2 ON cm1.club_id = cm2.club_id
      WHERE cm1.user_id = auth.uid()
        AND cm1.status = 'active'
        AND cm1.role = ANY (ARRAY['owner', 'president', 'sports_director']::public.club_role[])
        AND cm2.user_id = profiles.id
    )
  );

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "clubs_select_member"
  ON public.clubs FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_club_ids()));

CREATE POLICY "clubs_manage_leadership"
  ON public.clubs FOR UPDATE TO authenticated
  USING (public.user_has_club_role(id, ARRAY['owner', 'president', 'sports_director']::public.club_role[]))
  WITH CHECK (public.user_has_club_role(id, ARRAY['owner', 'president', 'sports_director']::public.club_role[]));

CREATE POLICY "teams_select_member"
  ON public.teams FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "teams_manage_staff"
  ON public.teams FOR ALL TO authenticated
  USING (public.user_has_club_role(club_id, ARRAY['owner', 'president', 'sports_director', 'coach']::public.club_role[]))
  WITH CHECK (public.user_has_club_role(club_id, ARRAY['owner', 'president', 'sports_director', 'coach']::public.club_role[]));

CREATE POLICY "memberships_select_own_or_leadership"
  ON public.club_memberships FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.user_has_club_role(club_id, ARRAY['owner', 'president', 'sports_director', 'coach']::public.club_role[])
  );

CREATE POLICY "memberships_manage_leadership"
  ON public.club_memberships FOR ALL TO authenticated
  USING (public.user_has_club_role(club_id, ARRAY['owner', 'president', 'sports_director']::public.club_role[]))
  WITH CHECK (public.user_has_club_role(club_id, ARRAY['owner', 'president', 'sports_director']::public.club_role[]));

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;



-- =============================================================================
-- Source: 20260531140000_security_hardening.sql
-- =============================================================================

-- Security hardening: least-privilege GRANTs, role assignment guards, column protection

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

CREATE OR REPLACE FUNCTION public.actor_is_owner(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_club_role(p_club_id, ARRAY['owner']::public.club_role[]);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_assign_role(
  p_club_id UUID,
  p_target_role public.club_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.actor_is_owner(p_club_id) THEN
    RETURN TRUE;
  END IF;

  IF p_target_role = 'owner' THEN
    RETURN FALSE;
  END IF;

  RETURN public.user_has_club_role(
    p_club_id,
    ARRAY['president', 'sports_director']::public.club_role[]
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot modify protected profile columns';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_protect_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_columns();

CREATE OR REPLACE FUNCTION public.protect_club_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.slug IS DISTINCT FROM OLD.slug
    OR NEW.country IS DISTINCT FROM OLD.country
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.settings IS DISTINCT FROM OLD.settings
  THEN
    RAISE EXCEPTION 'Cannot modify protected club columns';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER clubs_protect_columns
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_club_columns();

DROP POLICY IF EXISTS "memberships_manage_leadership" ON public.club_memberships;

CREATE POLICY "memberships_insert_leadership"
  ON public.club_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.actor_can_assign_role(club_id, role)
    AND public.user_has_club_role(club_id, ARRAY['owner', 'president', 'sports_director']::public.club_role[])
  );

CREATE POLICY "memberships_update_leadership"
  ON public.club_memberships
  FOR UPDATE
  TO authenticated
  USING (
    public.user_has_club_role(club_id, ARRAY['owner', 'president', 'sports_director']::public.club_role[])
  )
  WITH CHECK (
    public.actor_can_assign_role(club_id, role)
    AND public.user_has_club_role(club_id, ARRAY['owner', 'president', 'sports_director']::public.club_role[])
  );

CREATE POLICY "memberships_delete_leadership"
  ON public.club_memberships
  FOR DELETE
  TO authenticated
  USING (
    public.actor_is_owner(club_id)
    OR (
      public.user_has_club_role(club_id, ARRAY['president', 'sports_director']::public.club_role[])
      AND role <> 'owner'
    )
  );

DROP FUNCTION IF EXISTS public.user_has_club_permission(UUID, public.club_role[]);



-- =============================================================================
-- Source: 20260531150000_club_name_model.sql
-- =============================================================================

-- Model nazw klubu: public_name (branding) + official_name (licencja / dokumenty).
-- Zmiana nazwy oficjalnej w przyszłości = UPDATE official_name; slug i public_name pozostają stabilne.

COMMENT ON COLUMN public.clubs.public_name IS
  'Nazwa publiczna (branding) — UI, nawigacja, komunikacja z użytkownikami.';

COMMENT ON COLUMN public.clubs.official_name IS
  'Nazwa oficjalna — licencja, protokoły, zgłoszenia do związku. Edytowalna bez zmiany schematu.';

-- [stripped: UPDATE]

ALTER TABLE public.clubs
  ALTER COLUMN official_name SET NOT NULL;



-- =============================================================================
-- Source: 20260531160000_players_module.sql
-- =============================================================================

-- ETAP 2: Moduł zawodników — schemat, funkcje pomocnicze, RLS

CREATE TYPE public.player_status AS ENUM (
  'active',
  'injured',
  'suspended',
  'inactive'
);

CREATE TYPE public.player_position AS ENUM (
  'goalkeeper',
  'defender',
  'midfielder',
  'forward'
);

CREATE TYPE public.dominant_foot AS ENUM (
  'left',
  'right',
  'both'
);

CREATE TYPE public.player_document_type AS ENUM (
  'medical_exam',
  'parent_consent',
  'club_declaration',
  'insurance',
  'document_photo',
  'other'
);

CREATE TYPE public.player_history_event_type AS ENUM (
  'transfer_in',
  'transfer_out',
  'previous_club',
  'position_change',
  'jersey_number_change'
);

CREATE TYPE public.coach_note_type AS ENUM (
  'observation',
  'progress',
  'health',
  'training_goal'
);

CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  photo_url TEXT,
  date_of_birth DATE NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  jersey_number INTEGER,
  primary_position public.player_position,
  secondary_position public.player_position,
  dominant_foot public.dominant_foot,
  height_cm INTEGER,
  weight_kg NUMERIC(5, 2),
  status public.player_status NOT NULL DEFAULT 'active',
  joined_at DATE,
  left_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT players_jersey_unique_per_team UNIQUE (club_id, team_id, jersey_number),
  CONSTRAINT players_height_check CHECK (height_cm IS NULL OR height_cm BETWEEN 100 AND 250),
  CONSTRAINT players_weight_check CHECK (weight_kg IS NULL OR weight_kg BETWEEN 30 AND 200)
);

CREATE INDEX idx_players_club_id ON public.players (club_id);
CREATE INDEX idx_players_team_id ON public.players (team_id);
CREATE INDEX idx_players_status ON public.players (club_id, status);
CREATE INDEX idx_players_name ON public.players (club_id, last_name, first_name);

CREATE TABLE public.player_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  document_type public.player_document_type NOT NULL,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  expires_at DATE,
  notes TEXT,
  uploaded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_player_documents_player ON public.player_documents (player_id);
CREATE INDEX idx_player_documents_expires ON public.player_documents (club_id, expires_at);

CREATE TABLE public.player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  matches_played INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  yellow_cards INTEGER NOT NULL DEFAULT 0,
  red_cards INTEGER NOT NULL DEFAULT 0,
  minutes_played INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT player_stats_unique_season UNIQUE (player_id, season)
);

CREATE INDEX idx_player_stats_player ON public.player_stats (player_id);

CREATE TABLE public.player_club_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  event_type public.player_history_event_type NOT NULL,
  event_date DATE NOT NULL,
  description TEXT,
  previous_value TEXT,
  new_value TEXT,
  related_club_name TEXT,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_player_club_history_player ON public.player_club_history (player_id, event_date DESC);

CREATE TABLE public.player_injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  injury_date DATE NOT NULL,
  recovery_date DATE,
  description TEXT NOT NULL,
  severity TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_player_injuries_player ON public.player_injuries (player_id, injury_date DESC);

CREATE TABLE public.player_coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  note_type public.coach_note_type NOT NULL DEFAULT 'observation',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_player_coach_notes_player ON public.player_coach_notes (player_id, created_at DESC);

CREATE TRIGGER players_set_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER player_documents_set_updated_at
  BEFORE UPDATE ON public.player_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER player_stats_set_updated_at
  BEFORE UPDATE ON public.player_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER player_injuries_set_updated_at
  BEFORE UPDATE ON public.player_injuries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER player_coach_notes_set_updated_at
  BEFORE UPDATE ON public.player_coach_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Coaching staff: owner, president, sports_director, coach
CREATE OR REPLACE FUNCTION public.actor_is_coaching_staff(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_club_role(
    p_club_id,
    ARRAY['owner', 'president', 'sports_director', 'coach']::public.club_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_players(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.actor_is_coaching_staff(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_players(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_club_role(
    p_club_id,
    ARRAY[
      'owner', 'president', 'sports_director', 'coach',
      'player', 'parent'
    ]::public.club_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.get_document_validity_status(p_expires_at DATE)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_expires_at IS NULL THEN 'valid'
    WHEN p_expires_at < CURRENT_DATE THEN 'expired'
    WHEN p_expires_at <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END;
$$;

CREATE OR REPLACE FUNCTION public.log_player_history_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.primary_position IS DISTINCT FROM OLD.primary_position THEN
-- [stripped: public INSERT block]
  END IF;

  IF NEW.jersey_number IS DISTINCT FROM OLD.jersey_number THEN
-- [stripped: public INSERT block]
  END IF;

  IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
-- [stripped: public INSERT block]
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER players_log_history
  AFTER UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.log_player_history_on_update();

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_club_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_coach_notes ENABLE ROW LEVEL SECURITY;

-- players
CREATE POLICY "players_select"
  ON public.players FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_players(club_id));

CREATE POLICY "players_insert"
  ON public.players FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_manage_players(club_id));

CREATE POLICY "players_update"
  ON public.players FOR UPDATE TO authenticated
  USING (public.actor_can_manage_players(club_id))
  WITH CHECK (public.actor_can_manage_players(club_id));

CREATE POLICY "players_delete"
  ON public.players FOR DELETE TO authenticated
  USING (public.actor_can_manage_players(club_id));

-- player_documents
CREATE POLICY "player_documents_select"
  ON public.player_documents FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_players(club_id));

CREATE POLICY "player_documents_manage"
  ON public.player_documents FOR ALL TO authenticated
  USING (public.actor_can_manage_players(club_id))
  WITH CHECK (public.actor_can_manage_players(club_id));

-- player_stats
CREATE POLICY "player_stats_select"
  ON public.player_stats FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_players(club_id));

CREATE POLICY "player_stats_manage"
  ON public.player_stats FOR ALL TO authenticated
  USING (public.actor_can_manage_players(club_id))
  WITH CHECK (public.actor_can_manage_players(club_id));

-- player_club_history
CREATE POLICY "player_history_select"
  ON public.player_club_history FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_players(club_id));

CREATE POLICY "player_history_manage"
  ON public.player_club_history FOR ALL TO authenticated
  USING (public.actor_can_manage_players(club_id))
  WITH CHECK (public.actor_can_manage_players(club_id));

-- player_injuries
CREATE POLICY "player_injuries_select"
  ON public.player_injuries FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_players(club_id));

CREATE POLICY "player_injuries_manage"
  ON public.player_injuries FOR ALL TO authenticated
  USING (public.actor_can_manage_players(club_id))
  WITH CHECK (public.actor_can_manage_players(club_id));

-- player_coach_notes — tylko sztab szkoleniowy
CREATE POLICY "player_coach_notes_select"
  ON public.player_coach_notes FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_is_coaching_staff(club_id));

CREATE POLICY "player_coach_notes_manage"
  ON public.player_coach_notes FOR ALL TO authenticated
  USING (public.actor_is_coaching_staff(club_id))
  WITH CHECK (public.actor_is_coaching_staff(club_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_club_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_injuries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_coach_notes TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_is_coaching_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_players(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_players(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_document_validity_status(DATE) TO authenticated;



-- =============================================================================
-- Source: 20260531161000_players_storage.sql
-- =============================================================================

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



-- =============================================================================
-- Source: 20260531163000_players_audit_hardening.sql
-- =============================================================================

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



-- =============================================================================
-- Source: 20260531170000_trainings_module.sql
-- =============================================================================

-- ETAP 3: Moduł treningów — schemat, funkcje RLS, powiadomienia

CREATE TYPE public.training_status AS ENUM (
  'planned',
  'completed',
  'cancelled'
);

CREATE TYPE public.availability_status AS ENUM (
  'present',
  'absent',
  'unknown'
);

CREATE TYPE public.absence_reason AS ENUM (
  'work',
  'school',
  'injury',
  'travel',
  'illness',
  'other'
);

CREATE TYPE public.attendance_status AS ENUM (
  'present',
  'absent',
  'late',
  'excused'
);

CREATE TYPE public.training_reminder_type AS ENUM (
  'hours_48',
  'hours_24',
  'hours_3'
);

CREATE TABLE public.trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  training_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  description TEXT,
  coach_user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  status public.training_status NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT trainings_time_order CHECK (end_time > start_time)
);

CREATE INDEX idx_trainings_club_date ON public.trainings (club_id, training_date);
CREATE INDEX idx_trainings_team_date ON public.trainings (team_id, training_date);
CREATE INDEX idx_trainings_coach ON public.trainings (coach_user_id);
CREATE INDEX idx_trainings_status ON public.trainings (club_id, status);

CREATE TABLE public.training_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  status public.availability_status NOT NULL DEFAULT 'unknown',
  absence_reason public.absence_reason,
  notes TEXT,
  responded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT training_availability_unique UNIQUE (training_id, player_id),
  CONSTRAINT training_availability_reason_check CHECK (
    status <> 'absent' OR absence_reason IS NOT NULL
  )
);

CREATE INDEX idx_training_availability_training ON public.training_availability (training_id);
CREATE INDEX idx_training_availability_player ON public.training_availability (player_id);

CREATE TABLE public.training_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL,
  notes TEXT,
  marked_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT training_attendance_unique UNIQUE (training_id, player_id)
);

CREATE INDEX idx_training_attendance_training ON public.training_attendance (training_id);
CREATE INDEX idx_training_attendance_player ON public.training_attendance (player_id);

CREATE TABLE public.training_session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings (id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_training_session_notes_training ON public.training_session_notes (training_id);

CREATE TABLE public.club_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  training_id UUID REFERENCES public.trainings (id) ON DELETE CASCADE,
  reminder_type public.training_reminder_type,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  read_at TIMESTAMPTZ,
  delivery_channels JSONB NOT NULL DEFAULT '["in_app"]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_club_notifications_user ON public.club_notifications (user_id, scheduled_at DESC);
CREATE INDEX idx_club_notifications_unread ON public.club_notifications (user_id, read_at)
  WHERE read_at IS NULL;
CREATE UNIQUE INDEX idx_club_notifications_dedup
  ON public.club_notifications (user_id, training_id, reminder_type)
  WHERE training_id IS NOT NULL AND reminder_type IS NOT NULL;

CREATE TRIGGER trainings_set_updated_at
  BEFORE UPDATE ON public.trainings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER training_availability_set_updated_at
  BEFORE UPDATE ON public.training_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER training_attendance_set_updated_at
  BEFORE UPDATE ON public.training_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER training_session_notes_set_updated_at
  BEFORE UPDATE ON public.training_session_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.actor_can_read_trainings(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_club_role(
    p_club_id,
    ARRAY[
      'owner', 'president', 'sports_director', 'coach',
      'player', 'parent'
    ]::public.club_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_trainings(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.actor_is_coaching_staff(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_mark_training_attendance(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.actor_is_coaching_staff(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_set_training_availability(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_club_role(
    p_club_id,
    ARRAY[
      'owner', 'president', 'sports_director', 'coach',
      'player', 'parent'
    ]::public.club_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.player_id_for_user(p_club_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.players p
  JOIN public.profiles pr ON pr.id = p_user_id
  WHERE p.club_id = p_club_id
    AND p.email IS NOT NULL
    AND lower(p.email) = lower(pr.email)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.enforce_training_team_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = NEW.team_id AND t.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'team_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_training_child_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.trainings tr
    WHERE tr.id = NEW.training_id AND tr.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'training_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_training_availability_player_club()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trainings_enforce_team_club ON public.trainings;
CREATE TRIGGER trainings_enforce_team_club
  BEFORE INSERT OR UPDATE OF team_id, club_id ON public.trainings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_team_club_consistency();

DROP TRIGGER IF EXISTS training_availability_enforce_club ON public.training_availability;
CREATE TRIGGER training_availability_enforce_club
  BEFORE INSERT OR UPDATE ON public.training_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_child_club_consistency();

DROP TRIGGER IF EXISTS training_availability_enforce_player ON public.training_availability;
CREATE TRIGGER training_availability_enforce_player
  BEFORE INSERT OR UPDATE ON public.training_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_availability_player_club();

DROP TRIGGER IF EXISTS training_attendance_enforce_club ON public.training_attendance;
CREATE TRIGGER training_attendance_enforce_club
  BEFORE INSERT OR UPDATE ON public.training_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_child_club_consistency();

DROP TRIGGER IF EXISTS training_attendance_enforce_player ON public.training_attendance;
CREATE TRIGGER training_attendance_enforce_player
  BEFORE INSERT OR UPDATE ON public.training_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_availability_player_club();

DROP TRIGGER IF EXISTS training_notes_enforce_club ON public.training_session_notes;
CREATE TRIGGER training_notes_enforce_club
  BEFORE INSERT OR UPDATE ON public.training_session_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_child_club_consistency();

ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_notifications ENABLE ROW LEVEL SECURITY;

-- trainings
CREATE POLICY "trainings_select"
  ON public.trainings FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_trainings(club_id));

CREATE POLICY "trainings_manage"
  ON public.trainings FOR ALL TO authenticated
  USING (public.actor_can_manage_trainings(club_id))
  WITH CHECK (public.actor_can_manage_trainings(club_id));

-- availability
CREATE POLICY "training_availability_select"
  ON public.training_availability FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_trainings(club_id));

CREATE POLICY "training_availability_manage_staff"
  ON public.training_availability FOR ALL TO authenticated
  USING (public.actor_can_manage_trainings(club_id))
  WITH CHECK (public.actor_can_manage_trainings(club_id));

CREATE POLICY "training_availability_manage_self"
  ON public.training_availability FOR INSERT TO authenticated
  WITH CHECK (
    club_id IN (SELECT public.user_club_ids())
    AND player_id = public.player_id_for_user(club_id, auth.uid())
    AND public.actor_can_set_training_availability(club_id)
  );

CREATE POLICY "training_availability_update_self"
  ON public.training_availability FOR UPDATE TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND player_id = public.player_id_for_user(club_id, auth.uid())
    AND public.actor_can_set_training_availability(club_id)
  )
  WITH CHECK (
    club_id IN (SELECT public.user_club_ids())
    AND player_id = public.player_id_for_user(club_id, auth.uid())
    AND public.actor_can_set_training_availability(club_id)
  );

-- attendance
CREATE POLICY "training_attendance_select"
  ON public.training_attendance FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_trainings(club_id));

CREATE POLICY "training_attendance_manage"
  ON public.training_attendance FOR ALL TO authenticated
  USING (public.actor_can_mark_training_attendance(club_id))
  WITH CHECK (public.actor_can_mark_training_attendance(club_id));

-- session notes
CREATE POLICY "training_notes_select"
  ON public.training_session_notes FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_trainings(club_id));

CREATE POLICY "training_notes_manage"
  ON public.training_session_notes FOR ALL TO authenticated
  USING (public.actor_can_manage_trainings(club_id))
  WITH CHECK (public.actor_can_manage_trainings(club_id));

-- notifications — tylko własne
CREATE POLICY "club_notifications_select_own"
  ON public.club_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "club_notifications_update_own"
  ON public.club_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "club_notifications_insert_staff"
  ON public.club_notifications FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_manage_trainings(club_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trainings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_session_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.club_notifications TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_read_trainings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_trainings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_mark_training_attendance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_set_training_availability(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_id_for_user(UUID, UUID) TO authenticated;



-- =============================================================================
-- Source: 20260531172000_trainings_audit_hardening.sql
-- =============================================================================

-- ETAP 3 audit: spójność relacji treningów, RLS powiadomień, indeksy

CREATE OR REPLACE FUNCTION public.enforce_training_player_on_team()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  SELECT tr.team_id INTO v_team_id
  FROM public.trainings tr
  WHERE tr.id = NEW.training_id
    AND tr.club_id = NEW.club_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'training_id does not belong to club_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.id = NEW.player_id
      AND p.club_id = NEW.club_id
      AND p.team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to training team';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_training_note_player_on_team()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  IF NEW.player_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT tr.team_id INTO v_team_id
  FROM public.trainings tr
  WHERE tr.id = NEW.training_id
    AND tr.club_id = NEW.club_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'training_id does not belong to club_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.id = NEW.player_id
      AND p.club_id = NEW.club_id
      AND p.team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to training team';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_training_availability_reason()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'absent' THEN
    NEW.absence_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS training_availability_enforce_team ON public.training_availability;
CREATE TRIGGER training_availability_enforce_team
  BEFORE INSERT OR UPDATE ON public.training_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_player_on_team();

DROP TRIGGER IF EXISTS training_attendance_enforce_team ON public.training_attendance;
CREATE TRIGGER training_attendance_enforce_team
  BEFORE INSERT OR UPDATE ON public.training_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_player_on_team();

DROP TRIGGER IF EXISTS training_notes_enforce_player_team ON public.training_session_notes;
CREATE TRIGGER training_notes_enforce_player_team
  BEFORE INSERT OR UPDATE OF player_id, training_id, club_id ON public.training_session_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_note_player_on_team();

DROP TRIGGER IF EXISTS training_availability_enforce_reason ON public.training_availability;
CREATE TRIGGER training_availability_enforce_reason
  BEFORE INSERT OR UPDATE OF status, absence_reason ON public.training_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_availability_reason();

CREATE INDEX IF NOT EXISTS idx_training_attendance_club_training
  ON public.training_attendance (club_id, training_id);

CREATE INDEX IF NOT EXISTS idx_training_availability_club_training
  ON public.training_availability (club_id, training_id);

CREATE INDEX IF NOT EXISTS idx_trainings_club_status_date
  ON public.trainings (club_id, status, training_date);

DROP POLICY IF EXISTS "club_notifications_update_own" ON public.club_notifications;
CREATE POLICY "club_notifications_update_own"
  ON public.club_notifications FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND club_id IN (SELECT public.user_club_ids())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND club_id IN (SELECT public.user_club_ids())
  );



-- =============================================================================
-- Source: 20260531180000_matches_module.sql
-- =============================================================================

-- ETAP 4: Moduł meczów — schemat, funkcje RLS

CREATE TYPE public.match_status AS ENUM (
  'planned',
  'in_progress',
  'completed',
  'cancelled',
  'postponed'
);

CREATE TYPE public.match_squad_role AS ENUM (
  'squad',
  'starter',
  'substitute'
);

CREATE TYPE public.match_event_type AS ENUM (
  'goal',
  'assist',
  'yellow_card',
  'red_card',
  'substitution',
  'injury'
);

CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  competition TEXT NOT NULL,
  season TEXT NOT NULL,
  round_number INTEGER,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL,
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  stadium TEXT,
  stadium_address TEXT,
  status public.match_status NOT NULL DEFAULT 'planned',
  home_score INTEGER,
  away_score INTEGER,
  formation TEXT,
  mvp_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  coach_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT matches_score_check CHECK (
    (home_score IS NULL AND away_score IS NULL)
    OR (home_score IS NOT NULL AND away_score IS NOT NULL)
  )
);

CREATE INDEX idx_matches_club_date ON public.matches (club_id, match_date);
CREATE INDEX idx_matches_team_date ON public.matches (team_id, match_date);
CREATE INDEX idx_matches_club_season ON public.matches (club_id, season, competition);
CREATE INDEX idx_matches_status ON public.matches (club_id, status);

CREATE TABLE public.match_squad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  squad_role public.match_squad_role NOT NULL DEFAULT 'squad',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT match_squad_unique UNIQUE (match_id, player_id)
);

CREATE INDEX idx_match_squad_match ON public.match_squad (match_id);

CREATE TABLE public.match_lineup_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  slot_code TEXT NOT NULL,
  pos_x NUMERIC(5, 2) NOT NULL CHECK (pos_x >= 0 AND pos_x <= 100),
  pos_y NUMERIC(5, 2) NOT NULL CHECK (pos_y >= 0 AND pos_y <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT match_lineup_unique UNIQUE (match_id, player_id)
);

CREATE INDEX idx_match_lineup_match ON public.match_lineup_positions (match_id);

CREATE TABLE public.match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  event_type public.match_event_type NOT NULL,
  minute INTEGER NOT NULL CHECK (minute >= 0 AND minute <= 130),
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  related_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_match_events_match ON public.match_events (match_id, minute);

CREATE TABLE public.match_player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  minutes_played INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  yellow_cards INTEGER NOT NULL DEFAULT 0,
  red_cards INTEGER NOT NULL DEFAULT 0,
  is_starter BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT match_player_stats_unique UNIQUE (match_id, player_id)
);

CREATE INDEX idx_match_player_stats_player ON public.match_player_stats (player_id);
CREATE INDEX idx_match_player_stats_match ON public.match_player_stats (match_id);

CREATE TABLE public.match_mvp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  selected_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT match_mvp_unique UNIQUE (match_id)
);

CREATE TABLE public.league_table_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  competition TEXT NOT NULL,
  season TEXT NOT NULL,
  team_name TEXT NOT NULL,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  is_own_club BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT league_table_unique UNIQUE (club_id, competition, season, team_name)
);

CREATE INDEX idx_league_table_lookup ON public.league_table_entries (club_id, competition, season);

CREATE TRIGGER matches_set_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER match_squad_set_updated_at
  BEFORE UPDATE ON public.match_squad
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER match_lineup_set_updated_at
  BEFORE UPDATE ON public.match_lineup_positions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER match_player_stats_set_updated_at
  BEFORE UPDATE ON public.match_player_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER league_table_set_updated_at
  BEFORE UPDATE ON public.league_table_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.actor_can_read_matches(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.user_has_club_role(
    p_club_id,
    ARRAY['owner','president','sports_director','coach','player','parent']::public.club_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_matches(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_is_coaching_staff(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.enforce_match_team_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.teams t WHERE t.id = NEW.team_id AND t.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'team_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_match_child_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.matches m WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'match_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_match_squad_player_team()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_team_id UUID;
BEGIN
  SELECT m.team_id INTO v_team_id FROM public.matches m
  WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id AND p.team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to match team';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER matches_enforce_team_club
  BEFORE INSERT OR UPDATE OF team_id, club_id ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_team_club_consistency();

CREATE TRIGGER match_squad_enforce_club
  BEFORE INSERT OR UPDATE ON public.match_squad
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_child_club_consistency();

CREATE TRIGGER match_squad_enforce_player_team
  BEFORE INSERT OR UPDATE ON public.match_squad
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_squad_player_team();

CREATE TRIGGER match_lineup_enforce_club
  BEFORE INSERT OR UPDATE ON public.match_lineup_positions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_child_club_consistency();

CREATE TRIGGER match_lineup_enforce_player_team
  BEFORE INSERT OR UPDATE ON public.match_lineup_positions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_squad_player_team();

CREATE TRIGGER match_events_enforce_club
  BEFORE INSERT OR UPDATE ON public.match_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_child_club_consistency();

CREATE TRIGGER match_player_stats_enforce_club
  BEFORE INSERT OR UPDATE ON public.match_player_stats
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_child_club_consistency();

CREATE TRIGGER match_mvp_enforce_club
  BEFORE INSERT OR UPDATE ON public.match_mvp_history
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_child_club_consistency();

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_squad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_lineup_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_mvp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_table_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select" ON public.matches FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_matches(club_id));

CREATE POLICY "matches_manage" ON public.matches FOR ALL TO authenticated
  USING (public.actor_can_manage_matches(club_id))
  WITH CHECK (public.actor_can_manage_matches(club_id));

CREATE POLICY "match_squad_select" ON public.match_squad FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_matches(club_id));

CREATE POLICY "match_squad_manage" ON public.match_squad FOR ALL TO authenticated
  USING (public.actor_can_manage_matches(club_id))
  WITH CHECK (public.actor_can_manage_matches(club_id));

CREATE POLICY "match_lineup_select" ON public.match_lineup_positions FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_matches(club_id));

CREATE POLICY "match_lineup_manage" ON public.match_lineup_positions FOR ALL TO authenticated
  USING (public.actor_can_manage_matches(club_id))
  WITH CHECK (public.actor_can_manage_matches(club_id));

CREATE POLICY "match_events_select" ON public.match_events FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_matches(club_id));

CREATE POLICY "match_events_manage" ON public.match_events FOR ALL TO authenticated
  USING (public.actor_can_manage_matches(club_id))
  WITH CHECK (public.actor_can_manage_matches(club_id));

CREATE POLICY "match_player_stats_select" ON public.match_player_stats FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_matches(club_id));

CREATE POLICY "match_player_stats_manage" ON public.match_player_stats FOR ALL TO authenticated
  USING (public.actor_can_manage_matches(club_id))
  WITH CHECK (public.actor_can_manage_matches(club_id));

CREATE POLICY "match_mvp_select" ON public.match_mvp_history FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_matches(club_id));

CREATE POLICY "match_mvp_manage" ON public.match_mvp_history FOR ALL TO authenticated
  USING (public.actor_can_manage_matches(club_id))
  WITH CHECK (public.actor_can_manage_matches(club_id));

CREATE POLICY "league_table_select" ON public.league_table_entries FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_matches(club_id));

CREATE POLICY "league_table_manage" ON public.league_table_entries FOR ALL TO authenticated
  USING (public.actor_can_manage_matches(club_id))
  WITH CHECK (public.actor_can_manage_matches(club_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_squad TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_lineup_positions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_player_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_mvp_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_table_entries TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_read_matches(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_matches(UUID) TO authenticated;



-- =============================================================================
-- Source: 20260531182000_matches_audit_hardening.sql
-- =============================================================================

-- ETAP 4 audit: spójność MVP z meczem, indeksy wydajności

CREATE OR REPLACE FUNCTION public.enforce_match_mvp_player_team()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_team_id UUID;
BEGIN
  SELECT m.team_id INTO v_team_id FROM public.matches m
  WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id AND p.team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'mvp player_id does not belong to match team';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_mvp_enforce_player_team ON public.match_mvp_history;
CREATE TRIGGER match_mvp_enforce_player_team
  BEFORE INSERT OR UPDATE ON public.match_mvp_history
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_mvp_player_team();

CREATE OR REPLACE FUNCTION public.enforce_match_mvp_on_matches()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.mvp_player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.mvp_player_id AND p.club_id = NEW.club_id AND p.team_id = NEW.team_id
  ) THEN
    RAISE EXCEPTION 'mvp_player_id does not belong to match team';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_enforce_mvp_player ON public.matches;
CREATE TRIGGER matches_enforce_mvp_player
  BEFORE INSERT OR UPDATE OF mvp_player_id ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_mvp_on_matches();

CREATE INDEX IF NOT EXISTS idx_match_player_stats_club_player
  ON public.match_player_stats (club_id, player_id);

CREATE INDEX IF NOT EXISTS idx_matches_club_completed_date
  ON public.matches (club_id, match_date DESC)
  WHERE status = 'completed';



-- =============================================================================
-- Source: 20260531183000_matches_audit_hardening.sql
-- =============================================================================

-- ETAP 4 audit (2): spójność zawodników w wydarzeniach/statystykach, walidacja tabeli

CREATE OR REPLACE FUNCTION public.enforce_match_event_players_team()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_team_id UUID;
BEGIN
  SELECT m.team_id INTO v_team_id FROM public.matches m
  WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id;

  IF NEW.player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id AND p.team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'event player_id does not belong to match team';
  END IF;

  IF NEW.related_player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.related_player_id AND p.club_id = NEW.club_id AND p.team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'event related_player_id does not belong to match team';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_events_enforce_players_team ON public.match_events;
CREATE TRIGGER match_events_enforce_players_team
  BEFORE INSERT OR UPDATE ON public.match_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_event_players_team();

DROP TRIGGER IF EXISTS match_player_stats_enforce_player_team ON public.match_player_stats;
CREATE TRIGGER match_player_stats_enforce_player_team
  BEFORE INSERT OR UPDATE ON public.match_player_stats
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_squad_player_team();

ALTER TABLE public.league_table_entries
  DROP CONSTRAINT IF EXISTS league_table_played_check;

ALTER TABLE public.league_table_entries
  ADD CONSTRAINT league_table_played_check
  CHECK (played = won + drawn + lost);

CREATE INDEX IF NOT EXISTS idx_league_table_points
  ON public.league_table_entries (club_id, competition, season, points DESC, goals_for DESC);

CREATE INDEX IF NOT EXISTS idx_match_events_club_match
  ON public.match_events (club_id, match_id);

CREATE INDEX IF NOT EXISTS idx_training_attendance_player_marked
  ON public.training_attendance (club_id, player_id, marked_at DESC);



-- =============================================================================
-- Source: 20260531190000_ai_module.sql
-- =============================================================================

-- ETAP 5: Club AI Assistant — schemat, RLS

CREATE TYPE public.ai_message_role AS ENUM ('user', 'assistant', 'system');

CREATE TYPE public.ai_report_category AS ENUM (
  'matches',
  'trainings',
  'players',
  'management',
  'sponsors'
);

CREATE TYPE public.ai_report_type AS ENUM (
  'match_summary',
  'training_weekly',
  'management_monthly',
  'social_facebook',
  'social_instagram',
  'social_website',
  'social_round'
);

CREATE TYPE public.ai_report_status AS ENUM ('draft', 'published', 'archived');

CREATE TYPE public.ai_suggestion_type AS ENUM (
  'low_attendance',
  'missing_availability',
  'expiring_documents',
  'high_injuries'
);

CREATE TYPE public.ai_suggestion_status AS ENUM ('open', 'dismissed', 'resolved');

CREATE TABLE public.ai_report_categories (
  id public.ai_report_category PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- [stripped: ai_report_categories catalog seed]

CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nowa rozmowa',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_ai_conversations_club_user ON public.ai_conversations (club_id, user_id, updated_at DESC);
CREATE INDEX idx_ai_conversations_pinned ON public.ai_conversations (club_id, user_id, is_pinned DESC, updated_at DESC);

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations (id) ON DELETE CASCADE,
  role public.ai_message_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_ai_messages_conversation ON public.ai_messages (conversation_id, created_at);

CREATE TABLE public.ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  category public.ai_report_category NOT NULL,
  report_type public.ai_report_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status public.ai_report_status NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  source_type TEXT,
  source_id UUID,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_ai_reports_club_category ON public.ai_reports (club_id, category, status, created_at DESC);
CREATE INDEX idx_ai_reports_source ON public.ai_reports (club_id, source_type, source_id);

CREATE TABLE public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  suggestion_type public.ai_suggestion_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_hint TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  status public.ai_suggestion_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_ai_suggestions_club_status ON public.ai_suggestions (club_id, status, created_at DESC);

CREATE TRIGGER ai_conversations_set_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER ai_reports_set_updated_at
  BEFORE UPDATE ON public.ai_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER ai_suggestions_set_updated_at
  BEFORE UPDATE ON public.ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_ai_conversation_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'ai_messages' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = NEW.conversation_id AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'conversation_id does not belong to club_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ai_messages_enforce_club
  BEFORE INSERT OR UPDATE ON public.ai_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ai_conversation_club_consistency();

CREATE OR REPLACE FUNCTION public.actor_can_use_ai_chat(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.user_has_club_role(
    p_club_id,
    ARRAY['owner','president','sports_director','coach']::public.club_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_ai(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.user_has_club_role(
    p_club_id,
    ARRAY['owner','president','sports_director']::public.club_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_ai_report(
  p_club_id UUID,
  p_category public.ai_report_category
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director']::public.club_role[]
    )
    OR (
      public.user_has_club_role(p_club_id, ARRAY['coach']::public.club_role[])
      AND p_category IN ('matches', 'trainings', 'players')
    );
$$;

ALTER TABLE public.ai_report_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_report_categories_select" ON public.ai_report_categories FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "ai_conversations_select" ON public.ai_conversations FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND user_id = auth.uid()
    AND public.actor_can_use_ai_chat(club_id)
  );

CREATE POLICY "ai_conversations_manage" ON public.ai_conversations FOR ALL TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND user_id = auth.uid()
    AND public.actor_can_use_ai_chat(club_id)
  )
  WITH CHECK (
    club_id IN (SELECT public.user_club_ids())
    AND user_id = auth.uid()
    AND public.actor_can_use_ai_chat(club_id)
  );

CREATE POLICY "ai_messages_select" ON public.ai_messages FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = conversation_id
        AND c.club_id = ai_messages.club_id
        AND c.user_id = auth.uid()
    )
    AND public.actor_can_use_ai_chat(club_id)
  );

CREATE POLICY "ai_messages_insert" ON public.ai_messages FOR INSERT TO authenticated
  WITH CHECK (
    club_id IN (SELECT public.user_club_ids())
    AND EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = conversation_id
        AND c.club_id = ai_messages.club_id
        AND c.user_id = auth.uid()
    )
    AND public.actor_can_use_ai_chat(club_id)
  );

CREATE POLICY "ai_reports_select" ON public.ai_reports FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_ai_report(club_id, category)
  );

CREATE POLICY "ai_reports_insert" ON public.ai_reports FOR INSERT TO authenticated
  WITH CHECK (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_ai_report(club_id, category)
  );

CREATE POLICY "ai_reports_update" ON public.ai_reports FOR UPDATE TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_ai_report(club_id, category)
  )
  WITH CHECK (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_ai_report(club_id, category)
  );

CREATE POLICY "ai_reports_delete" ON public.ai_reports FOR DELETE TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_ai(club_id)
  );

CREATE POLICY "ai_suggestions_select" ON public.ai_suggestions FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_use_ai_chat(club_id)
  );

CREATE POLICY "ai_suggestions_manage" ON public.ai_suggestions FOR ALL TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_use_ai_chat(club_id)
  )
  WITH CHECK (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_use_ai_chat(club_id)
  );

GRANT SELECT ON public.ai_report_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT SELECT, INSERT ON public.ai_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_suggestions TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_use_ai_chat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_ai(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_ai_report(UUID, public.ai_report_category) TO authenticated;



-- =============================================================================
-- Source: 20260531192000_ai_audit_hardening.sql
-- =============================================================================

-- ETAP 5 audit: członkostwo w rozmowach, indeksy, walidacja treści

CREATE OR REPLACE FUNCTION public.enforce_ai_conversation_membership()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'conversation user_id must match authenticated user';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.club_memberships m
    WHERE m.user_id = NEW.user_id
      AND m.club_id = NEW.club_id
      AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'user is not an active member of club';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ai_conversations_enforce_membership ON public.ai_conversations;
CREATE TRIGGER ai_conversations_enforce_membership
  BEFORE INSERT OR UPDATE OF user_id, club_id ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ai_conversation_membership();

ALTER TABLE public.ai_messages
  DROP CONSTRAINT IF EXISTS ai_messages_content_length_check;

ALTER TABLE public.ai_messages
  ADD CONSTRAINT ai_messages_content_length_check
  CHECK (char_length(content) <= 10000);

CREATE INDEX IF NOT EXISTS idx_ai_messages_club_conversation
  ON public.ai_messages (club_id, conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_attendance_club_player
  ON public.training_attendance (club_id, player_id);

CREATE OR REPLACE FUNCTION public.actor_can_use_ai_chat(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_ai(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_can_read_ai_report(
  p_club_id UUID,
  p_category public.ai_report_category
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.user_has_club_role(
        p_club_id,
        ARRAY['owner','president','sports_director']::public.club_role[]
      )
      OR (
        public.user_has_club_role(p_club_id, ARRAY['coach']::public.club_role[])
        AND p_category IN ('matches', 'trainings', 'players')
      )
    );
$$;



-- =============================================================================
-- Source: 20260531200000_sponsors_module.sql
-- =============================================================================

-- ETAP 6: Moduł sponsorów i partnerów klubu

CREATE TYPE public.sponsor_cooperation_status AS ENUM (
  'active',
  'expiring',
  'ended',
  'potential'
);

CREATE TYPE public.sponsor_contract_status AS ENUM (
  'active',
  'expiring',
  'expired'
);

CREATE TYPE public.sponsor_lead_status AS ENUM (
  'new',
  'in_discussion',
  'offer_sent',
  'negotiation',
  'won',
  'rejected'
);

CREATE TYPE public.sponsor_note_type AS ENUM (
  'phone',
  'meeting',
  'email',
  'note'
);

CREATE TYPE public.sponsor_publication_source AS ENUM (
  'facebook',
  'instagram',
  'website',
  'other'
);

CREATE TYPE public.sponsor_exposure_type AS ENUM (
  'publication',
  'sponsored_match',
  'sponsored_event'
);

CREATE TYPE public.sponsor_financial_entry_type AS ENUM (
  'payment',
  'installment',
  'invoice'
);

CREATE TYPE public.sponsor_financial_status AS ENUM (
  'planned',
  'pending',
  'paid',
  'overdue',
  'cancelled'
);

CREATE TYPE public.sponsor_report_status AS ENUM (
  'draft',
  'published'
);

-- ---------------------------------------------------------------------------
-- Sponsors CRM
-- ---------------------------------------------------------------------------

CREATE TABLE public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  logo_url TEXT,
  nip TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_position TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  cooperation_status public.sponsor_cooperation_status NOT NULL DEFAULT 'potential',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sponsors_club ON public.sponsors (club_id, cooperation_status);
CREATE INDEX idx_sponsors_profile ON public.sponsors (profile_id) WHERE profile_id IS NOT NULL;

CREATE TABLE public.sponsor_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PLN',
  benefits_description TEXT,
  status public.sponsor_contract_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT sponsor_contracts_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX idx_sponsor_contracts_club ON public.sponsor_contracts (club_id, status, end_date);
CREATE INDEX idx_sponsor_contracts_sponsor ON public.sponsor_contracts (sponsor_id, end_date DESC);

CREATE TABLE public.sponsor_contract_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.sponsor_contracts (id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sponsor_contract_attachments_contract
  ON public.sponsor_contract_attachments (contract_id);

CREATE TABLE public.sponsor_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status public.sponsor_lead_status NOT NULL DEFAULT 'new',
  notes TEXT,
  assigned_to UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  converted_sponsor_id UUID REFERENCES public.sponsors (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sponsor_leads_club ON public.sponsor_leads (club_id, status);

CREATE TABLE public.sponsor_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors (id) ON DELETE CASCADE,
  note_type public.sponsor_note_type NOT NULL DEFAULT 'note',
  content TEXT NOT NULL,
  contact_date DATE NOT NULL DEFAULT CURRENT_DATE,
  author_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sponsor_notes_sponsor ON public.sponsor_notes (sponsor_id, contact_date DESC);

CREATE TABLE public.sponsor_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  published_at DATE NOT NULL,
  description TEXT,
  image_url TEXT,
  source public.sponsor_publication_source NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sponsor_publications_club ON public.sponsor_publications (club_id, published_at DESC);

CREATE TABLE public.sponsor_publication_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  publication_id UUID NOT NULL REFERENCES public.sponsor_publications (id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (publication_id, sponsor_id)
);

CREATE TABLE public.sponsor_exposure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors (id) ON DELETE CASCADE,
  exposure_type public.sponsor_exposure_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  exposure_date DATE NOT NULL,
  publication_id UUID REFERENCES public.sponsor_publications (id) ON DELETE SET NULL,
  match_id UUID REFERENCES public.matches (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sponsor_exposure_sponsor ON public.sponsor_exposure (sponsor_id, exposure_date DESC);

CREATE TABLE public.sponsor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors (id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  status public.sponsor_report_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT sponsor_reports_period_check CHECK (period_end >= period_start)
);

CREATE INDEX idx_sponsor_reports_sponsor ON public.sponsor_reports (sponsor_id, period_end DESC);

-- Architektura pod finanse (bez pełnej księgowości)
CREATE TABLE public.sponsor_financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors (id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.sponsor_contracts (id) ON DELETE SET NULL,
  entry_type public.sponsor_financial_entry_type NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PLN',
  due_date DATE,
  paid_at DATE,
  status public.sponsor_financial_status NOT NULL DEFAULT 'planned',
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sponsor_financial_sponsor ON public.sponsor_financial_entries (sponsor_id, due_date);

-- Rozszerzenie powiadomień o umowy sponsorskie
ALTER TABLE public.club_notifications
  ADD COLUMN IF NOT EXISTS sponsor_contract_id UUID REFERENCES public.sponsor_contracts (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sponsor_reminder_days INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_club_notifications_sponsor_dedup
  ON public.club_notifications (user_id, sponsor_contract_id, sponsor_reminder_days)
  WHERE sponsor_contract_id IS NOT NULL AND sponsor_reminder_days IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

CREATE TRIGGER sponsors_set_updated_at
  BEFORE UPDATE ON public.sponsors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sponsor_contracts_set_updated_at
  BEFORE UPDATE ON public.sponsor_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sponsor_leads_set_updated_at
  BEFORE UPDATE ON public.sponsor_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sponsor_notes_set_updated_at
  BEFORE UPDATE ON public.sponsor_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sponsor_publications_set_updated_at
  BEFORE UPDATE ON public.sponsor_publications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sponsor_reports_set_updated_at
  BEFORE UPDATE ON public.sponsor_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sponsor_financial_entries_set_updated_at
  BEFORE UPDATE ON public.sponsor_financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_sponsor_contract_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sponsors s
    WHERE s.id = NEW.sponsor_id AND s.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'sponsor_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sponsor_contracts_enforce_club
  BEFORE INSERT OR UPDATE OF sponsor_id, club_id ON public.sponsor_contracts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_contract_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_sponsor_child_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_sponsor_club UUID;
BEGIN
  SELECT club_id INTO v_sponsor_club FROM public.sponsors WHERE id = NEW.sponsor_id;
  IF v_sponsor_club IS NULL OR v_sponsor_club IS DISTINCT FROM NEW.club_id THEN
    RAISE EXCEPTION 'sponsor_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sponsor_notes_enforce_club
  BEFORE INSERT OR UPDATE OF sponsor_id, club_id ON public.sponsor_notes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_child_club_consistency();

CREATE TRIGGER sponsor_exposure_enforce_club
  BEFORE INSERT OR UPDATE OF sponsor_id, club_id ON public.sponsor_exposure
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_child_club_consistency();

CREATE TRIGGER sponsor_reports_enforce_club
  BEFORE INSERT OR UPDATE OF sponsor_id, club_id ON public.sponsor_reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_child_club_consistency();

CREATE OR REPLACE FUNCTION public.refresh_sponsor_contract_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_days INTEGER;
  v_status public.sponsor_contract_status;
BEGIN
  v_days := NEW.end_date - CURRENT_DATE;
  IF v_days < 0 THEN
    v_status := 'expired';
  ELSIF v_days <= 60 THEN
    v_status := 'expiring';
  ELSE
    v_status := 'active';
  END IF;
  NEW.status := v_status;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sponsor_contracts_refresh_status
  BEFORE INSERT OR UPDATE OF end_date ON public.sponsor_contracts
  FOR EACH ROW EXECUTE FUNCTION public.refresh_sponsor_contract_status();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sponsor_id_for_user(p_club_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id
  FROM public.sponsors s
  WHERE s.club_id = p_club_id
    AND s.profile_id = p_user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_sponsors(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_sponsors(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_can_read_sponsor_contracts(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_is_sponsor_user(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(p_club_id, ARRAY['sponsor']::public.club_role[])
    AND public.sponsor_id_for_user(p_club_id, auth.uid()) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_sponsor_row(p_club_id UUID, p_sponsor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.actor_can_read_sponsors(p_club_id)
    OR (
      public.actor_is_sponsor_user(p_club_id)
      AND p_sponsor_id = public.sponsor_id_for_user(p_club_id, auth.uid())
    );
$$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_contract_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_publication_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_exposure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sponsors_select" ON public.sponsors FOR SELECT TO authenticated
  USING (public.actor_can_access_sponsor_row(club_id, id));

CREATE POLICY "sponsors_manage" ON public.sponsors FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_contracts_select" ON public.sponsor_contracts FOR SELECT TO authenticated
  USING (
    public.actor_can_read_sponsor_contracts(club_id)
    OR (
      public.actor_is_sponsor_user(club_id)
      AND sponsor_id = public.sponsor_id_for_user(club_id, auth.uid())
    )
  );

CREATE POLICY "sponsor_contracts_manage" ON public.sponsor_contracts FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_contract_attachments_select" ON public.sponsor_contract_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsor_contracts c
      WHERE c.id = contract_id
        AND (
          public.actor_can_read_sponsor_contracts(c.club_id)
          OR (
            public.actor_is_sponsor_user(c.club_id)
            AND c.sponsor_id = public.sponsor_id_for_user(c.club_id, auth.uid())
          )
        )
    )
  );

CREATE POLICY "sponsor_contract_attachments_manage" ON public.sponsor_contract_attachments FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_leads_select" ON public.sponsor_leads FOR SELECT TO authenticated
  USING (public.actor_can_read_sponsors(club_id));

CREATE POLICY "sponsor_leads_manage" ON public.sponsor_leads FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_notes_select" ON public.sponsor_notes FOR SELECT TO authenticated
  USING (public.actor_can_read_sponsors(club_id));

CREATE POLICY "sponsor_notes_manage" ON public.sponsor_notes FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_publications_select" ON public.sponsor_publications FOR SELECT TO authenticated
  USING (
    public.actor_can_read_sponsors(club_id)
    OR public.actor_is_sponsor_user(club_id)
  );

CREATE POLICY "sponsor_publications_manage" ON public.sponsor_publications FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_publication_links_select" ON public.sponsor_publication_links FOR SELECT TO authenticated
  USING (
    public.actor_can_read_sponsors(club_id)
    OR (
      public.actor_is_sponsor_user(club_id)
      AND sponsor_id = public.sponsor_id_for_user(club_id, auth.uid())
    )
  );

CREATE POLICY "sponsor_publication_links_manage" ON public.sponsor_publication_links FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_exposure_select" ON public.sponsor_exposure FOR SELECT TO authenticated
  USING (public.actor_can_access_sponsor_row(club_id, sponsor_id));

CREATE POLICY "sponsor_exposure_manage" ON public.sponsor_exposure FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_reports_select" ON public.sponsor_reports FOR SELECT TO authenticated
  USING (
    public.actor_can_read_sponsors(club_id)
    OR (
      public.actor_is_sponsor_user(club_id)
      AND sponsor_id = public.sponsor_id_for_user(club_id, auth.uid())
    )
  );

CREATE POLICY "sponsor_reports_manage" ON public.sponsor_reports FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_financial_select" ON public.sponsor_financial_entries FOR SELECT TO authenticated
  USING (public.actor_can_read_sponsor_contracts(club_id));

CREATE POLICY "sponsor_financial_manage" ON public.sponsor_financial_entries FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

-- Powiadomienia sponsorskie — insert dla zarządu
DROP POLICY IF EXISTS "club_notifications_insert_staff" ON public.club_notifications;
CREATE POLICY "club_notifications_insert_staff" ON public.club_notifications FOR INSERT TO authenticated
  WITH CHECK (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_trainings(club_id)
      OR public.actor_can_manage_sponsors(club_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_contracts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_contract_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_publications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_publication_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_exposure TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_financial_entries TO authenticated;

GRANT EXECUTE ON FUNCTION public.sponsor_id_for_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_sponsors(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_sponsors(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_sponsor_contracts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_is_sponsor_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_access_sponsor_row(UUID, UUID) TO authenticated;



-- =============================================================================
-- Source: 20260531202000_sponsors_audit_hardening.sql
-- =============================================================================

-- ETAP 6 audit: RLS sponsorów, triggery spójności, RPC terminarza

-- Raporty: sponsor widzi wyłącznie opublikowane
DROP POLICY IF EXISTS "sponsor_reports_select" ON public.sponsor_reports;
CREATE POLICY "sponsor_reports_select" ON public.sponsor_reports FOR SELECT TO authenticated
  USING (
    public.actor_can_read_sponsors(club_id)
    OR (
      public.actor_is_sponsor_user(club_id)
      AND sponsor_id = public.sponsor_id_for_user(club_id, auth.uid())
      AND status = 'published'
    )
  );

-- Publikacje: sponsor widzi wyłącznie powiązane z własnym rekordem
DROP POLICY IF EXISTS "sponsor_publications_select" ON public.sponsor_publications;
CREATE POLICY "sponsor_publications_select" ON public.sponsor_publications FOR SELECT TO authenticated
  USING (
    public.actor_can_read_sponsors(club_id)
    OR (
      public.actor_is_sponsor_user(club_id)
      AND EXISTS (
        SELECT 1 FROM public.sponsor_publication_links l
        WHERE l.publication_id = sponsor_publications.id
          AND l.club_id = sponsor_publications.club_id
          AND l.sponsor_id = public.sponsor_id_for_user(club_id, auth.uid())
      )
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsors_club_profile
  ON public.sponsors (club_id, profile_id)
  WHERE profile_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_sponsor_publication_link_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sponsor_publications p
    WHERE p.id = NEW.publication_id AND p.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'publication_id does not belong to club_id';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.sponsors s
    WHERE s.id = NEW.sponsor_id AND s.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'sponsor_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sponsor_publication_links_enforce_club ON public.sponsor_publication_links;
CREATE TRIGGER sponsor_publication_links_enforce_club
  BEFORE INSERT OR UPDATE OF publication_id, sponsor_id, club_id ON public.sponsor_publication_links
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_publication_link_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_sponsor_contract_attachment_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sponsor_contracts c
    WHERE c.id = NEW.contract_id AND c.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'contract_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sponsor_contract_attachments_enforce_club ON public.sponsor_contract_attachments;
CREATE TRIGGER sponsor_contract_attachments_enforce_club
  BEFORE INSERT OR UPDATE OF contract_id, club_id ON public.sponsor_contract_attachments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_contract_attachment_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_sponsor_financial_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sponsors s
    WHERE s.id = NEW.sponsor_id AND s.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'sponsor_id does not belong to club_id';
  END IF;
  IF NEW.contract_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sponsor_contracts c
    WHERE c.id = NEW.contract_id AND c.club_id = NEW.club_id AND c.sponsor_id = NEW.sponsor_id
  ) THEN
    RAISE EXCEPTION 'contract_id does not belong to sponsor/club';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sponsor_financial_entries_enforce_club ON public.sponsor_financial_entries;
CREATE TRIGGER sponsor_financial_entries_enforce_club
  BEFORE INSERT OR UPDATE OF sponsor_id, contract_id, club_id ON public.sponsor_financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_financial_club_consistency();

CREATE INDEX IF NOT EXISTS idx_sponsor_contracts_club_end_date
  ON public.sponsor_contracts (club_id, end_date)
  WHERE status IN ('active', 'expiring');

CREATE INDEX IF NOT EXISTS idx_sponsor_publications_club_published
  ON public.sponsor_publications (club_id, published_at DESC);

-- Terminarz/wyniki dla panelu sponsora (bez dostępu do danych zawodników)
CREATE OR REPLACE FUNCTION public.get_sponsor_portal_schedule(
  p_club_id UUID,
  p_team_id UUID
)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
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
  WHERE public.actor_is_sponsor_user(p_club_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_sponsor_portal_schedule(UUID, UUID) TO authenticated;



-- =============================================================================
-- Source: 20260601100000_finance_module.sql
-- =============================================================================

-- ETAP 7: Moduł finansów klubu

ALTER TYPE public.club_role ADD VALUE IF NOT EXISTS 'treasurer';

CREATE TYPE public.finance_income_category AS ENUM (
  'sponsors',
  'player_fees',
  'grants',
  'donations',
  'club_sales',
  'other'
);

CREATE TYPE public.finance_expense_category AS ENUM (
  'equipment',
  'kits',
  'referees',
  'transport',
  'pitch',
  'training',
  'marketing',
  'administration',
  'other'
);

CREATE TYPE public.finance_fee_plan_type AS ENUM (
  'monthly',
  'one_time'
);

CREATE TYPE public.finance_player_fee_status AS ENUM (
  'paid',
  'partial',
  'overdue'
);

CREATE TYPE public.finance_grant_status AS ENUM (
  'planned',
  'active',
  'completed'
);

CREATE TYPE public.finance_budget_type AS ENUM (
  'season',
  'team',
  'event'
);

CREATE TYPE public.finance_document_type AS ENUM (
  'invoice',
  'receipt',
  'contract'
);

CREATE TYPE public.finance_report_period AS ENUM (
  'monthly',
  'quarterly',
  'yearly'
);

CREATE TYPE public.finance_report_status AS ENUM (
  'draft',
  'published'
);

ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'finance';

-- ---------------------------------------------------------------------------
-- Powiązanie rodzic ↔ zawodnik
-- ---------------------------------------------------------------------------

CREATE TABLE public.player_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, player_id, profile_id)
);

CREATE INDEX idx_player_guardians_profile ON public.player_guardians (club_id, profile_id);
CREATE INDEX idx_player_guardians_player ON public.player_guardians (club_id, player_id);

-- ---------------------------------------------------------------------------
-- Przychody i koszty
-- ---------------------------------------------------------------------------

CREATE TABLE public.finance_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  description TEXT NOT NULL,
  category public.finance_income_category NOT NULL,
  sponsor_id UUID REFERENCES public.sponsors (id) ON DELETE SET NULL,
  grant_id UUID,
  player_fee_id UUID,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_finance_income_club_date ON public.finance_income (club_id, transaction_date DESC);
CREATE INDEX idx_finance_income_category ON public.finance_income (club_id, category);

CREATE TABLE public.finance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  description TEXT NOT NULL,
  category public.finance_expense_category NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_finance_expenses_club_date ON public.finance_expenses (club_id, transaction_date DESC);
CREATE INDEX idx_finance_expenses_category ON public.finance_expenses (club_id, category);

-- ---------------------------------------------------------------------------
-- Składki zawodników
-- ---------------------------------------------------------------------------

CREATE TABLE public.finance_fee_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fee_type public.finance_fee_plan_type NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_finance_fee_plans_club ON public.finance_fee_plans (club_id, is_active);

CREATE TABLE public.finance_player_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  fee_plan_id UUID REFERENCES public.finance_fee_plans (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  due_date DATE NOT NULL,
  amount_due NUMERIC(12, 2) NOT NULL CHECK (amount_due >= 0),
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  status public.finance_player_fee_status NOT NULL DEFAULT 'overdue',
  period_month DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_finance_player_fees_club_status ON public.finance_player_fees (club_id, status, due_date);
CREATE INDEX idx_finance_player_fees_player ON public.finance_player_fees (player_id, due_date DESC);

CREATE TABLE public.finance_player_fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_fee_id UUID NOT NULL REFERENCES public.finance_player_fees (id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  note TEXT,
  recorded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_finance_fee_payments_fee ON public.finance_player_fee_payments (player_fee_id, payment_date DESC);

-- ---------------------------------------------------------------------------
-- Dotacje, budżety, dokumenty, raporty
-- ---------------------------------------------------------------------------

CREATE TABLE public.finance_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status public.finance_grant_status NOT NULL DEFAULT 'planned',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT finance_grants_period_check CHECK (period_end >= period_start)
);

CREATE INDEX idx_finance_grants_club_status ON public.finance_grants (club_id, status);

ALTER TABLE public.finance_income
  ADD CONSTRAINT finance_income_grant_fk
  FOREIGN KEY (grant_id) REFERENCES public.finance_grants (id) ON DELETE SET NULL;

ALTER TABLE public.finance_income
  ADD CONSTRAINT finance_income_player_fee_fk
  FOREIGN KEY (player_fee_id) REFERENCES public.finance_player_fees (id) ON DELETE SET NULL;

CREATE TABLE public.finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget_type public.finance_budget_type NOT NULL,
  team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  season TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  planned_amount NUMERIC(12, 2) NOT NULL CHECK (planned_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT finance_budgets_period_check CHECK (period_end >= period_start)
);

CREATE INDEX idx_finance_budgets_club ON public.finance_budgets (club_id, period_start DESC);

CREATE TABLE public.finance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  document_type public.finance_document_type NOT NULL,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  issue_date DATE,
  amount NUMERIC(12, 2),
  income_id UUID REFERENCES public.finance_income (id) ON DELETE SET NULL,
  expense_id UUID REFERENCES public.finance_expenses (id) ON DELETE SET NULL,
  sponsor_id UUID REFERENCES public.sponsors (id) ON DELETE SET NULL,
  grant_id UUID REFERENCES public.finance_grants (id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_finance_documents_club ON public.finance_documents (club_id, issue_date DESC);

CREATE TABLE public.finance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_type public.finance_report_period NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  status public.finance_report_status NOT NULL DEFAULT 'draft',
  generated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT finance_reports_period_check CHECK (period_end >= period_start)
);

CREATE INDEX idx_finance_reports_club ON public.finance_reports (club_id, period_end DESC);

-- [stripped: ai_report_categories catalog seed]

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

CREATE TRIGGER finance_income_set_updated_at
  BEFORE UPDATE ON public.finance_income
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER finance_expenses_set_updated_at
  BEFORE UPDATE ON public.finance_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER finance_fee_plans_set_updated_at
  BEFORE UPDATE ON public.finance_fee_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER finance_player_fees_set_updated_at
  BEFORE UPDATE ON public.finance_player_fees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER finance_grants_set_updated_at
  BEFORE UPDATE ON public.finance_grants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER finance_budgets_set_updated_at
  BEFORE UPDATE ON public.finance_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER finance_reports_set_updated_at
  BEFORE UPDATE ON public.finance_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.refresh_finance_player_fee_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.amount_paid >= NEW.amount_due THEN
    NEW.status := 'paid';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status := 'partial';
  ELSE
    NEW.status := 'overdue';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER finance_player_fees_refresh_status
  BEFORE INSERT OR UPDATE OF amount_due, amount_paid, due_date ON public.finance_player_fees
  FOR EACH ROW EXECUTE FUNCTION public.refresh_finance_player_fee_status();

CREATE OR REPLACE FUNCTION public.enforce_finance_player_fee_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER finance_player_fees_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.finance_player_fees
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_player_fee_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_finance_fee_payment_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_fee RECORD;
BEGIN
  SELECT club_id, amount_due, amount_paid INTO v_fee
  FROM public.finance_player_fees WHERE id = NEW.player_fee_id;
  IF v_fee.club_id IS NULL OR v_fee.club_id IS DISTINCT FROM NEW.club_id THEN
    RAISE EXCEPTION 'player_fee_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER finance_fee_payments_enforce_club
  BEFORE INSERT OR UPDATE OF player_fee_id, club_id ON public.finance_player_fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_fee_payment_club_consistency();

CREATE OR REPLACE FUNCTION public.apply_finance_fee_payment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
-- [stripped: UPDATE]
  RETURN NEW;
END;
$$;

CREATE TRIGGER finance_fee_payments_apply
  AFTER INSERT ON public.finance_player_fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_finance_fee_payment();

CREATE OR REPLACE FUNCTION public.enforce_player_guardian_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER player_guardians_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_guardians
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_guardian_club_consistency();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.parent_player_ids(p_club_id UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pg.player_id
  FROM public.player_guardians pg
  WHERE pg.club_id = p_club_id
    AND pg.profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_finance(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','treasurer']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_finance(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','treasurer','sports_director']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_finance_portal(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.user_has_club_role(p_club_id, ARRAY['parent']::public.club_role[])
      AND EXISTS (
        SELECT 1 FROM public.player_guardians pg
        WHERE pg.club_id = p_club_id AND pg.profile_id = auth.uid()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_ai_report(
  p_club_id UUID,
  p_category public.ai_report_category
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      (
        p_category IN ('management', 'sponsors', 'finance')
        AND public.user_has_club_role(
          p_club_id,
          ARRAY['owner','president','treasurer','sports_director']::public.club_role[]
        )
      )
      OR (
        p_category IN ('matches', 'trainings', 'players')
        AND public.user_has_club_role(
          p_club_id,
          ARRAY['owner','president','sports_director','coach']::public.club_role[]
        )
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.player_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_fee_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_player_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_player_fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_guardians_select"
  ON public.player_guardians FOR SELECT TO authenticated
  USING (
    public.actor_can_read_finance(club_id)
    OR profile_id = auth.uid()
  );

CREATE POLICY "player_guardians_manage"
  ON public.player_guardians FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_income_select"
  ON public.finance_income FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

CREATE POLICY "finance_income_manage"
  ON public.finance_income FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_expenses_select"
  ON public.finance_expenses FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

CREATE POLICY "finance_expenses_manage"
  ON public.finance_expenses FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_fee_plans_select"
  ON public.finance_fee_plans FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

CREATE POLICY "finance_fee_plans_manage"
  ON public.finance_fee_plans FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_player_fees_select"
  ON public.finance_player_fees FOR SELECT TO authenticated
  USING (
    public.actor_can_read_finance(club_id)
    OR player_id IN (SELECT public.parent_player_ids(club_id))
  );

CREATE POLICY "finance_player_fees_manage"
  ON public.finance_player_fees FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_fee_payments_select"
  ON public.finance_player_fee_payments FOR SELECT TO authenticated
  USING (
    public.actor_can_read_finance(club_id)
    OR EXISTS (
      SELECT 1 FROM public.finance_player_fees f
      WHERE f.id = player_fee_id
        AND f.player_id IN (SELECT public.parent_player_ids(club_id))
    )
  );

CREATE POLICY "finance_fee_payments_manage"
  ON public.finance_player_fee_payments FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_grants_select"
  ON public.finance_grants FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

CREATE POLICY "finance_grants_manage"
  ON public.finance_grants FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_budgets_select"
  ON public.finance_budgets FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

CREATE POLICY "finance_budgets_manage"
  ON public.finance_budgets FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_documents_select"
  ON public.finance_documents FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

CREATE POLICY "finance_documents_manage"
  ON public.finance_documents FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_reports_select"
  ON public.finance_reports FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

CREATE POLICY "finance_reports_manage"
  ON public.finance_reports FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

-- Storage: finance documents
CREATE POLICY "club_assets_finance_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'finance'
    AND public.storage_club_id_from_path(name) IN (SELECT public.user_club_ids())
    AND public.actor_can_read_finance(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_finance_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'finance'
    AND public.actor_can_manage_finance(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_finance_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'finance'
    AND public.actor_can_manage_finance(public.storage_club_id_from_path(name))
  )
  WITH CHECK (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'finance'
    AND public.actor_can_manage_finance(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_finance_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'finance'
    AND public.actor_can_manage_finance(public.storage_club_id_from_path(name))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_guardians TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_income TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_fee_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_player_fees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_player_fee_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_grants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_reports TO authenticated;

GRANT EXECUTE ON FUNCTION public.parent_player_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_finance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_finance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_access_finance_portal(UUID) TO authenticated;



-- =============================================================================
-- Source: 20260601102000_finance_audit_hardening.sql
-- =============================================================================

-- ETAP 7 audit: RLS, triggery spójności, limity wpłat, wydajność

-- Poprawny status składki (zaległa tylko po terminie)
CREATE OR REPLACE FUNCTION public.refresh_finance_player_fee_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.amount_paid >= NEW.amount_due THEN
    NEW.status := 'paid';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status := 'partial';
  ELSIF NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'overdue';
  ELSE
    NEW.status := 'partial';
  END IF;
  RETURN NEW;
END;
$$;

-- Blokada nadpłaty składki
CREATE OR REPLACE FUNCTION public.enforce_finance_fee_payment_cap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_amount_due NUMERIC(12, 2);
  v_amount_paid NUMERIC(12, 2);
BEGIN
  SELECT amount_due, amount_paid INTO v_amount_due, v_amount_paid
  FROM public.finance_player_fees
  WHERE id = NEW.player_fee_id;

  IF v_amount_due IS NULL THEN
    RAISE EXCEPTION 'player_fee_id not found';
  END IF;

  IF (v_amount_paid + NEW.amount) > v_amount_due THEN
    RAISE EXCEPTION 'payment exceeds remaining fee amount';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_fee_payments_cap ON public.finance_player_fee_payments;
CREATE TRIGGER finance_fee_payments_cap
  BEFORE INSERT ON public.finance_player_fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_fee_payment_cap();

ALTER TABLE public.finance_player_fees
  DROP CONSTRAINT IF EXISTS finance_player_fees_paid_lte_due_check;

ALTER TABLE public.finance_player_fees
  ADD CONSTRAINT finance_player_fees_paid_lte_due_check
  CHECK (amount_paid <= amount_due);

-- Spójność club_id na powiązanych rekordach
CREATE OR REPLACE FUNCTION public.enforce_finance_income_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sponsor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sponsors s WHERE s.id = NEW.sponsor_id AND s.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'sponsor_id does not belong to club_id';
  END IF;
  IF NEW.grant_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.finance_grants g WHERE g.id = NEW.grant_id AND g.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'grant_id does not belong to club_id';
  END IF;
  IF NEW.player_fee_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.finance_player_fees f WHERE f.id = NEW.player_fee_id AND f.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'player_fee_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_income_enforce_club ON public.finance_income;
CREATE TRIGGER finance_income_enforce_club
  BEFORE INSERT OR UPDATE OF sponsor_id, grant_id, player_fee_id, club_id ON public.finance_income
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_income_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_finance_document_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.income_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.finance_income i WHERE i.id = NEW.income_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'income_id does not belong to club_id';
  END IF;
  IF NEW.expense_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.finance_expenses e WHERE e.id = NEW.expense_id AND e.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'expense_id does not belong to club_id';
  END IF;
  IF NEW.grant_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.finance_grants g WHERE g.id = NEW.grant_id AND g.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'grant_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_documents_enforce_club ON public.finance_documents;
CREATE TRIGGER finance_documents_enforce_club
  BEFORE INSERT OR UPDATE OF income_id, expense_id, grant_id, club_id ON public.finance_documents
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_document_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_finance_fee_plan_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.teams t WHERE t.id = NEW.team_id AND t.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'team_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_fee_plans_enforce_club ON public.finance_fee_plans;
CREATE TRIGGER finance_fee_plans_enforce_club
  BEFORE INSERT OR UPDATE OF team_id, club_id ON public.finance_fee_plans
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_fee_plan_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_finance_budget_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.teams t WHERE t.id = NEW.team_id AND t.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'team_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_budgets_enforce_club ON public.finance_budgets;
CREATE TRIGGER finance_budgets_enforce_club
  BEFORE INSERT OR UPDATE OF team_id, club_id ON public.finance_budgets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_budget_club_consistency();

-- Defense-in-depth na helperach RLS
CREATE OR REPLACE FUNCTION public.actor_can_manage_finance(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','treasurer']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_finance(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','treasurer','sports_director']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.parent_player_ids(p_club_id UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pg.player_id
  FROM public.player_guardians pg
  WHERE pg.club_id = p_club_id
    AND pg.profile_id = auth.uid()
    AND p_club_id IN (SELECT public.user_club_ids());
$$;

-- Raporty: dyrektor sportowy widzi tylko opublikowane
DROP POLICY IF EXISTS "finance_reports_select" ON public.finance_reports;
CREATE POLICY "finance_reports_select" ON public.finance_reports FOR SELECT TO authenticated
  USING (
    public.actor_can_manage_finance(club_id)
    OR (
      public.user_has_club_role(club_id, ARRAY['owner','president','treasurer']::public.club_role[])
      AND club_id IN (SELECT public.user_club_ids())
    )
    OR (
      public.user_has_club_role(club_id, ARRAY['sports_director']::public.club_role[])
      AND club_id IN (SELECT public.user_club_ids())
      AND status = 'published'
    )
  );

-- Indeksy wydajnościowe
CREATE INDEX IF NOT EXISTS idx_finance_fee_payments_club
  ON public.finance_player_fee_payments (club_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_finance_player_fees_overdue
  ON public.finance_player_fees (club_id, due_date)
  WHERE status IN ('partial', 'overdue') AND amount_paid < amount_due;

-- Agregaty dashboardu (bez ładowania 5000 wierszy)
CREATE OR REPLACE FUNCTION public.get_finance_dashboard_totals(p_club_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_income', COALESCE((
      SELECT SUM(amount) FROM public.finance_income WHERE club_id = p_club_id
    ), 0),
    'total_expenses', COALESCE((
      SELECT SUM(amount) FROM public.finance_expenses WHERE club_id = p_club_id
    ), 0),
    'sponsor_income', COALESCE((
      SELECT SUM(amount) FROM public.finance_income
      WHERE club_id = p_club_id AND category = 'sponsors'
    ), 0),
    'total_fees_due', COALESCE((
      SELECT SUM(amount_due) FROM public.finance_player_fees WHERE club_id = p_club_id
    ), 0),
    'total_fees_paid', COALESCE((
      SELECT SUM(amount_paid) FROM public.finance_player_fees WHERE club_id = p_club_id
    ), 0),
    'overdue_fees_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.finance_player_fees
      WHERE club_id = p_club_id
        AND amount_paid < amount_due
        AND due_date < CURRENT_DATE
    ), 0)
  )
  WHERE public.actor_can_read_finance(p_club_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_dashboard_totals(UUID) TO authenticated;

-- Odśwież status istniejących składek
-- [stripped: UPDATE]



-- =============================================================================
-- Source: 20260602100000_inventory_module.sql
-- =============================================================================

-- ETAP 8: Moduł magazynowy klubu

CREATE TYPE public.inventory_item_category AS ENUM (
  'match_kit',
  'training_kit',
  'tracksuit',
  'balls',
  'markers',
  'cones',
  'training_goals',
  'medical',
  'strength',
  'pitch',
  'electronics',
  'other'
);

CREATE TYPE public.inventory_item_status AS ENUM (
  'available',
  'issued',
  'damaged',
  'retired'
);

CREATE TYPE public.inventory_recipient_type AS ENUM (
  'player',
  'coach',
  'team_manager'
);

CREATE TYPE public.inventory_return_condition AS ENUM (
  'functional',
  'damaged',
  'lost'
);

CREATE TYPE public.inventory_damage_status AS ENUM (
  'reported',
  'in_repair',
  'repaired',
  'replacement_needed'
);

CREATE TYPE public.inventory_order_status AS ENUM (
  'draft',
  'ordered',
  'in_progress',
  'delivered',
  'cancelled'
);

CREATE TYPE public.inventory_stocktake_type AS ENUM (
  'partial',
  'full'
);

CREATE TYPE public.inventory_stocktake_status AS ENUM (
  'in_progress',
  'completed'
);

CREATE TYPE public.inventory_report_type AS ENUM (
  'stock_status',
  'issued_equipment',
  'damaged_equipment',
  'issue_history'
);

CREATE TYPE public.inventory_report_status AS ENUM (
  'draft',
  'published'
);

ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'inventory';

-- ---------------------------------------------------------------------------
-- Kategorie (słownik per klub)
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  slug public.inventory_item_category NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, slug)
);

CREATE INDEX idx_inventory_categories_club ON public.inventory_categories (club_id, sort_order);

-- ---------------------------------------------------------------------------
-- Dostawcy
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_inventory_suppliers_club ON public.inventory_suppliers (club_id, name);

-- ---------------------------------------------------------------------------
-- Kartoteka sprzętu
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.inventory_categories (id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  inventory_number TEXT NOT NULL,
  internal_code TEXT,
  photo_path TEXT,
  description TEXT,
  purchase_date DATE,
  purchase_price NUMERIC(12, 2) CHECK (purchase_price IS NULL OR purchase_price >= 0),
  supplier_id UUID REFERENCES public.inventory_suppliers (id) ON DELETE SET NULL,
  status public.inventory_item_status NOT NULL DEFAULT 'available',
  quantity_total INTEGER NOT NULL DEFAULT 0 CHECK (quantity_total >= 0),
  quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  quantity_issued INTEGER NOT NULL DEFAULT 0 CHECK (quantity_issued >= 0),
  quantity_damaged INTEGER NOT NULL DEFAULT 0 CHECK (quantity_damaged >= 0),
  min_stock_level INTEGER NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT inventory_items_quantities_check CHECK (
    quantity_total = quantity_available + quantity_issued + quantity_damaged
  ),
  UNIQUE (club_id, inventory_number)
);

CREATE INDEX idx_inventory_items_club_category ON public.inventory_items (club_id, category_id);
CREATE INDEX idx_inventory_items_club_status ON public.inventory_items (club_id, status);
CREATE INDEX idx_inventory_items_low_stock ON public.inventory_items (club_id)
  WHERE quantity_available <= min_stock_level AND min_stock_level > 0;

-- ---------------------------------------------------------------------------
-- Wydania sprzętu
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items (id) ON DELETE RESTRICT,
  recipient_type public.inventory_recipient_type NOT NULL,
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  notes TEXT,
  issued_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT inventory_transactions_recipient_check CHECK (
    (recipient_type = 'player' AND player_id IS NOT NULL)
    OR (recipient_type IN ('coach', 'team_manager') AND profile_id IS NOT NULL)
  )
);

CREATE INDEX idx_inventory_transactions_club_date ON public.inventory_transactions (club_id, issue_date DESC);
CREATE INDEX idx_inventory_transactions_item ON public.inventory_transactions (item_id, issue_date DESC);
CREATE INDEX idx_inventory_transactions_player ON public.inventory_transactions (club_id, player_id);

-- ---------------------------------------------------------------------------
-- Zwroty
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.inventory_transactions (id) ON DELETE SET NULL,
  item_id UUID NOT NULL REFERENCES public.inventory_items (id) ON DELETE RESTRICT,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  condition public.inventory_return_condition NOT NULL DEFAULT 'functional',
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_inventory_returns_club_date ON public.inventory_returns (club_id, return_date DESC);
CREATE INDEX idx_inventory_returns_item ON public.inventory_returns (item_id);

-- ---------------------------------------------------------------------------
-- Uszkodzenia
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_damages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items (id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  photo_path TEXT,
  damage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.inventory_damage_status NOT NULL DEFAULT 'reported',
  reported_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_inventory_damages_club_status ON public.inventory_damages (club_id, status);

-- ---------------------------------------------------------------------------
-- Stroje zawodników
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_player_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  jersey_number INTEGER CHECK (jersey_number IS NULL OR jersey_number > 0),
  jersey_size TEXT,
  shorts_size TEXT,
  tracksuit_size TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, player_id)
);

CREATE TABLE public.inventory_kit_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items (id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.inventory_transactions (id) ON DELETE SET NULL,
  kit_name TEXT NOT NULL,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_inventory_kit_assignments_player ON public.inventory_kit_assignments (club_id, player_id, assigned_date DESC);

-- ---------------------------------------------------------------------------
-- Inwentaryzacja
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_stocktakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stocktake_type public.inventory_stocktake_type NOT NULL,
  status public.inventory_stocktake_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ,
  conducted_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.inventory_stocktake_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  stocktake_id UUID NOT NULL REFERENCES public.inventory_stocktakes (id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items (id) ON DELETE CASCADE,
  system_quantity INTEGER NOT NULL DEFAULT 0 CHECK (system_quantity >= 0),
  actual_quantity INTEGER NOT NULL DEFAULT 0 CHECK (actual_quantity >= 0),
  difference INTEGER GENERATED ALWAYS AS (actual_quantity - system_quantity) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (stocktake_id, item_id)
);

CREATE INDEX idx_inventory_stocktakes_club ON public.inventory_stocktakes (club_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- Zamówienia
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.inventory_suppliers (id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  status public.inventory_order_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, order_number)
);

CREATE TABLE public.inventory_purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.inventory_purchase_orders (id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items (id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) CHECK (unit_price IS NULL OR unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_inventory_orders_club_status ON public.inventory_purchase_orders (club_id, status);

-- ---------------------------------------------------------------------------
-- Raporty magazynowe
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  report_type public.inventory_report_type NOT NULL,
  period_start DATE,
  period_end DATE,
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  status public.inventory_report_status NOT NULL DEFAULT 'draft',
  generated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_inventory_reports_club ON public.inventory_reports (club_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Triggery updated_at
-- ---------------------------------------------------------------------------

CREATE TRIGGER inventory_suppliers_set_updated_at
  BEFORE UPDATE ON public.inventory_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inventory_items_set_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inventory_damages_set_updated_at
  BEFORE UPDATE ON public.inventory_damages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inventory_player_kits_set_updated_at
  BEFORE UPDATE ON public.inventory_player_kits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inventory_stocktakes_set_updated_at
  BEFORE UPDATE ON public.inventory_stocktakes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inventory_purchase_orders_set_updated_at
  BEFORE UPDATE ON public.inventory_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inventory_reports_set_updated_at
  BEFORE UPDATE ON public.inventory_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Spójność club_id
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_inventory_item_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_categories c
    WHERE c.id = NEW.category_id AND c.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'category_id does not belong to club_id';
  END IF;
  IF NEW.supplier_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_suppliers s
    WHERE s.id = NEW.supplier_id AND s.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'supplier_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_items_enforce_club
  BEFORE INSERT OR UPDATE OF category_id, supplier_id, club_id ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_item_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_inventory_transaction_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_items i WHERE i.id = NEW.item_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'item_id does not belong to club_id';
  END IF;
  IF NEW.player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.players p WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_transactions_enforce_club
  BEFORE INSERT OR UPDATE OF item_id, player_id, club_id ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_transaction_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_inventory_return_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_items i WHERE i.id = NEW.item_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'item_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_returns_enforce_club
  BEFORE INSERT OR UPDATE OF item_id, club_id ON public.inventory_returns
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_return_club_consistency();

-- ---------------------------------------------------------------------------
-- Automatyczna aktualizacja stanów magazynowych
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_inventory_item_status(p_item_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v RECORD;
BEGIN
  SELECT * INTO v FROM public.inventory_items WHERE id = p_item_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF v.quantity_total = 0 THEN
-- [stripped: UPDATE]
  ELSIF v.quantity_damaged > 0 AND v.quantity_available = 0 AND v.quantity_issued = 0 THEN
-- [stripped: UPDATE]
  ELSIF v.quantity_issued > 0 AND v.quantity_available = 0 THEN
-- [stripped: UPDATE]
  ELSIF v.quantity_available > 0 THEN
-- [stripped: UPDATE]
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_inventory_issue()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_available INTEGER;
BEGIN
  SELECT quantity_available INTO v_available
  FROM public.inventory_items WHERE id = NEW.item_id FOR UPDATE;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'item not found';
  END IF;
  IF v_available < NEW.quantity THEN
    RAISE EXCEPTION 'insufficient available quantity';
  END IF;

-- [stripped: UPDATE]

  PERFORM public.refresh_inventory_item_status(NEW.item_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_transactions_apply_issue
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_issue();

CREATE OR REPLACE FUNCTION public.apply_inventory_return()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_issued INTEGER;
BEGIN
  SELECT quantity_issued INTO v_issued
  FROM public.inventory_items WHERE id = NEW.item_id FOR UPDATE;

  IF v_issued IS NULL THEN
    RAISE EXCEPTION 'item not found';
  END IF;
  IF v_issued < NEW.quantity THEN
    RAISE EXCEPTION 'return quantity exceeds issued quantity';
  END IF;

  IF NEW.condition = 'functional' THEN
-- [stripped: UPDATE]
  ELSIF NEW.condition = 'damaged' THEN
-- [stripped: UPDATE]
  ELSIF NEW.condition = 'lost' THEN
-- [stripped: UPDATE]
  END IF;

  PERFORM public.refresh_inventory_item_status(NEW.item_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_returns_apply_return
  AFTER INSERT ON public.inventory_returns
  FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_return();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.actor_can_manage_inventory(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_can_read_inventory(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_issue_inventory(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_read_inventory(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_own_inventory(p_club_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_inventory(p_club_id)
      OR p_player_id = public.player_id_for_user(p_club_id, auth.uid())
    );
$$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_player_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_kit_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stocktakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stocktake_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_categories_select" ON public.inventory_categories FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id) OR public.player_id_for_user(club_id, auth.uid()) IS NOT NULL);
CREATE POLICY "inventory_categories_manage" ON public.inventory_categories FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_suppliers_select" ON public.inventory_suppliers FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
CREATE POLICY "inventory_suppliers_manage" ON public.inventory_suppliers FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_items_select" ON public.inventory_items FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
CREATE POLICY "inventory_items_manage" ON public.inventory_items FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_transactions_select" ON public.inventory_transactions FOR SELECT TO authenticated
  USING (
    public.actor_can_read_inventory(club_id)
    OR player_id = public.player_id_for_user(club_id, auth.uid())
  );
CREATE POLICY "inventory_transactions_insert" ON public.inventory_transactions FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_issue_inventory(club_id));
CREATE POLICY "inventory_transactions_manage" ON public.inventory_transactions FOR UPDATE TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));
CREATE POLICY "inventory_transactions_delete" ON public.inventory_transactions FOR DELETE TO authenticated
  USING (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_returns_select" ON public.inventory_returns FOR SELECT TO authenticated
  USING (
    public.actor_can_read_inventory(club_id)
    OR EXISTS (
      SELECT 1 FROM public.inventory_transactions t
      WHERE t.id = transaction_id
        AND t.player_id = public.player_id_for_user(club_id, auth.uid())
    )
  );
CREATE POLICY "inventory_returns_insert" ON public.inventory_returns FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_issue_inventory(club_id));
CREATE POLICY "inventory_returns_manage" ON public.inventory_returns FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_damages_select" ON public.inventory_damages FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
CREATE POLICY "inventory_damages_manage" ON public.inventory_damages FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_player_kits_select" ON public.inventory_player_kits FOR SELECT TO authenticated
  USING (public.actor_can_read_own_inventory(club_id, player_id));
CREATE POLICY "inventory_player_kits_manage" ON public.inventory_player_kits FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_kit_assignments_select" ON public.inventory_kit_assignments FOR SELECT TO authenticated
  USING (public.actor_can_read_own_inventory(club_id, player_id));
CREATE POLICY "inventory_kit_assignments_manage" ON public.inventory_kit_assignments FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_stocktakes_select" ON public.inventory_stocktakes FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
CREATE POLICY "inventory_stocktakes_manage" ON public.inventory_stocktakes FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_stocktake_lines_select" ON public.inventory_stocktake_lines FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
CREATE POLICY "inventory_stocktake_lines_manage" ON public.inventory_stocktake_lines FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_purchase_orders_select" ON public.inventory_purchase_orders FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
CREATE POLICY "inventory_purchase_orders_manage" ON public.inventory_purchase_orders FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_purchase_order_lines_select" ON public.inventory_purchase_order_lines FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
CREATE POLICY "inventory_purchase_order_lines_manage" ON public.inventory_purchase_order_lines FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_reports_select" ON public.inventory_reports FOR SELECT TO authenticated
  USING (
    public.actor_can_manage_inventory(club_id)
    OR (
      public.user_has_club_role(club_id, ARRAY['coach']::public.club_role[])
      AND club_id IN (SELECT public.user_club_ids())
      AND status = 'published'
    )
  );
CREATE POLICY "inventory_reports_manage" ON public.inventory_reports FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

-- Storage: zdjęcia magazynowe
CREATE POLICY "club_assets_inventory_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'inventory'
    AND public.storage_club_id_from_path(name) IN (SELECT public.user_club_ids())
    AND public.actor_can_read_inventory(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_inventory_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'inventory'
    AND public.actor_can_manage_inventory(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_inventory_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'inventory'
    AND public.actor_can_manage_inventory(public.storage_club_id_from_path(name))
  );

-- AI category
-- [stripped: ai_report_categories catalog seed]

-- GRANT
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_returns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_damages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_player_kits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_kit_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_stocktakes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_stocktake_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_purchase_order_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_reports TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_inventory(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_inventory(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_issue_inventory(UUID) TO authenticated;



-- =============================================================================
-- Source: 20260602102000_inventory_audit_hardening.sql
-- =============================================================================

-- ETAP 8 audit: RPC dashboardu, AI RLS, indeksy

CREATE OR REPLACE FUNCTION public.actor_can_read_ai_report(
  p_club_id UUID,
  p_category public.ai_report_category
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      (
        p_category IN ('management', 'sponsors', 'finance', 'inventory')
        AND public.user_has_club_role(
          p_club_id,
          ARRAY['owner','president','treasurer','sports_director']::public.club_role[]
        )
      )
      OR (
        p_category IN ('matches', 'trainings', 'players')
        AND public.user_has_club_role(
          p_club_id,
          ARRAY['owner','president','sports_director','coach']::public.club_role[]
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_inventory_dashboard_stats(p_club_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_items', COALESCE((SELECT COUNT(*)::INTEGER FROM public.inventory_items WHERE club_id = p_club_id), 0),
    'total_quantity', COALESCE((SELECT SUM(quantity_total) FROM public.inventory_items WHERE club_id = p_club_id), 0),
    'available_quantity', COALESCE((SELECT SUM(quantity_available) FROM public.inventory_items WHERE club_id = p_club_id), 0),
    'issued_quantity', COALESCE((SELECT SUM(quantity_issued) FROM public.inventory_items WHERE club_id = p_club_id), 0),
    'damaged_quantity', COALESCE((SELECT SUM(quantity_damaged) FROM public.inventory_items WHERE club_id = p_club_id), 0),
    'low_stock_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_items
      WHERE club_id = p_club_id AND min_stock_level > 0 AND quantity_available <= min_stock_level
    ), 0),
    'out_of_stock_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_items
      WHERE club_id = p_club_id AND quantity_available = 0 AND status != 'retired'
    ), 0),
    'balls_available', COALESCE((
      SELECT SUM(i.quantity_available) FROM public.inventory_items i
      JOIN public.inventory_categories c ON c.id = i.category_id
      WHERE i.club_id = p_club_id AND c.slug = 'balls'
    ), 0),
    'open_damages_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_damages
      WHERE club_id = p_club_id AND status IN ('reported', 'in_repair', 'replacement_needed')
    ), 0),
    'open_orders_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_purchase_orders
      WHERE club_id = p_club_id AND status IN ('draft', 'ordered', 'in_progress')
    ), 0)
  )
  WHERE public.actor_can_read_inventory(p_club_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_inventory_dashboard_stats(UUID) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_open
  ON public.inventory_transactions (club_id, expected_return_date)
  WHERE expected_return_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_damages_open
  ON public.inventory_damages (club_id, status)
  WHERE status IN ('reported', 'in_repair', 'replacement_needed');



-- =============================================================================
-- Source: 20260602103000_inventory_audit_hardening.sql
-- =============================================================================

-- ETAP 8 audit: spójność stanów, zwroty, RLS, wydajność raportów

-- Spójność transaction_id przy zwrocie
CREATE OR REPLACE FUNCTION public.enforce_inventory_return_transaction_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.transaction_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_transactions t
    WHERE t.id = NEW.transaction_id
      AND t.club_id = NEW.club_id
      AND t.item_id = NEW.item_id
  ) THEN
    RAISE EXCEPTION 'transaction_id does not match item_id or club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_returns_enforce_transaction ON public.inventory_returns;
CREATE TRIGGER inventory_returns_enforce_transaction
  BEFORE INSERT OR UPDATE OF transaction_id, item_id, club_id ON public.inventory_returns
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_return_transaction_consistency();

-- Limit zwrotu względem wydania powiązanego
CREATE OR REPLACE FUNCTION public.enforce_inventory_return_transaction_cap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_tx_qty INTEGER;
  v_returned INTEGER;
BEGIN
  IF NEW.transaction_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT quantity INTO v_tx_qty
  FROM public.inventory_transactions
  WHERE id = NEW.transaction_id AND club_id = NEW.club_id AND item_id = NEW.item_id;

  IF v_tx_qty IS NULL THEN
    RAISE EXCEPTION 'transaction_id not found';
  END IF;

  SELECT COALESCE(SUM(r.quantity), 0) INTO v_returned
  FROM public.inventory_returns r
  WHERE r.transaction_id = NEW.transaction_id;

  IF (v_returned + NEW.quantity) > v_tx_qty THEN
    RAISE EXCEPTION 'return exceeds issued transaction quantity';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_returns_cap ON public.inventory_returns;
CREATE TRIGGER inventory_returns_cap
  BEFORE INSERT ON public.inventory_returns
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_return_transaction_cap();

-- Spójność club_id: kit assignments, damages, stocktake lines, order lines
CREATE OR REPLACE FUNCTION public.enforce_inventory_kit_assignment_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players p WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to club_id';
  END IF;
  IF NEW.item_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_items i WHERE i.id = NEW.item_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'item_id does not belong to club_id';
  END IF;
  IF NEW.transaction_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_transactions t
    WHERE t.id = NEW.transaction_id AND t.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'transaction_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_kit_assignments_enforce_club ON public.inventory_kit_assignments;
CREATE TRIGGER inventory_kit_assignments_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, item_id, transaction_id, club_id ON public.inventory_kit_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_kit_assignment_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_inventory_damage_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_items i WHERE i.id = NEW.item_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'item_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_damages_enforce_club ON public.inventory_damages;
CREATE TRIGGER inventory_damages_enforce_club
  BEFORE INSERT OR UPDATE OF item_id, club_id ON public.inventory_damages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_damage_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_inventory_stocktake_line_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_stocktakes s
    WHERE s.id = NEW.stocktake_id AND s.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'stocktake_id does not belong to club_id';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_items i WHERE i.id = NEW.item_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'item_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_stocktake_lines_enforce_club ON public.inventory_stocktake_lines;
CREATE TRIGGER inventory_stocktake_lines_enforce_club
  BEFORE INSERT OR UPDATE OF stocktake_id, item_id, club_id ON public.inventory_stocktake_lines
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_stocktake_line_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_inventory_order_line_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_purchase_orders o
    WHERE o.id = NEW.order_id AND o.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'order_id does not belong to club_id';
  END IF;
  IF NEW.item_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_items i WHERE i.id = NEW.item_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'item_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_purchase_order_lines_enforce_club ON public.inventory_purchase_order_lines;
CREATE TRIGGER inventory_purchase_order_lines_enforce_club
  BEFORE INSERT OR UPDATE OF order_id, item_id, club_id ON public.inventory_purchase_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_order_line_club_consistency();

-- Wzmocnione helpery RLS
CREATE OR REPLACE FUNCTION public.actor_can_manage_inventory(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_can_read_inventory(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_own_inventory(p_club_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_inventory(p_club_id)
      OR (
        public.user_has_club_role(p_club_id, ARRAY['player']::public.club_role[])
        AND p_player_id = public.player_id_for_user(p_club_id, auth.uid())
      )
    );
$$;

-- Kategorie magazynu: tylko staff (zawodnik nie potrzebuje pełnego słownika)
DROP POLICY IF EXISTS "inventory_categories_select" ON public.inventory_categories;
CREATE POLICY "inventory_categories_select" ON public.inventory_categories FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));

-- Zwroty zawodnika: tylko powiązane z jego wydaniami
DROP POLICY IF EXISTS "inventory_returns_select" ON public.inventory_returns;
CREATE POLICY "inventory_returns_select" ON public.inventory_returns FOR SELECT TO authenticated
  USING (
    public.actor_can_read_inventory(club_id)
    OR EXISTS (
      SELECT 1 FROM public.inventory_transactions t
      WHERE t.id = transaction_id
        AND t.club_id = club_id
        AND t.player_id = public.player_id_for_user(club_id, auth.uid())
    )
  );

-- Raporty: trener wyłącznie opublikowane (spójnie z finansami)
DROP POLICY IF EXISTS "inventory_reports_select" ON public.inventory_reports;
CREATE POLICY "inventory_reports_select" ON public.inventory_reports FOR SELECT TO authenticated
  USING (
    public.actor_can_manage_inventory(club_id)
    OR (
      public.user_has_club_role(club_id, ARRAY['coach']::public.club_role[])
      AND club_id IN (SELECT public.user_club_ids())
      AND status = 'published'
    )
  );

-- Naprawa błędnych stanów z seeda (uszkodzenia na wydanych pozycjach)
-- [stripped: UPDATE]

-- Agregaty raportów bez ładowania wszystkich pozycji
CREATE OR REPLACE FUNCTION public.get_inventory_report_summary(
  p_club_id UUID,
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_items', COALESCE((SELECT COUNT(*)::INTEGER FROM public.inventory_items WHERE club_id = p_club_id), 0),
    'low_stock_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_items
      WHERE club_id = p_club_id AND min_stock_level > 0 AND quantity_available <= min_stock_level
    ), 0),
    'damaged_count', COALESCE((
      SELECT SUM(quantity_damaged)::INTEGER FROM public.inventory_items WHERE club_id = p_club_id
    ), 0),
    'issued_count', COALESCE((
      SELECT SUM(quantity_issued)::INTEGER FROM public.inventory_items WHERE club_id = p_club_id
    ), 0),
    'issues_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_transactions
      WHERE club_id = p_club_id
        AND issue_date >= COALESCE(p_period_start, DATE '1900-01-01')
        AND issue_date <= COALESCE(p_period_end, DATE '2099-12-31')
    ), 0),
    'balls_issued', COALESCE((
      SELECT SUM(t.quantity)::INTEGER FROM public.inventory_transactions t
      JOIN public.inventory_items i ON i.id = t.item_id
      JOIN public.inventory_categories c ON c.id = i.category_id
      WHERE t.club_id = p_club_id
        AND c.slug = 'balls'
        AND t.issue_date >= COALESCE(p_period_start, DATE '1900-01-01')
        AND t.issue_date <= COALESCE(p_period_end, DATE '2099-12-31')
    ), 0),
    'kits_issued', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_transactions
      WHERE club_id = p_club_id
        AND recipient_type = 'player'
        AND issue_date >= COALESCE(p_period_start, DATE '1900-01-01')
        AND issue_date <= COALESCE(p_period_end, DATE '2099-12-31')
    ), 0),
    'damages_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_damages
      WHERE club_id = p_club_id
        AND damage_date >= COALESCE(p_period_start, DATE '1900-01-01')
        AND damage_date <= COALESCE(p_period_end, DATE '2099-12-31')
    ), 0),
    'replacement_needed', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_damages
      WHERE club_id = p_club_id
        AND status = 'replacement_needed'
        AND damage_date >= COALESCE(p_period_start, DATE '1900-01-01')
        AND damage_date <= COALESCE(p_period_end, DATE '2099-12-31')
    ), 0)
  )
  WHERE public.actor_can_read_inventory(p_club_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_inventory_report_summary(UUID, DATE, DATE) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_inventory_returns_transaction
  ON public.inventory_returns (transaction_id)
  WHERE transaction_id IS NOT NULL;

-- Odśwież statusy po naprawie seeda
-- [stripped: club-specific or incomplete SELECT]



-- =============================================================================
-- Source: 20260603100000_website_module.sql
-- =============================================================================

-- ETAP 9: Strona publiczna klubu, CMS, panel kibica

ALTER TYPE public.club_role ADD VALUE IF NOT EXISTS 'website_admin';

ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'website';

CREATE TYPE public.website_news_category AS ENUM (
  'matches',
  'club',
  'transfers',
  'academy',
  'sponsors',
  'other'
);

CREATE TYPE public.website_news_status AS ENUM (
  'draft',
  'pending_review',
  'published',
  'archived'
);

CREATE TYPE public.website_gallery_category AS ENUM (
  'matches',
  'trainings',
  'club',
  'events'
);

CREATE TYPE public.website_sponsor_tier AS ENUM (
  'main',
  'supporting',
  'partner'
);

CREATE TYPE public.website_social_platform AS ENUM (
  'facebook',
  'instagram',
  'tiktok',
  'youtube'
);

-- Rozszerzenie sponsorów o widoczność publiczną (bez przebudowy modułu CRM)
ALTER TABLE public.sponsors
  ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_tier public.website_sponsor_tier,
  ADD COLUMN IF NOT EXISTS public_description TEXT;

-- ---------------------------------------------------------------------------
-- Ustawienia strony i branding
-- ---------------------------------------------------------------------------

CREATE TABLE public.website_settings (
  club_id UUID PRIMARY KEY REFERENCES public.clubs (id) ON DELETE CASCADE,
  public_site_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  logo_path TEXT,
  logo_dark_path TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1e3a5f',
  secondary_color TEXT NOT NULL DEFAULT '#f5c518',
  accent_color TEXT NOT NULL DEFAULT '#ffffff',
  hero_image_path TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  contact_address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  google_maps_embed_url TEXT,
  seo_title TEXT,
  seo_description TEXT,
  og_image_path TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER website_settings_set_updated_at
  BEFORE UPDATE ON public.website_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Aktualności (CMS)
-- ---------------------------------------------------------------------------

CREATE TABLE public.website_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  featured_image_path TEXT,
  content TEXT NOT NULL DEFAULT '',
  category public.website_news_category NOT NULL DEFAULT 'club',
  status public.website_news_status NOT NULL DEFAULT 'draft',
  author_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ai_source_report_id UUID REFERENCES public.ai_reports (id) ON DELETE SET NULL,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, slug)
);

CREATE INDEX idx_website_news_club_status ON public.website_news (club_id, status, published_at DESC);
CREATE INDEX idx_website_news_category ON public.website_news (club_id, category, status);

CREATE TRIGGER website_news_set_updated_at
  BEFORE UPDATE ON public.website_news
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Galeria
-- ---------------------------------------------------------------------------

CREATE TABLE public.website_gallery_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category public.website_gallery_category NOT NULL DEFAULT 'club',
  cover_image_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, slug)
);

CREATE INDEX idx_website_gallery_albums_club ON public.website_gallery_albums (club_id, is_published, sort_order);

CREATE TRIGGER website_gallery_albums_set_updated_at
  BEFORE UPDATE ON public.website_gallery_albums
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.website_gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  album_id UUID NOT NULL REFERENCES public.website_gallery_albums (id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_website_gallery_photos_album ON public.website_gallery_photos (album_id, sort_order);

-- ---------------------------------------------------------------------------
-- Integracje social media (architektura pod przyszłe API)
-- ---------------------------------------------------------------------------

CREATE TABLE public.website_social_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  platform public.website_social_platform NOT NULL,
  profile_url TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  api_connected BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, platform)
);

CREATE TRIGGER website_social_integrations_set_updated_at
  BEFORE UPDATE ON public.website_social_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.website_is_public(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ws.public_site_enabled FROM public.website_settings ws WHERE ws.club_id = p_club_id),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_website(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','website_admin']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_website_cms(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','website_admin','sports_director','coach']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_create_website_news(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','website_admin','coach']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_publish_website_news(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_manage_website(p_club_id);
$$;

-- ---------------------------------------------------------------------------
-- RLS policies — CMS tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_social_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "website_settings_select" ON public.website_settings FOR SELECT TO authenticated
  USING (public.actor_can_read_website_cms(club_id) OR public.website_is_public(club_id));

CREATE POLICY "website_settings_manage" ON public.website_settings FOR ALL TO authenticated
  USING (public.actor_can_manage_website(club_id))
  WITH CHECK (public.actor_can_manage_website(club_id));

CREATE POLICY "website_settings_public_select" ON public.website_settings FOR SELECT TO anon
  USING (public.website_is_public(club_id));

CREATE POLICY "website_news_staff_select" ON public.website_news FOR SELECT TO authenticated
  USING (public.actor_can_read_website_cms(club_id));

CREATE POLICY "website_news_staff_insert" ON public.website_news FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_create_website_news(club_id));

CREATE POLICY "website_news_staff_update" ON public.website_news FOR UPDATE TO authenticated
  USING (public.actor_can_create_website_news(club_id))
  WITH CHECK (public.actor_can_create_website_news(club_id));

CREATE POLICY "website_news_staff_delete" ON public.website_news FOR DELETE TO authenticated
  USING (public.actor_can_manage_website(club_id));

CREATE POLICY "website_news_public_select" ON public.website_news FOR SELECT TO anon, authenticated
  USING (status = 'published' AND public.website_is_public(club_id));

CREATE POLICY "website_gallery_albums_staff" ON public.website_gallery_albums FOR ALL TO authenticated
  USING (public.actor_can_read_website_cms(club_id))
  WITH CHECK (public.actor_can_manage_website(club_id));

CREATE POLICY "website_gallery_albums_public_select" ON public.website_gallery_albums FOR SELECT TO anon, authenticated
  USING (is_published = TRUE AND public.website_is_public(club_id));

CREATE POLICY "website_gallery_photos_staff" ON public.website_gallery_photos FOR ALL TO authenticated
  USING (public.actor_can_read_website_cms(club_id))
  WITH CHECK (public.actor_can_manage_website(club_id));

CREATE POLICY "website_gallery_photos_public_select" ON public.website_gallery_photos FOR SELECT TO anon, authenticated
  USING (
    public.website_is_public(club_id)
    AND EXISTS (
      SELECT 1 FROM public.website_gallery_albums a
      WHERE a.id = album_id AND a.is_published = TRUE
    )
  );

CREATE POLICY "website_social_staff_select" ON public.website_social_integrations FOR SELECT TO authenticated
  USING (public.actor_can_read_website_cms(club_id));

CREATE POLICY "website_social_staff_manage" ON public.website_social_integrations FOR ALL TO authenticated
  USING (public.actor_can_manage_website(club_id))
  WITH CHECK (public.actor_can_manage_website(club_id));

-- ---------------------------------------------------------------------------
-- Public read on existing modules (matches, league, players, sponsors)
-- ---------------------------------------------------------------------------

CREATE POLICY "matches_public_select" ON public.matches FOR SELECT TO anon, authenticated
  USING (public.website_is_public(club_id));

CREATE POLICY "league_table_public_select" ON public.league_table_entries FOR SELECT TO anon, authenticated
  USING (public.website_is_public(club_id));

CREATE POLICY "players_public_select" ON public.players FOR SELECT TO anon, authenticated
  USING (public.website_is_public(club_id) AND status = 'active');

CREATE POLICY "player_stats_public_select" ON public.player_stats FOR SELECT TO anon, authenticated
  USING (public.website_is_public(club_id));

CREATE POLICY "match_events_public_select" ON public.match_events FOR SELECT TO anon, authenticated
  USING (
    public.website_is_public(club_id)
    AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.status = 'completed')
  );

CREATE POLICY "sponsors_public_select" ON public.sponsors FOR SELECT TO anon, authenticated
  USING (
    public.website_is_public(club_id)
    AND show_on_website = TRUE
    AND cooperation_status IN ('active', 'expiring')
  );

CREATE POLICY "clubs_public_select" ON public.clubs FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.website_settings ws
      WHERE ws.club_id = clubs.id AND ws.public_site_enabled = TRUE
    )
  );

CREATE POLICY "teams_public_select" ON public.teams FOR SELECT TO anon, authenticated
  USING (public.website_is_public(club_id) AND is_active = TRUE);

-- ---------------------------------------------------------------------------
-- Storage — public read for website assets
-- ---------------------------------------------------------------------------

CREATE POLICY "club_assets_website_public_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'club-assets'
    AND (storage.foldername(name))[2] = 'website'
  );

CREATE POLICY "club_assets_website_staff_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets'
    AND (storage.foldername(name))[2] = 'website'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_website((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "club_assets_website_staff_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND (storage.foldername(name))[2] = 'website'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_website((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "club_assets_website_staff_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND (storage.foldername(name))[2] = 'website'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_website((storage.foldername(name))[1]::uuid)
  );

-- ---------------------------------------------------------------------------
-- RPC — agregaty strony głównej (wydajność)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_public_website_home(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
  v_club RECORD;
  v_settings RECORD;
  v_next_match JSONB;
  v_last_result JSONB;
BEGIN
  SELECT c.id, c.slug, c.public_name, c.official_name, c.competition_level, c.voivodeship
  INTO v_club
  FROM public.clubs c
  WHERE c.slug = p_club_slug AND c.status = 'active';

  IF v_club.id IS NULL OR NOT public.website_is_public(v_club.id) THEN
    RETURN NULL;
  END IF;

  v_club_id := v_club.id;

  SELECT * INTO v_settings FROM public.website_settings ws WHERE ws.club_id = v_club_id;

  SELECT jsonb_build_object(
    'id', m.id,
    'matchDate', m.match_date,
    'matchTime', m.match_time,
    'homeTeamName', m.home_team_name,
    'awayTeamName', m.away_team_name,
    'stadium', m.stadium,
    'competition', m.competition,
    'roundNumber', m.round_number
  ) INTO v_next_match
  FROM public.matches m
  WHERE m.club_id = v_club_id
    AND m.status IN ('planned', 'in_progress')
    AND m.match_date >= CURRENT_DATE
  ORDER BY m.match_date, m.match_time
  LIMIT 1;

  SELECT jsonb_build_object(
    'id', m.id,
    'matchDate', m.match_date,
    'homeTeamName', m.home_team_name,
    'awayTeamName', m.away_team_name,
    'homeScore', m.home_score,
    'awayScore', m.away_score,
    'competition', m.competition
  ) INTO v_last_result
  FROM public.matches m
  WHERE m.club_id = v_club_id AND m.status = 'completed'
  ORDER BY m.match_date DESC, m.match_time DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'club', jsonb_build_object(
      'id', v_club.id,
      'slug', v_club.slug,
      'publicName', v_club.public_name,
      'officialName', v_club.official_name,
      'competitionLevel', v_club.competition_level,
      'voivodeship', v_club.voivodeship
    ),
    'settings', jsonb_build_object(
      'logoPath', v_settings.logo_path,
      'logoDarkPath', v_settings.logo_dark_path,
      'primaryColor', v_settings.primary_color,
      'secondaryColor', v_settings.secondary_color,
      'accentColor', v_settings.accent_color,
      'heroImagePath', v_settings.hero_image_path,
      'heroTitle', COALESCE(v_settings.hero_title, v_club.public_name),
      'heroSubtitle', v_settings.hero_subtitle,
      'seoTitle', v_settings.seo_title,
      'seoDescription', v_settings.seo_description,
      'contactAddress', v_settings.contact_address,
      'contactEmail', v_settings.contact_email,
      'contactPhone', v_settings.contact_phone
    ),
    'nextMatch', v_next_match,
    'lastResult', v_last_result,
    'newsCount', (SELECT COUNT(*)::INTEGER FROM public.website_news n WHERE n.club_id = v_club_id AND n.status = 'published'),
    'sponsorCount', (SELECT COUNT(*)::INTEGER FROM public.sponsors s WHERE s.club_id = v_club_id AND s.show_on_website = TRUE)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_team_stats(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'playersCount', COUNT(DISTINCT p.id)::INTEGER,
    'goals', COALESCE(SUM(ps.goals), 0)::INTEGER,
    'assists', COALESCE(SUM(ps.assists), 0)::INTEGER,
    'matchesPlayed', COALESCE(SUM(ps.matches_played), 0)::INTEGER
  )
  FROM public.clubs c
  JOIN public.players p ON p.club_id = c.id AND p.status = 'active'
  LEFT JOIN public.player_stats ps ON ps.player_id = p.id AND ps.club_id = c.id
  WHERE c.slug = p_club_slug
    AND c.status = 'active'
    AND public.website_is_public(c.id)
  GROUP BY c.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_website_home(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_team_stats(TEXT) TO anon, authenticated;
GRANT SELECT ON public.website_settings TO anon, authenticated;
GRANT SELECT ON public.website_news TO anon, authenticated;
GRANT SELECT ON public.website_gallery_albums TO anon, authenticated;
GRANT SELECT ON public.website_gallery_photos TO anon, authenticated;



-- =============================================================================
-- Source: 20260603102000_website_audit_hardening.sql
-- =============================================================================

-- ETAP 9 audit: RLS, CMS, wydajność, SEO (sitemap RPC)

-- ---------------------------------------------------------------------------
-- CMS: trener nie może opublikować wpisu (defense-in-depth)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_website_news_publish_role()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    IF NOT public.actor_can_publish_website_news(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient privileges to publish website news';
    END IF;
    IF NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS website_news_enforce_publish ON public.website_news;
CREATE TRIGGER website_news_enforce_publish
  BEFORE INSERT OR UPDATE OF status ON public.website_news
  FOR EACH ROW EXECUTE FUNCTION public.enforce_website_news_publish_role();

-- Spójność club_id: zdjęcia galerii
CREATE OR REPLACE FUNCTION public.enforce_website_gallery_photo_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.website_gallery_albums a
    WHERE a.id = NEW.album_id AND a.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'album_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS website_gallery_photos_enforce_club ON public.website_gallery_photos;
CREATE TRIGGER website_gallery_photos_enforce_club
  BEFORE INSERT OR UPDATE OF album_id, club_id ON public.website_gallery_photos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_website_gallery_photo_club_consistency();

-- ---------------------------------------------------------------------------
-- Public data: usuń szeroki SELECT (wyciek PII) — zastąp RPC
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "players_public_select" ON public.players;
DROP POLICY IF EXISTS "player_stats_public_select" ON public.player_stats;
DROP POLICY IF EXISTS "sponsors_public_select" ON public.sponsors;

CREATE OR REPLACE FUNCTION public.get_public_players(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row ORDER BY jersey_number NULLS LAST, last_name), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'firstName', p.first_name,
      'lastName', p.last_name,
      'jerseyNumber', p.jersey_number,
      'position', p.primary_position,
      'goals', COALESCE(SUM(ps.goals), 0),
      'assists', COALESCE(SUM(ps.assists), 0),
      'matchesPlayed', COALESCE(SUM(ps.matches_played), 0)
    ) AS row,
    p.jersey_number,
    p.last_name
    FROM public.clubs c
    JOIN public.players p ON p.club_id = c.id AND p.status = 'active'
    LEFT JOIN public.player_stats ps ON ps.player_id = p.id AND ps.club_id = c.id
    WHERE c.slug = p_club_slug
      AND c.status = 'active'
      AND public.website_is_public(c.id)
    GROUP BY p.id, p.first_name, p.last_name, p.jersey_number, p.primary_position
  ) sub;
$$;

CREATE OR REPLACE FUNCTION public.get_public_sponsors(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'companyName', s.company_name,
      'logoUrl', s.logo_url,
      'website', s.website,
      'publicTier', s.public_tier,
      'publicDescription', s.public_description
    ) ORDER BY
      CASE s.public_tier WHEN 'main' THEN 1 WHEN 'supporting' THEN 2 ELSE 3 END,
      s.company_name
  ), '[]'::jsonb)
  FROM public.clubs c
  JOIN public.sponsors s ON s.club_id = c.id
  WHERE c.slug = p_club_slug
    AND c.status = 'active'
    AND public.website_is_public(c.id)
    AND s.show_on_website = TRUE
    AND s.cooperation_status IN ('active', 'expiring');
$$;

CREATE OR REPLACE FUNCTION public.get_public_website_sitemap(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'news', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slug', n.slug, 'updatedAt', n.updated_at))
      FROM public.website_news n
      JOIN public.clubs c ON c.id = n.club_id
      WHERE c.slug = p_club_slug AND n.status = 'published' AND public.website_is_public(c.id)
    ), '[]'::jsonb),
    'gallery', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slug', a.slug, 'updatedAt', a.updated_at))
      FROM public.website_gallery_albums a
      JOIN public.clubs c ON c.id = a.club_id
      WHERE c.slug = p_club_slug AND a.is_published = TRUE AND public.website_is_public(c.id)
    ), '[]'::jsonb)
  )
  FROM public.clubs c
  WHERE c.slug = p_club_slug AND public.website_is_public(c.id);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_players(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_sponsors(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_website_sitemap(TEXT) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_website_gallery_photos_club
  ON public.website_gallery_photos (club_id, album_id);

CREATE INDEX IF NOT EXISTS idx_website_news_published
  ON public.website_news (club_id, published_at DESC)
  WHERE status = 'published';

-- Wzmocnienie helperów RLS (wymóg user_club_ids)
CREATE OR REPLACE FUNCTION public.actor_can_manage_website(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','website_admin']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_website_cms(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','website_admin','coach']::public.club_role[]
    );
$$;

-- Dyrektor sportowy nie zarządza CMS (zgodnie ze specyfikacją ETAP 9)
DROP POLICY IF EXISTS "website_news_staff_select" ON public.website_news;
CREATE POLICY "website_news_staff_select" ON public.website_news FOR SELECT TO authenticated
  USING (public.actor_can_read_website_cms(club_id));



-- =============================================================================
-- Source: 20260603103000_public_website_v2.sql
-- =============================================================================

-- Public Website 2.0 — teams + club stats for multi-club homepage

CREATE OR REPLACE FUNCTION public.get_public_teams(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
BEGIN
  SELECT c.id INTO v_club_id
  FROM public.clubs c
  WHERE c.slug = p_club_slug AND c.status = 'active';

  IF v_club_id IS NULL OR NOT public.website_is_public(v_club_id) THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(sub.row ORDER BY sub.sort_order, sub.team_name)
      FROM (
        SELECT
          jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'category', t.category,
            'season', t.season,
            'playersCount', (
              SELECT COUNT(*)::INTEGER
              FROM public.players p
              WHERE p.team_id = t.id AND p.club_id = v_club_id AND p.status = 'active'
            ),
            'coachName', (
              SELECT pr.full_name
              FROM public.academy_groups ag
              JOIN public.academy_group_staff ags
                ON ags.group_id = ag.id AND ags.staff_role = 'head_coach'
              JOIN public.profiles pr ON pr.id = ags.profile_id
              WHERE ag.team_id = t.id AND ag.club_id = v_club_id
              LIMIT 1
            ),
            'description', ag.description,
            'ageGroup', ag.age_group
          ) AS row,
          CASE t.category
            WHEN 'seniors' THEN 1
            WHEN 'u18' THEN 2
            WHEN 'u12' THEN 3
            WHEN 'u10' THEN 4
            ELSE 5
          END AS sort_order,
          t.name AS team_name
        FROM public.teams t
        LEFT JOIN public.academy_groups ag ON ag.team_id = t.id AND ag.club_id = v_club_id
        WHERE t.club_id = v_club_id AND t.is_active = TRUE
      ) sub
    ),
    '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_club_stats(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  SELECT c.id, c.created_at INTO v_club_id, v_created_at
  FROM public.clubs c
  WHERE c.slug = p_club_slug AND c.status = 'active';

  IF v_club_id IS NULL OR NOT public.website_is_public(v_club_id) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'playersCount', (
      SELECT COUNT(*)::INTEGER FROM public.players p
      WHERE p.club_id = v_club_id AND p.status = 'active'
    ),
    'teamsCount', (
      SELECT COUNT(*)::INTEGER FROM public.teams t
      WHERE t.club_id = v_club_id AND t.is_active = TRUE
    ),
    'matchesPlayed', (
      SELECT COUNT(*)::INTEGER FROM public.matches m
      WHERE m.club_id = v_club_id AND m.status = 'completed'
    ),
    'yearsActive', GREATEST(
      1,
      EXTRACT(YEAR FROM age(timezone('utc', now()), v_created_at))::INTEGER
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_teams(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_club_stats(TEXT) TO anon, authenticated;



-- =============================================================================
-- Source: 20260604100000_integrations_module.sql
-- =============================================================================

-- ETAP 10: Integracje z systemami rozgrywkowymi (PZPN, DZPN, Extranet, importy)

ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'integrations';

CREATE TYPE public.integration_provider AS ENUM (
  'pzpn',
  'dzpn',
  'extranet',
  'manual',
  'other'
);

CREATE TYPE public.integration_data_format AS ENUM (
  'api',
  'json',
  'xml',
  'csv',
  'rss',
  'file',
  'manual'
);

CREATE TYPE public.integration_connection_status AS ENUM (
  'not_configured',
  'ready',
  'disabled',
  'error'
);

CREATE TYPE public.sync_job_type AS ENUM (
  'league_table',
  'fixtures',
  'results',
  'full'
);

CREATE TYPE public.sync_trigger_type AS ENUM (
  'manual',
  'automatic',
  'import'
);

CREATE TYPE public.sync_job_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE public.sync_log_status AS ENUM (
  'success',
  'partial',
  'error'
);

CREATE TYPE public.sync_conflict_status AS ENUM (
  'pending',
  'keep_local',
  'keep_external',
  'merged',
  'dismissed'
);

CREATE TYPE public.integration_import_type AS ENUM (
  'league_table',
  'fixtures',
  'results'
);

CREATE TYPE public.integration_import_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'partial'
);

-- ---------------------------------------------------------------------------
-- Konfiguracja integracji (jedna na provider × klub)
-- ---------------------------------------------------------------------------

CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  provider public.integration_provider NOT NULL,
  status public.integration_connection_status NOT NULL DEFAULT 'not_configured',
  base_url TEXT,
  api_key_configured BOOLEAN NOT NULL DEFAULT FALSE,
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  auto_sync_interval_minutes INTEGER NOT NULL DEFAULT 1440 CHECK (auto_sync_interval_minutes >= 15),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, provider)
);

CREATE TRIGGER integrations_set_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_integrations_club ON public.integrations (club_id);

-- ---------------------------------------------------------------------------
-- Źródła danych (API, pliki, RSS, ręczne)
-- ---------------------------------------------------------------------------

CREATE TABLE public.integration_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.integrations (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format public.integration_data_format NOT NULL DEFAULT 'manual',
  source_url TEXT,
  file_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER integration_sources_set_updated_at
  BEFORE UPDATE ON public.integration_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_integration_sources_club ON public.integration_sources (club_id, integration_id);

-- ---------------------------------------------------------------------------
-- Mapowanie nazw klubu (Piorun Wawrzeńczyce ↔ GLKS Mietków)
-- ---------------------------------------------------------------------------

CREATE TABLE public.integration_club_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  public_name TEXT NOT NULL,
  league_name TEXT NOT NULL,
  external_club_id TEXT,
  provider public.integration_provider,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, public_name, league_name)
);

CREATE TRIGGER integration_club_mappings_set_updated_at
  BEFORE UPDATE ON public.integration_club_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Zewnętrzne ligi / rozgrywki
-- ---------------------------------------------------------------------------

CREATE TABLE public.external_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  provider public.integration_provider NOT NULL,
  external_id TEXT NOT NULL,
  external_name TEXT NOT NULL,
  competition TEXT NOT NULL,
  season TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, provider, external_id, season)
);

CREATE TRIGGER external_leagues_set_updated_at
  BEFORE UPDATE ON public.external_leagues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Mapowanie drużyn (Seniorzy, Juniorzy, …)
-- ---------------------------------------------------------------------------

CREATE TABLE public.external_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  provider public.integration_provider NOT NULL,
  external_id TEXT NOT NULL,
  external_name TEXT NOT NULL,
  category_label TEXT NOT NULL,
  competition TEXT,
  season TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, provider, external_id, season)
);

CREATE TRIGGER external_teams_set_updated_at
  BEFORE UPDATE ON public.external_teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_external_teams_club ON public.external_teams (club_id, team_id);

-- ---------------------------------------------------------------------------
-- Zewnętrzne mecze (staging przed synchronizacją)
-- ---------------------------------------------------------------------------

CREATE TABLE public.external_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  external_league_id UUID REFERENCES public.external_leagues (id) ON DELETE SET NULL,
  provider public.integration_provider NOT NULL,
  external_id TEXT NOT NULL,
  competition TEXT NOT NULL,
  season TEXT NOT NULL,
  round_number INTEGER,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL DEFAULT '15:00',
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  match_id UUID REFERENCES public.matches (id) ON DELETE SET NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, provider, external_id)
);

CREATE TRIGGER external_matches_set_updated_at
  BEFORE UPDATE ON public.external_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_external_matches_club_date ON public.external_matches (club_id, match_date DESC);

-- ---------------------------------------------------------------------------
-- Zadania synchronizacji
-- ---------------------------------------------------------------------------

CREATE TABLE public.sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.integrations (id) ON DELETE SET NULL,
  job_type public.sync_job_type NOT NULL,
  trigger_type public.sync_trigger_type NOT NULL DEFAULT 'manual',
  status public.sync_job_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sync_jobs_club ON public.sync_jobs (club_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Logi synchronizacji
-- ---------------------------------------------------------------------------

CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.integrations (id) ON DELETE SET NULL,
  sync_job_id UUID REFERENCES public.sync_jobs (id) ON DELETE SET NULL,
  source_id UUID REFERENCES public.integration_sources (id) ON DELETE SET NULL,
  provider public.integration_provider NOT NULL,
  job_type public.sync_job_type NOT NULL,
  trigger_type public.sync_trigger_type NOT NULL DEFAULT 'manual',
  status public.sync_log_status NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  quality_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE INDEX idx_sync_logs_club ON public.sync_logs (club_id, started_at DESC);
CREATE INDEX idx_sync_logs_status ON public.sync_logs (club_id, status);

-- ---------------------------------------------------------------------------
-- Konflikty synchronizacji (administrator decyduje)
-- ---------------------------------------------------------------------------

CREATE TABLE public.sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  sync_log_id UUID NOT NULL REFERENCES public.sync_logs (id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  local_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  external_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.sync_conflict_status NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sync_conflicts_pending ON public.sync_conflicts (club_id, status)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- Import plików (CSV, JSON, …)
-- ---------------------------------------------------------------------------

CREATE TABLE public.integration_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  format public.integration_data_format NOT NULL,
  import_type public.integration_import_type NOT NULL,
  status public.integration_import_status NOT NULL DEFAULT 'pending',
  rows_total INTEGER NOT NULL DEFAULT 0,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  rows_failed INTEGER NOT NULL DEFAULT 0,
  quality_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  sync_log_id UUID REFERENCES public.sync_logs (id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_integration_imports_club ON public.integration_imports (club_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.actor_can_read_integrations(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_integrations(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','sports_director']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_sync_integrations(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_manage_integrations(p_club_id);
$$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_club_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_select" ON public.integrations FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "integrations_manage" ON public.integrations FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

CREATE POLICY "integration_sources_select" ON public.integration_sources FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "integration_sources_manage" ON public.integration_sources FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

CREATE POLICY "integration_club_mappings_select" ON public.integration_club_mappings FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "integration_club_mappings_manage" ON public.integration_club_mappings FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

CREATE POLICY "external_leagues_select" ON public.external_leagues FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "external_leagues_manage" ON public.external_leagues FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

CREATE POLICY "external_teams_select" ON public.external_teams FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "external_teams_manage" ON public.external_teams FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

CREATE POLICY "external_matches_select" ON public.external_matches FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "external_matches_manage" ON public.external_matches FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

CREATE POLICY "sync_jobs_select" ON public.sync_jobs FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "sync_jobs_insert" ON public.sync_jobs FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_sync_integrations(club_id));

CREATE POLICY "sync_jobs_update" ON public.sync_jobs FOR UPDATE TO authenticated
  USING (public.actor_can_sync_integrations(club_id))
  WITH CHECK (public.actor_can_sync_integrations(club_id));

CREATE POLICY "sync_logs_select" ON public.sync_logs FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "sync_logs_insert" ON public.sync_logs FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_sync_integrations(club_id));

CREATE POLICY "sync_conflicts_select" ON public.sync_conflicts FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "sync_conflicts_manage" ON public.sync_conflicts FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

CREATE POLICY "integration_imports_select" ON public.integration_imports FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "integration_imports_insert" ON public.integration_imports FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_sync_integrations(club_id));

CREATE POLICY "integration_imports_update" ON public.integration_imports FOR UPDATE TO authenticated
  USING (public.actor_can_sync_integrations(club_id))
  WITH CHECK (public.actor_can_sync_integrations(club_id));



-- =============================================================================
-- Source: 20260604102000_integrations_audit_hardening.sql
-- =============================================================================

-- ETAP 10 audit: GRANTs, spójność club_id, indeksy

-- ---------------------------------------------------------------------------
-- Spójność club_id (defense-in-depth)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_integration_source_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.integrations i
    WHERE i.id = NEW.integration_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'integration_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS integration_sources_enforce_club ON public.integration_sources;
CREATE TRIGGER integration_sources_enforce_club
  BEFORE INSERT OR UPDATE OF integration_id, club_id ON public.integration_sources
  FOR EACH ROW EXECUTE FUNCTION public.enforce_integration_source_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_external_team_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = NEW.team_id AND t.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'team_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS external_teams_enforce_club ON public.external_teams;
CREATE TRIGGER external_teams_enforce_club
  BEFORE INSERT OR UPDATE OF team_id, club_id ON public.external_teams
  FOR EACH ROW EXECUTE FUNCTION public.enforce_external_team_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_external_match_league_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.external_league_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.external_leagues l
    WHERE l.id = NEW.external_league_id AND l.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'external_league_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS external_matches_enforce_league_club ON public.external_matches;
CREATE TRIGGER external_matches_enforce_league_club
  BEFORE INSERT OR UPDATE OF external_league_id, club_id ON public.external_matches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_external_match_league_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_sync_log_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.integration_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.integrations i
    WHERE i.id = NEW.integration_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'integration_id does not belong to club_id on sync_logs';
  END IF;
  IF NEW.sync_job_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sync_jobs j
    WHERE j.id = NEW.sync_job_id AND j.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'sync_job_id does not belong to club_id on sync_logs';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_logs_enforce_club ON public.sync_logs;
CREATE TRIGGER sync_logs_enforce_club
  BEFORE INSERT OR UPDATE ON public.sync_logs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sync_log_club_consistency();

CREATE INDEX IF NOT EXISTS idx_sync_logs_club_status
  ON public.sync_logs (club_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_matches_unsynced
  ON public.external_matches (club_id, competition, season)
  WHERE match_id IS NULL;

-- ---------------------------------------------------------------------------
-- GRANTs (wymagane dla authenticated + RLS)
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_club_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_leagues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_matches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sync_jobs TO authenticated;
GRANT SELECT, INSERT ON public.sync_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_conflicts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.integration_imports TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_read_integrations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_integrations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_sync_integrations(UUID) TO authenticated;



-- =============================================================================
-- Source: 20260605100000_academy_module.sql
-- =============================================================================

-- ETAP 11: Akademia klubowa, rozwój zawodników, skauting

ALTER TYPE public.club_role ADD VALUE IF NOT EXISTS 'scout';

ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'academy';
ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'scouting';

CREATE TYPE public.academy_age_group AS ENUM (
  'skrzaty',
  'zaki',
  'orliki',
  'mlodziki',
  'trampkarze',
  'juniorzy',
  'seniorzy'
);

CREATE TYPE public.academy_staff_role AS ENUM (
  'head_coach',
  'assistant_coach',
  'goalkeeper_coach'
);

CREATE TYPE public.player_goal_status AS ENUM (
  'active',
  'completed',
  'cancelled'
);

CREATE TYPE public.fitness_test_type AS ENUM (
  'sprint_5m',
  'sprint_10m',
  'sprint_30m',
  'beep_test',
  'vertical_jump',
  'agility'
);

CREATE TYPE public.scouting_player_status AS ENUM (
  'observed',
  'testing',
  'recommended',
  'rejected',
  'signed'
);

CREATE TYPE public.scouting_club_type AS ENUM (
  'league_opponent',
  'academy',
  'partner'
);

CREATE TYPE public.team_transition_type AS ENUM (
  'promotion',
  'demotion',
  'loan',
  'other'
);

-- ---------------------------------------------------------------------------
-- Grupy akademii
-- ---------------------------------------------------------------------------

CREATE TABLE public.academy_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  age_group public.academy_age_group NOT NULL,
  team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, age_group)
);

CREATE TRIGGER academy_groups_set_updated_at
  BEFORE UPDATE ON public.academy_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_academy_groups_club ON public.academy_groups (club_id);

CREATE TABLE public.academy_group_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.academy_groups (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  staff_role public.academy_staff_role NOT NULL DEFAULT 'head_coach',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (group_id, profile_id, staff_role)
);

CREATE INDEX idx_academy_group_staff_club ON public.academy_group_staff (club_id, group_id);

-- ---------------------------------------------------------------------------
-- Profil rozwoju zawodnika
-- ---------------------------------------------------------------------------

CREATE TABLE public.player_development (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  potential INTEGER NOT NULL DEFAULT 50 CHECK (potential BETWEEN 1 AND 100),
  development_level INTEGER NOT NULL DEFAULT 50 CHECK (development_level BETWEEN 1 AND 100),
  overall_rating INTEGER NOT NULL DEFAULT 50 CHECK (overall_rating BETWEEN 1 AND 100),
  notes TEXT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, player_id)
);

CREATE TRIGGER player_development_set_updated_at
  BEFORE UPDATE ON public.player_development
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.player_development_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  potential INTEGER NOT NULL CHECK (potential BETWEEN 1 AND 100),
  development_level INTEGER NOT NULL CHECK (development_level BETWEEN 1 AND 100),
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 100),
  note TEXT,
  recorded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_player_development_history_player ON public.player_development_history (club_id, player_id, recorded_at DESC);

-- ---------------------------------------------------------------------------
-- Oceny trenerskie
-- ---------------------------------------------------------------------------

CREATE TABLE public.player_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  assessor_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  assessed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  technique SMALLINT NOT NULL CHECK (technique BETWEEN 1 AND 10),
  speed SMALLINT NOT NULL CHECK (speed BETWEEN 1 AND 10),
  motorics SMALLINT NOT NULL CHECK (motorics BETWEEN 1 AND 10),
  endurance SMALLINT NOT NULL CHECK (endurance BETWEEN 1 AND 10),
  strength SMALLINT NOT NULL CHECK (strength BETWEEN 1 AND 10),
  tactics SMALLINT NOT NULL CHECK (tactics BETWEEN 1 AND 10),
  engagement SMALLINT NOT NULL CHECK (engagement BETWEEN 1 AND 10),
  discipline SMALLINT NOT NULL CHECK (discipline BETWEEN 1 AND 10),
  cooperation SMALLINT NOT NULL CHECK (cooperation BETWEEN 1 AND 10),
  average_score NUMERIC(4, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_player_assessments_player ON public.player_assessments (club_id, player_id, assessed_at DESC);

-- ---------------------------------------------------------------------------
-- Cele rozwojowe
-- ---------------------------------------------------------------------------

CREATE TABLE public.player_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.player_goal_status NOT NULL DEFAULT 'active',
  target_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER player_goals_set_updated_at
  BEFORE UPDATE ON public.player_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_player_goals_player ON public.player_goals (club_id, player_id, status);

-- ---------------------------------------------------------------------------
-- Testy motoryczne
-- ---------------------------------------------------------------------------

CREATE TABLE public.fitness_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  test_type public.fitness_test_type NOT NULL,
  result_value NUMERIC(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_fitness_tests_player ON public.fitness_tests (club_id, player_id, test_date DESC);

-- ---------------------------------------------------------------------------
-- Przejścia między drużynami / grupami
-- ---------------------------------------------------------------------------

CREATE TABLE public.player_team_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  from_age_group public.academy_age_group,
  to_age_group public.academy_age_group NOT NULL,
  from_team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  to_team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  transition_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transition_type public.team_transition_type NOT NULL DEFAULT 'promotion',
  reason TEXT NOT NULL,
  decision_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_player_team_transitions_player ON public.player_team_transitions (club_id, player_id, transition_date DESC);

-- ---------------------------------------------------------------------------
-- Skauting — zawodnicy zewnętrzni
-- ---------------------------------------------------------------------------

CREATE TABLE public.scouting_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  external_club_name TEXT NOT NULL,
  position public.player_position NOT NULL,
  birth_date DATE,
  age_years INTEGER CHECK (age_years IS NULL OR age_years BETWEEN 5 AND 50),
  status public.scouting_player_status NOT NULL DEFAULT 'observed',
  notes TEXT,
  scouted_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  linked_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER scouting_players_set_updated_at
  BEFORE UPDATE ON public.scouting_players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_scouting_players_club ON public.scouting_players (club_id, status);

-- ---------------------------------------------------------------------------
-- Baza klubów obserwowanych
-- ---------------------------------------------------------------------------

CREATE TABLE public.scouting_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  club_type public.scouting_club_type NOT NULL DEFAULT 'league_opponent',
  city TEXT,
  contact_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, name)
);

CREATE TRIGGER scouting_clubs_set_updated_at
  BEFORE UPDATE ON public.scouting_clubs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Raporty skautingowe
-- ---------------------------------------------------------------------------

CREATE TABLE public.scouting_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  scouting_player_id UUID REFERENCES public.scouting_players (id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  author_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  technique SMALLINT NOT NULL CHECK (technique BETWEEN 1 AND 10),
  motorics SMALLINT NOT NULL CHECK (motorics BETWEEN 1 AND 10),
  tactics SMALLINT NOT NULL CHECK (tactics BETWEEN 1 AND 10),
  character SMALLINT NOT NULL CHECK (character BETWEEN 1 AND 10),
  potential SMALLINT NOT NULL CHECK (potential BETWEEN 1 AND 10),
  final_rating SMALLINT NOT NULL CHECK (final_rating BETWEEN 1 AND 10),
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_scouting_reports_club ON public.scouting_reports (club_id, report_date DESC);

-- ---------------------------------------------------------------------------
-- Analiza przeciwników
-- ---------------------------------------------------------------------------

CREATE TABLE public.opponent_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  opponent_name TEXT NOT NULL,
  scouting_club_id UUID REFERENCES public.scouting_clubs (id) ON DELETE SET NULL,
  strengths TEXT NOT NULL DEFAULT '',
  weaknesses TEXT NOT NULL DEFAULT '',
  key_players TEXT NOT NULL DEFAULT '',
  tactical_setup TEXT NOT NULL DEFAULT '',
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  author_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER opponent_analysis_set_updated_at
  BEFORE UPDATE ON public.opponent_analysis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_opponent_analysis_club ON public.opponent_analysis (club_id, analysis_date DESC);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.actor_can_read_academy(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach','scout']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_academy(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','sports_director','coach']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_scouting(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach','scout']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_scouting(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','sports_director','coach','scout']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_own_development(
  p_club_id UUID,
  p_player_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      p_player_id = public.player_id_for_user(p_club_id, auth.uid())
      OR p_player_id IN (SELECT public.parent_player_ids(p_club_id))
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_development_row(
  p_club_id UUID,
  p_player_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.actor_can_read_academy(p_club_id)
    OR public.actor_can_read_own_development(p_club_id, p_player_id);
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.academy_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_group_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_development ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_development_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_team_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opponent_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_groups_select" ON public.academy_groups FOR SELECT TO authenticated
  USING (public.actor_can_read_academy(club_id) OR public.actor_can_read_scouting(club_id));
CREATE POLICY "academy_groups_manage" ON public.academy_groups FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "academy_group_staff_select" ON public.academy_group_staff FOR SELECT TO authenticated
  USING (public.actor_can_read_academy(club_id));
CREATE POLICY "academy_group_staff_manage" ON public.academy_group_staff FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "player_development_select" ON public.player_development FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
CREATE POLICY "player_development_manage" ON public.player_development FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "player_development_history_select" ON public.player_development_history FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
CREATE POLICY "player_development_history_insert" ON public.player_development_history FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "player_assessments_select" ON public.player_assessments FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
CREATE POLICY "player_assessments_manage" ON public.player_assessments FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "player_goals_select" ON public.player_goals FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
CREATE POLICY "player_goals_manage" ON public.player_goals FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "fitness_tests_select" ON public.fitness_tests FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
CREATE POLICY "fitness_tests_manage" ON public.fitness_tests FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "player_team_transitions_select" ON public.player_team_transitions FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
CREATE POLICY "player_team_transitions_manage" ON public.player_team_transitions FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "scouting_players_select" ON public.scouting_players FOR SELECT TO authenticated
  USING (public.actor_can_read_scouting(club_id));
CREATE POLICY "scouting_players_manage" ON public.scouting_players FOR ALL TO authenticated
  USING (public.actor_can_manage_scouting(club_id))
  WITH CHECK (public.actor_can_manage_scouting(club_id));

CREATE POLICY "scouting_clubs_select" ON public.scouting_clubs FOR SELECT TO authenticated
  USING (public.actor_can_read_scouting(club_id));
CREATE POLICY "scouting_clubs_manage" ON public.scouting_clubs FOR ALL TO authenticated
  USING (public.actor_can_manage_scouting(club_id))
  WITH CHECK (public.actor_can_manage_scouting(club_id));

CREATE POLICY "scouting_reports_select" ON public.scouting_reports FOR SELECT TO authenticated
  USING (public.actor_can_read_scouting(club_id));
CREATE POLICY "scouting_reports_manage" ON public.scouting_reports FOR ALL TO authenticated
  USING (public.actor_can_manage_scouting(club_id))
  WITH CHECK (public.actor_can_manage_scouting(club_id));

CREATE POLICY "opponent_analysis_select" ON public.opponent_analysis FOR SELECT TO authenticated
  USING (public.actor_can_read_scouting(club_id));
CREATE POLICY "opponent_analysis_manage" ON public.opponent_analysis FOR ALL TO authenticated
  USING (public.actor_can_manage_scouting(club_id))
  WITH CHECK (public.actor_can_manage_scouting(club_id));



-- =============================================================================
-- Source: 20260605102000_academy_audit_hardening.sql
-- =============================================================================

-- ETAP 11 audit: GRANTs, spójność club_id, indeksy

CREATE OR REPLACE FUNCTION public.enforce_academy_group_staff_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.academy_groups g
    WHERE g.id = NEW.group_id AND g.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'group_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academy_group_staff_enforce_club ON public.academy_group_staff;
CREATE TRIGGER academy_group_staff_enforce_club
  BEFORE INSERT OR UPDATE OF group_id, club_id ON public.academy_group_staff
  FOR EACH ROW EXECUTE FUNCTION public.enforce_academy_group_staff_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_player_development_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS player_development_enforce_club ON public.player_development;
CREATE TRIGGER player_development_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_development
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_development_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_scouting_report_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.scouting_player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.scouting_players sp
    WHERE sp.id = NEW.scouting_player_id AND sp.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'scouting_player_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scouting_reports_enforce_club ON public.scouting_reports;
CREATE TRIGGER scouting_reports_enforce_club
  BEFORE INSERT OR UPDATE ON public.scouting_reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_scouting_report_club_consistency();

CREATE INDEX IF NOT EXISTS idx_player_assessments_club_date
  ON public.player_assessments (club_id, assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_fitness_tests_club_type
  ON public.fitness_tests (club_id, test_type, test_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_group_staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_development TO authenticated;
GRANT SELECT, INSERT ON public.player_development_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_tests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_team_transitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scouting_players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scouting_clubs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scouting_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opponent_analysis TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_read_academy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_academy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_scouting(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_scouting(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_own_development(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_development_row(UUID, UUID) TO authenticated;



-- =============================================================================
-- Source: 20260605103000_academy_audit_fixes.sql
-- =============================================================================

-- ETAP 11 audit fixes: RLS scope, team average aggregate, consistency triggers, indexes

-- Skaut ma wyłącznie dostęp do skautingu — bez odczytu profili rozwoju zawodników klubu
CREATE OR REPLACE FUNCTION public.actor_can_read_academy(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach']::public.club_role[]
    );
$$;

DROP POLICY IF EXISTS "academy_groups_select" ON public.academy_groups;
CREATE POLICY "academy_groups_select" ON public.academy_groups FOR SELECT TO authenticated
  USING (public.actor_can_read_academy(club_id));

-- Średnia drużyny bez ujawniania pojedynczych profili (zawodnik / rodzic na tej samej drużynie)
CREATE OR REPLACE FUNCTION public.team_development_average(
  p_club_id UUID,
  p_team_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_avg NUMERIC;
BEGIN
  IF p_team_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT (p_club_id IN (SELECT public.user_club_ids())) THEN
    RETURN NULL;
  END IF;

  IF public.actor_can_read_academy(p_club_id) THEN
    SELECT ROUND(AVG(pd.overall_rating)::numeric, 0) INTO v_avg
    FROM public.player_development pd
    JOIN public.players p ON p.id = pd.player_id
    WHERE pd.club_id = p_club_id AND p.team_id = p_team_id;
    RETURN v_avg;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.club_id = p_club_id
      AND p.team_id = p_team_id
      AND (
        p.id = public.player_id_for_user(p_club_id, auth.uid())
        OR p.id IN (SELECT public.parent_player_ids(p_club_id))
      )
  ) THEN
    SELECT ROUND(AVG(pd.overall_rating)::numeric, 0) INTO v_avg
    FROM public.player_development pd
    JOIN public.players p ON p.id = pd.player_id
    WHERE pd.club_id = p_club_id AND p.team_id = p_team_id;
    RETURN v_avg;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_player_row_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS player_assessments_enforce_club ON public.player_assessments;
CREATE TRIGGER player_assessments_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_assessments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_row_club_consistency();

DROP TRIGGER IF EXISTS player_goals_enforce_club ON public.player_goals;
CREATE TRIGGER player_goals_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_goals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_row_club_consistency();

DROP TRIGGER IF EXISTS fitness_tests_enforce_club ON public.fitness_tests;
CREATE TRIGGER fitness_tests_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.fitness_tests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_row_club_consistency();

DROP TRIGGER IF EXISTS player_team_transitions_enforce_club ON public.player_team_transitions;
CREATE TRIGGER player_team_transitions_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_team_transitions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_row_club_consistency();

DROP TRIGGER IF EXISTS player_development_history_enforce_club ON public.player_development_history;
CREATE TRIGGER player_development_history_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_development_history
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_row_club_consistency();

CREATE INDEX IF NOT EXISTS idx_player_development_club_player
  ON public.player_development (club_id, player_id);

CREATE INDEX IF NOT EXISTS idx_scouting_reports_player
  ON public.scouting_reports (club_id, scouting_player_id, report_date DESC);

GRANT EXECUTE ON FUNCTION public.team_development_average(UUID, UUID) TO authenticated;



-- =============================================================================
-- Source: 20260605110000_stage115_security_performance.sql
-- =============================================================================

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



-- =============================================================================
-- Source: 20260605111000_website_media_system.sql
-- =============================================================================

-- Public Website 3.0 — media system (greenfield-safe: after coach_team_ids @ 20260605110000)

DO $$
BEGIN
  CREATE TYPE public.website_media_section AS ENUM (
    'hero',
    'team',
    'academy',
    'gallery',
    'news'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.website_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  section public.website_media_section NOT NULL,
  slot_key TEXT NOT NULL DEFAULT 'default',
  team_id UUID REFERENCES public.teams (id) ON DELETE CASCADE,
  news_id UUID REFERENCES public.website_news (id) ON DELETE CASCADE,
  storage_path TEXT,
  demo_asset_key TEXT,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT website_media_has_source CHECK (storage_path IS NOT NULL OR demo_asset_key IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_website_media_club_section
  ON public.website_media (club_id, section, sort_order);

CREATE INDEX IF NOT EXISTS idx_website_media_team
  ON public.website_media (club_id, team_id)
  WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_website_media_news
  ON public.website_media (club_id, news_id)
  WHERE news_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_website_media_hero_slot
  ON public.website_media (club_id, slot_key)
  WHERE section = 'hero';

CREATE UNIQUE INDEX IF NOT EXISTS uq_website_media_team
  ON public.website_media (club_id, team_id)
  WHERE section = 'team';

CREATE UNIQUE INDEX IF NOT EXISTS uq_website_media_academy_slot
  ON public.website_media (club_id, slot_key)
  WHERE section = 'academy';

CREATE UNIQUE INDEX IF NOT EXISTS uq_website_media_gallery_slot
  ON public.website_media (club_id, slot_key)
  WHERE section = 'gallery';

CREATE UNIQUE INDEX IF NOT EXISTS uq_website_media_news
  ON public.website_media (club_id, news_id)
  WHERE section = 'news';

DROP TRIGGER IF EXISTS website_media_set_updated_at ON public.website_media;
CREATE TRIGGER website_media_set_updated_at
  BEFORE UPDATE ON public.website_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.actor_can_manage_website_media(
  p_club_id UUID,
  p_section public.website_media_section,
  p_team_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.actor_can_manage_website(p_club_id) THEN TRUE
    WHEN p_section = 'team'
      AND p_team_id IS NOT NULL
      AND p_team_id IN (SELECT public.coach_team_ids(p_club_id)) THEN TRUE
    ELSE FALSE
  END;
$$;

-- Legacy hero_image_path → website_media (slot hero/team). Idempotent, preserves uploads.
-- [stripped: club INSERT]

ALTER TABLE public.website_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "website_media_staff_select" ON public.website_media;
CREATE POLICY "website_media_staff_select" ON public.website_media
  FOR SELECT TO authenticated
  USING (public.actor_can_read_website_cms(club_id));

DROP POLICY IF EXISTS "website_media_public_select" ON public.website_media;
CREATE POLICY "website_media_public_select" ON public.website_media
  FOR SELECT TO anon, authenticated
  USING (is_active = TRUE AND public.website_is_public(club_id));

DROP POLICY IF EXISTS "website_media_insert" ON public.website_media;
CREATE POLICY "website_media_insert" ON public.website_media
  FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_manage_website_media(club_id, section, team_id));

DROP POLICY IF EXISTS "website_media_update" ON public.website_media;
CREATE POLICY "website_media_update" ON public.website_media
  FOR UPDATE TO authenticated
  USING (public.actor_can_manage_website_media(club_id, section, team_id))
  WITH CHECK (public.actor_can_manage_website_media(club_id, section, team_id));

DROP POLICY IF EXISTS "website_media_delete" ON public.website_media;
CREATE POLICY "website_media_delete" ON public.website_media
  FOR DELETE TO authenticated
  USING (public.actor_can_manage_website_media(club_id, section, team_id));

DROP POLICY IF EXISTS "club_assets_website_media_coach_insert" ON storage.objects;
CREATE POLICY "club_assets_website_media_coach_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets'
    AND (storage.foldername(name))[2] = 'website'
    AND (storage.foldername(name))[3] = 'media'
    AND (storage.foldername(name))[4] = 'team'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_website_media(
      (storage.foldername(name))[1]::uuid,
      'team'::public.website_media_section,
      (storage.foldername(name))[5]::uuid
    )
  );

DROP POLICY IF EXISTS "club_assets_website_media_coach_update" ON storage.objects;
CREATE POLICY "club_assets_website_media_coach_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND (storage.foldername(name))[2] = 'website'
    AND (storage.foldername(name))[3] = 'media'
    AND (storage.foldername(name))[4] = 'team'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_website_media(
      (storage.foldername(name))[1]::uuid,
      'team'::public.website_media_section,
      (storage.foldername(name))[5]::uuid
    )
  );

DROP POLICY IF EXISTS "club_assets_website_media_coach_delete" ON storage.objects;
CREATE POLICY "club_assets_website_media_coach_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND (storage.foldername(name))[2] = 'website'
    AND (storage.foldername(name))[3] = 'media'
    AND (storage.foldername(name))[4] = 'team'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_website_media(
      (storage.foldername(name))[1]::uuid,
      'team'::public.website_media_section,
      (storage.foldername(name))[5]::uuid
    )
  );

GRANT SELECT ON public.website_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.website_media TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_website_media(UUID, public.website_media_section, UUID) TO authenticated;



-- =============================================================================
-- Source: 20260606120000_stage116_production_hardening.sql
-- =============================================================================

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



-- =============================================================================
-- Source: 20260606140000_stage116_p2_security_completion.sql
-- =============================================================================

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



-- =============================================================================
-- Source: 20260610120000_stage12_pwa.sql
-- =============================================================================

-- ETAP 12: PWA — push subscriptions, notification preferences, delivery queue

CREATE TYPE public.notification_event_type AS ENUM (
  'training_tomorrow',
  'match_tomorrow',
  'schedule_change',
  'document_expiring',
  'fee_overdue',
  'ai_report_new',
  'general'
);

CREATE TYPE public.notification_delivery_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'cancelled'
);

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions (user_id, club_id);

CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type public.notification_event_type NOT NULL,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_unique UNIQUE (user_id, club_id, event_type)
);

CREATE INDEX idx_notification_preferences_user ON public.notification_preferences (user_id, club_id);

CREATE TABLE public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type public.notification_event_type NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  status public.notification_delivery_status NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_queue_pending
  ON public.notification_queue (status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX idx_notification_queue_user
  ON public.notification_queue (user_id, club_id, created_at DESC);

CREATE TRIGGER push_subscriptions_set_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER notification_preferences_set_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_select_own" ON public.push_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "push_subscriptions_manage_own" ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()))
  WITH CHECK (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "notification_preferences_select_own" ON public.notification_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "notification_preferences_manage_own" ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()))
  WITH CHECK (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "notification_queue_select_own" ON public.notification_queue FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT SELECT ON public.notification_queue TO authenticated;



-- =============================================================================
-- Source: 20260615120000_stage13_ai_manager.sql
-- =============================================================================

-- ETAP 13: AI Club Manager — agent tasks, tool calls, approvals, memory, audit

CREATE TYPE public.ai_task_status AS ENUM (
  'pending',
  'running',
  'awaiting_approval',
  'completed',
  'cancelled',
  'failed'
);

CREATE TYPE public.ai_risk_level AS ENUM ('low', 'medium', 'high');

CREATE TYPE public.ai_approval_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

CREATE TYPE public.ai_tool_call_status AS ENUM ('pending', 'success', 'failed', 'skipped');

CREATE TABLE public.ai_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  command TEXT NOT NULL,
  status public.ai_task_status NOT NULL DEFAULT 'pending',
  result_summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_tasks_user_status ON public.ai_tasks (club_id, user_id, status, created_at DESC);
CREATE INDEX idx_ai_tasks_club ON public.ai_tasks (club_id, created_at DESC);

CREATE TABLE public.ai_task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_task_logs_task ON public.ai_task_logs (task_id, created_at DESC);

CREATE TABLE public.ai_tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  tool_input JSONB NOT NULL DEFAULT '{}'::JSONB,
  tool_output JSONB,
  risk_level public.ai_risk_level NOT NULL DEFAULT 'low',
  status public.ai_tool_call_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_tool_calls_task ON public.ai_tool_calls (task_id, created_at DESC);

CREATE TABLE public.ai_action_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
  tool_call_id UUID NOT NULL REFERENCES public.ai_tool_calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_level public.ai_risk_level NOT NULL,
  status public.ai_approval_status NOT NULL DEFAULT 'pending',
  preview JSONB NOT NULL DEFAULT '{}'::JSONB,
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_action_approvals_pending
  ON public.ai_action_approvals (club_id, user_id, status)
  WHERE status = 'pending';

CREATE TABLE public.ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ai_memory_scope
  ON public.ai_memory (club_id, user_id, COALESCE(conversation_id, '00000000-0000-0000-0000-000000000000'::UUID));

CREATE TRIGGER ai_tasks_set_updated_at
  BEFORE UPDATE ON public.ai_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER ai_memory_set_updated_at
  BEFORE UPDATE ON public.ai_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_tasks_select_own" ON public.ai_tasks FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "ai_tasks_insert_own" ON public.ai_tasks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "ai_tasks_update_own" ON public.ai_tasks FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()))
  WITH CHECK (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "ai_task_logs_select_own" ON public.ai_task_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "ai_task_logs_insert_own" ON public.ai_task_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "ai_tool_calls_select_own" ON public.ai_tool_calls FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "ai_tool_calls_insert_own" ON public.ai_tool_calls FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "ai_tool_calls_update_own" ON public.ai_tool_calls FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()))
  WITH CHECK (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "ai_action_approvals_select_own" ON public.ai_action_approvals FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "ai_action_approvals_insert_own" ON public.ai_action_approvals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "ai_action_approvals_update_own" ON public.ai_action_approvals FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()))
  WITH CHECK (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "ai_memory_select_own" ON public.ai_memory FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "ai_memory_manage_own" ON public.ai_memory FOR ALL TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()))
  WITH CHECK (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

GRANT SELECT, INSERT, UPDATE ON public.ai_tasks TO authenticated;
GRANT SELECT, INSERT ON public.ai_task_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_tool_calls TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_action_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_memory TO authenticated;



-- =============================================================================
-- Source: 20260615130000_stage13_audit_rls_hardening.sql
-- =============================================================================

-- ETAP 13 audit: tighten RLS on agent audit tables (task ownership on insert)

DROP POLICY IF EXISTS "ai_task_logs_insert_own" ON public.ai_task_logs;
CREATE POLICY "ai_task_logs_insert_own" ON public.ai_task_logs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND club_id IN (SELECT public.user_club_ids())
    AND EXISTS (
      SELECT 1
      FROM public.ai_tasks t
      WHERE t.id = task_id
        AND t.user_id = auth.uid()
        AND t.club_id = club_id
    )
  );

DROP POLICY IF EXISTS "ai_tool_calls_insert_own" ON public.ai_tool_calls;
CREATE POLICY "ai_tool_calls_insert_own" ON public.ai_tool_calls FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND club_id IN (SELECT public.user_club_ids())
    AND EXISTS (
      SELECT 1
      FROM public.ai_tasks t
      WHERE t.id = task_id
        AND t.user_id = auth.uid()
        AND t.club_id = club_id
    )
  );

DROP POLICY IF EXISTS "ai_action_approvals_insert_own" ON public.ai_action_approvals;
CREATE POLICY "ai_action_approvals_insert_own" ON public.ai_action_approvals FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND club_id IN (SELECT public.user_club_ids())
    AND EXISTS (
      SELECT 1
      FROM public.ai_tasks t
      WHERE t.id = task_id
        AND t.user_id = auth.uid()
        AND t.club_id = club_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.ai_tool_calls tc
      WHERE tc.id = tool_call_id
        AND tc.task_id = task_id
        AND tc.user_id = auth.uid()
        AND tc.club_id = club_id
    )
  );



-- =============================================================================
-- Source: 20260615140000_stage135_performance.sql
-- =============================================================================

-- ETAP 13.5 — performance indexes

CREATE INDEX IF NOT EXISTS idx_club_notifications_unread_user
  ON public.club_notifications (club_id, user_id, scheduled_at)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_training_attendance_club_player
  ON public.training_attendance (club_id, player_id);

CREATE INDEX IF NOT EXISTS idx_website_news_club_published
  ON public.website_news (club_id, published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_player_documents_expiring
  ON public.player_documents (club_id, expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_club_memberships_staff
  ON public.club_memberships (club_id, role)
  WHERE status = 'active';



-- =============================================================================
-- Source: 20260615150000_stage137_performance.sql
-- =============================================================================

-- ETAP 13.7 — consolidate hot-path queries into single RPC round-trips

-- Layout: profiles + memberships + club + teams + unread count + website_settings
CREATE OR REPLACE FUNCTION public.get_app_layout_context(p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.club_memberships
    WHERE user_id = v_user_id AND club_id = p_club_id AND status = 'active'
  ) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'profile', (
      SELECT to_jsonb(p) - 'created_at' - 'updated_at'
      FROM (
        SELECT id, email, full_name, avatar_url, phone, locale
        FROM public.profiles
        WHERE id = v_user_id
      ) p
    ),
    'memberships', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', cm.id,
          'club_id', cm.club_id,
          'user_id', cm.user_id,
          'role', cm.role,
          'status', cm.status,
          'team_id', cm.team_id
        )
        ORDER BY cm.role
      )
      FROM public.club_memberships cm
      WHERE cm.user_id = v_user_id
        AND cm.club_id = p_club_id
        AND cm.status = 'active'
    ), '[]'::jsonb),
    'club', (
      SELECT to_jsonb(c)
      FROM (
        SELECT id, slug, public_name, official_name, association, competition_level, country, voivodeship, status
        FROM public.clubs
        WHERE id = p_club_id
      ) c
    ),
    'teams', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'club_id', t.club_id,
          'name', t.name,
          'category', t.category,
          'season', t.season,
          'is_active', t.is_active
        )
        ORDER BY t.name
      )
      FROM public.teams t
      WHERE t.club_id = p_club_id
    ), '[]'::jsonb),
    'unread_notifications', COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM public.club_notifications cn
      WHERE cn.club_id = p_club_id
        AND cn.user_id = v_user_id
        AND cn.read_at IS NULL
        AND cn.scheduled_at <= v_now
    ), 0),
    'website_settings', (
      SELECT jsonb_build_object(
        'club_id', ws.club_id,
        'primary_color', ws.primary_color,
        'secondary_color', ws.secondary_color,
        'public_site_enabled', ws.public_site_enabled,
        'accent_color', ws.accent_color
      )
      FROM public.website_settings ws
      WHERE ws.club_id = p_club_id
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_app_layout_context(UUID) TO authenticated;

-- Dashboard home: player counts + document alerts in one call
CREATE OR REPLACE FUNCTION public.get_home_dashboard_stats(p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_horizon DATE := CURRENT_DATE + 30;
BEGIN
  IF NOT public.actor_can_read_players(p_club_id) THEN
    RETURN jsonb_build_object(
      'player_counts', jsonb_build_object('total', 0, 'active', 0),
      'document_alerts', '[]'::jsonb
    );
  END IF;

  RETURN jsonb_build_object(
    'player_counts', jsonb_build_object(
      'total', (SELECT COUNT(*)::INTEGER FROM public.players WHERE club_id = p_club_id),
      'active', (
        SELECT COUNT(*)::INTEGER FROM public.players
        WHERE club_id = p_club_id AND status = 'active'
      )
    ),
    'document_alerts', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'document_id', d.id,
          'player_id', d.player_id,
          'player_name', p.first_name || ' ' || p.last_name,
          'document_title', d.title,
          'document_type', d.document_type,
          'expires_at', d.expires_at
        )
        ORDER BY d.expires_at
      )
      FROM public.player_documents d
      JOIN public.players p ON p.id = d.player_id AND p.club_id = p_club_id
      WHERE d.club_id = p_club_id
        AND d.expires_at IS NOT NULL
        AND d.expires_at <= v_horizon
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_home_dashboard_stats(UUID) TO authenticated;

-- Sponsors dashboard stats (5 queries → 1)
CREATE OR REPLACE FUNCTION public.get_sponsor_dashboard_stats(p_club_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_sponsors', (
      SELECT COUNT(*)::INTEGER FROM public.sponsors WHERE club_id = p_club_id
    ),
    'active_contracts', (
      SELECT COUNT(*)::INTEGER FROM public.sponsor_contracts
      WHERE club_id = p_club_id AND status = 'active'
    ),
    'expiring_contracts', (
      SELECT COUNT(*)::INTEGER FROM public.sponsor_contracts
      WHERE club_id = p_club_id AND status = 'expiring'
    ),
    'active_contract_value', COALESCE((
      SELECT SUM(value) FROM public.sponsor_contracts
      WHERE club_id = p_club_id AND status IN ('active', 'expiring')
    ), 0),
    'open_leads', (
      SELECT COUNT(*)::INTEGER FROM public.sponsor_leads
      WHERE club_id = p_club_id AND status NOT IN ('won', 'rejected')
    ),
    'publications_this_month', (
      SELECT COUNT(*)::INTEGER FROM public.sponsor_publications
      WHERE club_id = p_club_id
        AND published_at >= date_trunc('month', CURRENT_DATE)
    )
  )
  WHERE public.actor_can_read_sponsors(p_club_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_sponsor_dashboard_stats(UUID) TO authenticated;

-- Finance dashboard page bundle
CREATE OR REPLACE FUNCTION public.get_finance_dashboard_page(p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_totals JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.club_memberships cm
    WHERE cm.user_id = auth.uid()
      AND cm.club_id = p_club_id
      AND cm.status = 'active'
      AND cm.role::text IN ('owner', 'president', 'sports_director')
  ) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'total_income', COALESCE((SELECT SUM(amount) FROM public.finance_income WHERE club_id = p_club_id), 0),
    'total_expenses', COALESCE((SELECT SUM(amount) FROM public.finance_expenses WHERE club_id = p_club_id), 0),
    'sponsor_income', COALESCE((
      SELECT SUM(amount) FROM public.finance_income
      WHERE club_id = p_club_id AND category = 'sponsors'
    ), 0),
    'total_fees_due', COALESCE((SELECT SUM(amount_due) FROM public.finance_player_fees WHERE club_id = p_club_id), 0),
    'total_fees_paid', COALESCE((SELECT SUM(amount_paid) FROM public.finance_player_fees WHERE club_id = p_club_id), 0),
    'overdue_fees_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.finance_player_fees
      WHERE club_id = p_club_id AND amount_paid < amount_due AND due_date < CURRENT_DATE
    ), 0)
  ) INTO v_totals;

  RETURN jsonb_build_object(
    'totals', v_totals,
    'overdue_fees', COALESCE((
      SELECT jsonb_agg(row_to_json(f)::jsonb ORDER BY f.due_date)
      FROM (
        SELECT
          fpf.id,
          fpf.player_id,
          fpf.name,
          fpf.amount_due,
          fpf.amount_paid,
          fpf.due_date,
          fpf.status,
          p.first_name,
          p.last_name
        FROM public.finance_player_fees fpf
        LEFT JOIN public.players p ON p.id = fpf.player_id
        WHERE fpf.club_id = p_club_id
          AND fpf.status IN ('partial', 'overdue')
          AND fpf.due_date < CURRENT_DATE
        ORDER BY fpf.due_date
        LIMIT 20
      ) f
    ), '[]'::jsonb),
    'recent_income', COALESCE((
      SELECT jsonb_agg(row_to_json(i)::jsonb ORDER BY i.transaction_date DESC)
      FROM (
        SELECT fi.id, fi.amount, fi.transaction_date, fi.description, fi.category, fi.created_by
        FROM public.finance_income fi
        WHERE fi.club_id = p_club_id
        ORDER BY fi.transaction_date DESC
        LIMIT 5
      ) i
    ), '[]'::jsonb),
    'recent_expenses', COALESCE((
      SELECT jsonb_agg(row_to_json(e)::jsonb ORDER BY e.transaction_date DESC)
      FROM (
        SELECT fe.id, fe.amount, fe.transaction_date, fe.description, fe.category, fe.created_by
        FROM public.finance_expenses fe
        WHERE fe.club_id = p_club_id
        ORDER BY fe.transaction_date DESC
        LIMIT 5
      ) e
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_dashboard_page(UUID) TO authenticated;

-- AI manager snapshot: memory + pending approvals
CREATE OR REPLACE FUNCTION public.get_ai_manager_snapshot(p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'memory_summary', COALESCE((
      SELECT am.summary
      FROM public.ai_memory am
      WHERE am.club_id = p_club_id
        AND am.user_id = v_user_id
        AND am.conversation_id IS NULL
      ORDER BY am.updated_at DESC
      LIMIT 1
    ), ''),
    'pending_approvals', COALESCE((
      SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC)
      FROM (
        SELECT id, club_id, user_id, task_id, tool_call_id, risk_level, status, preview, created_at
        FROM public.ai_action_approvals
        WHERE club_id = p_club_id
          AND user_id = v_user_id
          AND status = 'pending'
        ORDER BY created_at DESC
      ) a
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_manager_snapshot(UUID) TO authenticated;



-- =============================================================================
-- Source: 20260615160000_stage1310_pwa_offline_context.sql
-- =============================================================================

-- ETAP 13.10 — slim single-RPC payload for PWA offline cache

CREATE OR REPLACE FUNCTION public.get_pwa_offline_context(p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.club_memberships
    WHERE user_id = v_user_id AND club_id = p_club_id AND status = 'active'
  ) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'profile', (
      SELECT jsonb_build_object(
        'id', p.id,
        'email', p.email,
        'full_name', p.full_name,
        'roles', COALESCE((
          SELECT jsonb_agg(cm.role ORDER BY cm.role)
          FROM public.club_memberships cm
          WHERE cm.user_id = v_user_id
            AND cm.club_id = p_club_id
            AND cm.status = 'active'
        ), '[]'::jsonb)
      )
      FROM public.profiles p
      WHERE p.id = v_user_id
    ),
    'club', (
      SELECT jsonb_build_object(
        'id', c.id,
        'slug', c.slug,
        'public_name', c.public_name
      )
      FROM public.clubs c
      WHERE c.id = p_club_id
    ),
    'teams', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('id', t.id, 'name', t.name)
        ORDER BY t.name
      )
      FROM public.teams t
      WHERE t.club_id = p_club_id
    ), '[]'::jsonb),
    'recent_matches', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'home_team_name', m.home_team_name,
          'away_team_name', m.away_team_name,
          'match_date', m.match_date,
          'status', m.status,
          'home_score', m.home_score,
          'away_score', m.away_score
        )
        ORDER BY m.match_date DESC
      )
      FROM (
        SELECT id, home_team_name, away_team_name, match_date, status, home_score, away_score
        FROM public.matches
        WHERE club_id = p_club_id
        ORDER BY match_date DESC
        LIMIT 10
      ) m
    ), '[]'::jsonb),
    'recent_trainings', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', tr.id,
          'name', tr.name,
          'training_date', tr.training_date,
          'status', tr.status,
          'team_id', tr.team_id
        )
        ORDER BY tr.training_date DESC
      )
      FROM (
        SELECT id, name, training_date, status, team_id
        FROM public.trainings
        WHERE club_id = p_club_id
        ORDER BY training_date DESC
        LIMIT 10
      ) tr
    ), '[]'::jsonb),
    'news', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'title', n.title,
          'slug', n.slug,
          'published_at', n.published_at
        )
        ORDER BY n.published_at DESC
      )
      FROM (
        SELECT id, title, slug, published_at
        FROM public.website_news
        WHERE club_id = p_club_id
          AND status = 'published'
        ORDER BY published_at DESC
        LIMIT 5
      ) n
    ), '[]'::jsonb),
    'primary_color', (
      SELECT ws.primary_color
      FROM public.website_settings ws
      WHERE ws.club_id = p_club_id
    ),
    'secondary_color', (
      SELECT ws.secondary_color
      FROM public.website_settings ws
      WHERE ws.club_id = p_club_id
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pwa_offline_context(UUID) TO authenticated;



-- =============================================================================
-- Source: 20260616120000_stage14_video_module.sql
-- =============================================================================

-- ETAP 14: AI Video Analysis — Video Center

ALTER TYPE public.club_role ADD VALUE IF NOT EXISTS 'scout';

CREATE TYPE public.video_category AS ENUM (
  'match',
  'training',
  'opponent_analysis',
  'educational'
);

CREATE TYPE public.video_job_status AS ENUM (
  'pending',
  'processing',
  'ready',
  'error'
);

CREATE TYPE public.video_report_type AS ENUM (
  'match',
  'training',
  'opponent'
);

CREATE TYPE public.video_event_type AS ENUM (
  'goal',
  'chance',
  'foul',
  'corner',
  'free_kick',
  'card',
  'substitution'
);

CREATE TYPE public.video_event_source AS ENUM (
  'manual',
  'ai_suggested',
  'ai_confirmed'
);

CREATE TYPE public.video_news_draft_status AS ENUM (
  'pending_approval',
  'approved',
  'rejected'
);

CREATE TYPE public.video_clip_category AS ENUM (
  'goal',
  'offensive',
  'defensive',
  'custom'
);

CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  category public.video_category NOT NULL DEFAULT 'match',
  storage_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  match_id UUID REFERENCES public.matches (id) ON DELETE SET NULL,
  training_id UUID REFERENCES public.trainings (id) ON DELETE SET NULL,
  opponent_name TEXT,
  job_status public.video_job_status NOT NULL DEFAULT 'pending',
  job_error TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  is_public_within_club BOOLEAN NOT NULL DEFAULT FALSE,
  recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  status public.video_job_status NOT NULL DEFAULT 'pending',
  step TEXT NOT NULL DEFAULT 'queued',
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.video_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  report_type public.video_report_type NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  key_moments JSONB NOT NULL DEFAULT '[]'::jsonb,
  coaching_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  extra_sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by_ai BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.video_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  event_type public.video_event_type NOT NULL,
  source public.video_event_source NOT NULL DEFAULT 'manual',
  timestamp_seconds INTEGER NOT NULL CHECK (timestamp_seconds >= 0),
  label TEXT,
  description TEXT,
  player_name TEXT,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.video_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  timestamp_seconds INTEGER NOT NULL CHECK (timestamp_seconds >= 0),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.video_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category public.video_clip_category NOT NULL DEFAULT 'custom',
  start_seconds INTEGER NOT NULL CHECK (start_seconds >= 0),
  end_seconds INTEGER NOT NULL CHECK (end_seconds > start_seconds),
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.video_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  note TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (video_id, shared_with_user_id)
);

CREATE TABLE public.video_news_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.video_reports (id) ON DELETE SET NULL,
  draft_type TEXT NOT NULL CHECK (draft_type IN ('club_news', 'facebook_post', 'match_summary')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status public.video_news_draft_status NOT NULL DEFAULT 'pending_approval',
  approved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX videos_club_category_idx ON public.videos (club_id, category, created_at DESC);
CREATE INDEX videos_club_status_idx ON public.videos (club_id, job_status);
CREATE INDEX video_jobs_video_idx ON public.video_jobs (video_id, created_at DESC);
CREATE INDEX video_reports_video_idx ON public.video_reports (video_id);
CREATE INDEX video_events_video_ts_idx ON public.video_events (video_id, timestamp_seconds);
CREATE INDEX video_notes_video_idx ON public.video_notes (video_id, timestamp_seconds);
CREATE INDEX video_clips_video_idx ON public.video_clips (video_id);
CREATE INDEX video_shares_user_idx ON public.video_shares (shared_with_user_id, club_id);
CREATE INDEX video_news_drafts_status_idx ON public.video_news_drafts (club_id, status);

CREATE TRIGGER videos_set_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER video_jobs_set_updated_at
  BEFORE UPDATE ON public.video_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER video_reports_set_updated_at
  BEFORE UPDATE ON public.video_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER video_events_set_updated_at
  BEFORE UPDATE ON public.video_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER video_notes_set_updated_at
  BEFORE UPDATE ON public.video_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER video_clips_set_updated_at
  BEFORE UPDATE ON public.video_clips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER video_news_drafts_set_updated_at
  BEFORE UPDATE ON public.video_news_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RBAC helpers
CREATE OR REPLACE FUNCTION public.actor_can_manage_videos(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','coach','scout']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_videos(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.user_has_club_role(
        p_club_id,
        ARRAY['owner','president','coach','scout']::public.club_role[]
      )
      OR EXISTS (
        SELECT 1 FROM public.video_shares vs
        WHERE vs.club_id = p_club_id
          AND vs.shared_with_user_id = auth.uid()
          AND (vs.expires_at IS NULL OR vs.expires_at > NOW())
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_video_row(p_video_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = p_video_id
      AND public.actor_can_read_videos(v.club_id)
      AND (
        public.actor_can_manage_videos(v.club_id)
        OR public.user_has_club_role(
          v.club_id,
          ARRAY['owner','president','coach','scout']::public.club_role[]
        )
        OR EXISTS (
          SELECT 1 FROM public.video_shares vs
          WHERE vs.video_id = v.id
            AND vs.shared_with_user_id = auth.uid()
            AND (vs.expires_at IS NULL OR vs.expires_at > NOW())
        )
      )
  );
$$;

-- RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_news_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY videos_select ON public.videos FOR SELECT TO authenticated
  USING (public.actor_can_access_video_row(id));

CREATE POLICY videos_manage ON public.videos FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

CREATE POLICY video_jobs_select ON public.video_jobs FOR SELECT TO authenticated
  USING (public.actor_can_access_video_row(video_id));

CREATE POLICY video_jobs_manage ON public.video_jobs FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

CREATE POLICY video_reports_select ON public.video_reports FOR SELECT TO authenticated
  USING (public.actor_can_access_video_row(video_id));

CREATE POLICY video_reports_manage ON public.video_reports FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

CREATE POLICY video_events_select ON public.video_events FOR SELECT TO authenticated
  USING (public.actor_can_access_video_row(video_id));

CREATE POLICY video_events_manage ON public.video_events FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

CREATE POLICY video_notes_select ON public.video_notes FOR SELECT TO authenticated
  USING (public.actor_can_access_video_row(video_id));

CREATE POLICY video_notes_manage ON public.video_notes FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

CREATE POLICY video_clips_select ON public.video_clips FOR SELECT TO authenticated
  USING (public.actor_can_access_video_row(video_id));

CREATE POLICY video_clips_manage ON public.video_clips FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

CREATE POLICY video_shares_select ON public.video_shares FOR SELECT TO authenticated
  USING (
    public.actor_can_manage_videos(club_id)
    OR shared_with_user_id = auth.uid()
  );

CREATE POLICY video_shares_manage ON public.video_shares FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

CREATE POLICY video_news_drafts_select ON public.video_news_drafts FOR SELECT TO authenticated
  USING (public.actor_can_read_videos(club_id));

CREATE POLICY video_news_drafts_manage ON public.video_news_drafts FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

-- Storage bucket for club videos (default 500 MB per file — configurable in app)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'club-videos',
  'club-videos',
  FALSE,
  524288000,
  ARRAY[
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska'
  ]::TEXT[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.storage_video_club_id_from_path(object_name TEXT)
RETURNS UUID
LANGUAGE sql IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 1), '')::UUID;
$$;

CREATE POLICY club_videos_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-videos'
    AND public.actor_can_read_videos(public.storage_video_club_id_from_path(name))
  );

CREATE POLICY club_videos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-videos'
    AND public.actor_can_manage_videos(public.storage_video_club_id_from_path(name))
  );

CREATE POLICY club_videos_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-videos'
    AND public.actor_can_manage_videos(public.storage_video_club_id_from_path(name))
  )
  WITH CHECK (
    bucket_id = 'club-videos'
    AND public.actor_can_manage_videos(public.storage_video_club_id_from_path(name))
  );

CREATE POLICY club_videos_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-videos'
    AND public.actor_can_manage_videos(public.storage_video_club_id_from_path(name))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_clips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_news_drafts TO authenticated;



-- =============================================================================
-- Source: 20260616122000_stage14_audit_hardening.sql
-- =============================================================================

-- ETAP 14 audit: RLS, storage per-video, spójność club_id, udostępniania

CREATE OR REPLACE FUNCTION public.storage_is_club_video_path(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT object_name ~ (
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/videos/'
    || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
  )
  AND position('..' IN object_name) = 0;
$$;

CREATE OR REPLACE FUNCTION public.storage_video_id_from_path(object_name TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 3), '')::UUID;
$$;

-- Odczyt klubowy tylko dla sztabu (bez eskalacji przez pojedynczy share)
CREATE OR REPLACE FUNCTION public.actor_can_read_videos(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','coach','scout']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_video_row(p_video_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.videos v
    WHERE v.id = p_video_id
      AND v.club_id IN (SELECT public.user_club_ids())
      AND (
        public.user_has_club_role(
          v.club_id,
          ARRAY['owner','president','coach','scout']::public.club_role[]
        )
        OR EXISTS (
          SELECT 1
          FROM public.video_shares vs
          WHERE vs.video_id = v.id
            AND vs.shared_with_user_id = auth.uid()
            AND (vs.expires_at IS NULL OR vs.expires_at > NOW())
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_video_storage_path(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.storage_is_club_video_path(object_name)
    AND public.actor_can_access_video_row(public.storage_video_id_from_path(object_name));
$$;

CREATE OR REPLACE FUNCTION public.actor_can_upload_video_storage_path(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.storage_is_club_video_path(object_name)
    AND public.actor_can_manage_videos(public.storage_video_club_id_from_path(object_name))
    AND EXISTS (
      SELECT 1
      FROM public.videos v
      WHERE v.id = public.storage_video_id_from_path(object_name)
        AND v.club_id = public.storage_video_club_id_from_path(object_name)
    );
$$;

CREATE OR REPLACE FUNCTION public.enforce_video_child_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.videos v
    WHERE v.id = NEW.video_id
      AND v.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'video_id does not belong to club_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_video_storage_path_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.storage_path IS NOT NULL THEN
    IF NOT public.storage_is_club_video_path(NEW.storage_path) THEN
      RAISE EXCEPTION 'invalid storage_path format';
    END IF;

    IF public.storage_video_club_id_from_path(NEW.storage_path) IS DISTINCT FROM NEW.club_id THEN
      RAISE EXCEPTION 'storage_path club_id mismatch';
    END IF;

    IF public.storage_video_id_from_path(NEW.storage_path) IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION 'storage_path video_id mismatch';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_video_share_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.club_memberships cm
    WHERE cm.club_id = NEW.club_id
      AND cm.user_id = NEW.shared_with_user_id
      AND cm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'shared_with_user_id is not an active club member';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS videos_enforce_storage_path ON public.videos;
CREATE TRIGGER videos_enforce_storage_path
  BEFORE INSERT OR UPDATE OF storage_path, club_id, id ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_storage_path_consistency();

DROP TRIGGER IF EXISTS video_jobs_enforce_club ON public.video_jobs;
CREATE TRIGGER video_jobs_enforce_club
  BEFORE INSERT OR UPDATE OF video_id, club_id ON public.video_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_child_club_consistency();

DROP TRIGGER IF EXISTS video_reports_enforce_club ON public.video_reports;
CREATE TRIGGER video_reports_enforce_club
  BEFORE INSERT OR UPDATE OF video_id, club_id ON public.video_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_child_club_consistency();

DROP TRIGGER IF EXISTS video_events_enforce_club ON public.video_events;
CREATE TRIGGER video_events_enforce_club
  BEFORE INSERT OR UPDATE OF video_id, club_id ON public.video_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_child_club_consistency();

DROP TRIGGER IF EXISTS video_notes_enforce_club ON public.video_notes;
CREATE TRIGGER video_notes_enforce_club
  BEFORE INSERT OR UPDATE OF video_id, club_id ON public.video_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_child_club_consistency();

DROP TRIGGER IF EXISTS video_clips_enforce_club ON public.video_clips;
CREATE TRIGGER video_clips_enforce_club
  BEFORE INSERT OR UPDATE OF video_id, club_id ON public.video_clips
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_child_club_consistency();

DROP TRIGGER IF EXISTS video_shares_enforce_club ON public.video_shares;
CREATE TRIGGER video_shares_enforce_club
  BEFORE INSERT OR UPDATE OF video_id, club_id ON public.video_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_child_club_consistency();

DROP TRIGGER IF EXISTS video_shares_enforce_recipient ON public.video_shares;
CREATE TRIGGER video_shares_enforce_recipient
  BEFORE INSERT OR UPDATE OF shared_with_user_id, club_id ON public.video_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_share_recipient();

DROP TRIGGER IF EXISTS video_news_drafts_enforce_club ON public.video_news_drafts;
CREATE TRIGGER video_news_drafts_enforce_club
  BEFORE INSERT OR UPDATE OF video_id, club_id ON public.video_news_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_child_club_consistency();

DROP POLICY IF EXISTS video_news_drafts_select ON public.video_news_drafts;
CREATE POLICY video_news_drafts_select ON public.video_news_drafts FOR SELECT TO authenticated
  USING (
    public.actor_can_manage_videos(club_id)
    OR public.user_has_club_role(
      club_id,
      ARRAY['owner','president','coach']::public.club_role[]
    )
  );

DROP POLICY IF EXISTS club_videos_select ON storage.objects;
DROP POLICY IF EXISTS club_videos_insert ON storage.objects;
DROP POLICY IF EXISTS club_videos_update ON storage.objects;
DROP POLICY IF EXISTS club_videos_delete ON storage.objects;

CREATE POLICY club_videos_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-videos'
    AND public.actor_can_read_video_storage_path(name)
  );

CREATE POLICY club_videos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-videos'
    AND public.actor_can_upload_video_storage_path(name)
  );

CREATE POLICY club_videos_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-videos'
    AND public.actor_can_upload_video_storage_path(name)
  )
  WITH CHECK (
    bucket_id = 'club-videos'
    AND public.actor_can_upload_video_storage_path(name)
  );

CREATE POLICY club_videos_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-videos'
    AND public.actor_can_manage_videos(public.storage_video_club_id_from_path(name))
    AND public.storage_is_club_video_path(name)
  );



-- =============================================================================
-- Source: 20260617120000_stage15a_content_hub.sql
-- =============================================================================

-- ETAP 15A: Content Hub — centralny system publikacji treści

CREATE TYPE public.content_type AS ENUM (
  'news',
  'match_report',
  'match_preview',
  'round_summary',
  'sponsor_post',
  'anniversary_post',
  'club_announcement',
  'photo_gallery',
  'ai_report'
);

CREATE TYPE public.content_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'published',
  'rejected'
);

CREATE TYPE public.content_channel AS ENUM (
  'website',
  'facebook',
  'instagram',
  'sponsor',
  'club_announcement'
);

CREATE TYPE public.content_channel_status AS ENUM (
  'draft',
  'queued',
  'approved',
  'published'
);

CREATE TYPE public.content_approval_action AS ENUM (
  'submitted',
  'approved',
  'rejected',
  'published'
);

CREATE TYPE public.content_asset_type AS ENUM (
  'photo',
  'graphic',
  'video_clip'
);

CREATE TYPE public.content_ai_source AS ENUM (
  'manual',
  'agent',
  'generator',
  'video',
  'match'
);

CREATE TABLE public.content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  content_type public.content_type NOT NULL,
  status public.content_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  slug TEXT,
  summary TEXT,
  body_website TEXT,
  match_id UUID REFERENCES public.matches (id) ON DELETE SET NULL,
  video_id UUID REFERENCES public.videos (id) ON DELETE SET NULL,
  video_report_id UUID REFERENCES public.video_reports (id) ON DELETE SET NULL,
  sponsor_id UUID REFERENCES public.sponsors (id) ON DELETE SET NULL,
  website_news_id UUID REFERENCES public.website_news (id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_note TEXT,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, slug)
);

CREATE TABLE public.content_channel_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.content_posts (id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  channel public.content_channel NOT NULL,
  title TEXT,
  body TEXT NOT NULL DEFAULT '',
  status public.content_channel_status NOT NULL DEFAULT 'draft',
  queue_position INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (post_id, channel)
);

CREATE TABLE public.content_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  channel public.content_channel NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_queue BOOLEAN NOT NULL DEFAULT FALSE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, channel)
);

CREATE TABLE public.content_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.content_posts (id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  channel_variant_id UUID REFERENCES public.content_channel_variants (id) ON DELETE SET NULL,
  action public.content_approval_action NOT NULL,
  actor_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.content_posts (id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.content_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.content_posts (id) ON DELETE SET NULL,
  asset_type public.content_asset_type NOT NULL,
  title TEXT NOT NULL,
  storage_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  video_id UUID REFERENCES public.videos (id) ON DELETE SET NULL,
  video_clip_id UUID REFERENCES public.video_clips (id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.content_ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.content_posts (id) ON DELETE SET NULL,
  generation_type TEXT NOT NULL,
  prompt_summary TEXT NOT NULL,
  model TEXT,
  source public.content_ai_source NOT NULL DEFAULT 'manual',
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX content_posts_club_status_idx ON public.content_posts (club_id, status, created_at DESC);
CREATE INDEX content_posts_club_type_idx ON public.content_posts (club_id, content_type);
CREATE INDEX content_posts_scheduled_idx ON public.content_posts (club_id, scheduled_at);
CREATE INDEX content_posts_sponsor_idx ON public.content_posts (sponsor_id) WHERE sponsor_id IS NOT NULL;
CREATE INDEX content_channel_variants_queue_idx ON public.content_channel_variants (club_id, channel, status, queue_position);
CREATE INDEX content_calendar_scheduled_idx ON public.content_calendar (club_id, scheduled_at);
CREATE INDEX content_assets_club_idx ON public.content_assets (club_id, asset_type, created_at DESC);
CREATE INDEX content_approvals_post_idx ON public.content_approvals (post_id, created_at DESC);
CREATE INDEX content_ai_generations_club_idx ON public.content_ai_generations (club_id, created_at DESC);

CREATE TRIGGER content_posts_set_updated_at
  BEFORE UPDATE ON public.content_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER content_channel_variants_set_updated_at
  BEFORE UPDATE ON public.content_channel_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER content_channels_set_updated_at
  BEFORE UPDATE ON public.content_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER content_calendar_set_updated_at
  BEFORE UPDATE ON public.content_calendar
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER content_assets_set_updated_at
  BEFORE UPDATE ON public.content_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RBAC helpers
CREATE OR REPLACE FUNCTION public.actor_can_manage_content(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','website_admin']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_create_content(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','website_admin','coach']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_content(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_create_content(p_club_id)
      OR public.user_has_club_role(p_club_id, ARRAY['sponsor']::public.club_role[])
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_publish_content(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_manage_content(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_content_post(p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.content_posts cp
    WHERE cp.id = p_post_id
      AND cp.club_id IN (SELECT public.user_club_ids())
      AND (
        public.actor_can_create_content(cp.club_id)
        OR (
          public.actor_is_sponsor_user(cp.club_id)
          AND cp.sponsor_id IS NOT NULL
          AND cp.sponsor_id = public.sponsor_id_for_user(cp.club_id, auth.uid())
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_content_post_child_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.content_posts cp
    WHERE cp.id = NEW.post_id AND cp.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'post_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_content_publish_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Seed/migracje (brak auth.uid())
  IF auth.uid() IS NULL THEN
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    IF NOT public.actor_can_publish_content(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role to publish content';
    END IF;
    IF NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
  END IF;

  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF NOT public.actor_can_publish_content(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role to approve content';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_posts_enforce_publish ON public.content_posts;
CREATE TRIGGER content_posts_enforce_publish
  BEFORE INSERT OR UPDATE OF status, published_at ON public.content_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_publish_role();

DROP TRIGGER IF EXISTS content_channel_variants_enforce_club ON public.content_channel_variants;
CREATE TRIGGER content_channel_variants_enforce_club
  BEFORE INSERT OR UPDATE OF post_id, club_id ON public.content_channel_variants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_post_child_club_consistency();

DROP TRIGGER IF EXISTS content_approvals_enforce_club ON public.content_approvals;
CREATE TRIGGER content_approvals_enforce_club
  BEFORE INSERT OR UPDATE OF post_id, club_id ON public.content_approvals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_post_child_club_consistency();

DROP TRIGGER IF EXISTS content_calendar_enforce_club ON public.content_calendar;
CREATE TRIGGER content_calendar_enforce_club
  BEFORE INSERT OR UPDATE OF post_id, club_id ON public.content_calendar
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_post_child_club_consistency();

-- RLS
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_channel_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_posts_select ON public.content_posts FOR SELECT TO authenticated
  USING (public.actor_can_access_content_post(id));

CREATE POLICY content_posts_insert ON public.content_posts FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_create_content(club_id));

CREATE POLICY content_posts_update ON public.content_posts FOR UPDATE TO authenticated
  USING (public.actor_can_access_content_post(id))
  WITH CHECK (
    public.actor_can_create_content(club_id)
    AND (
      public.actor_can_publish_content(club_id)
      OR status IN ('draft', 'pending_approval')
    )
  );

CREATE POLICY content_posts_delete ON public.content_posts FOR DELETE TO authenticated
  USING (public.actor_can_manage_content(club_id));

CREATE POLICY content_channel_variants_select ON public.content_channel_variants FOR SELECT TO authenticated
  USING (public.actor_can_access_content_post(post_id));

CREATE POLICY content_channel_variants_manage ON public.content_channel_variants FOR ALL TO authenticated
  USING (public.actor_can_create_content(club_id))
  WITH CHECK (public.actor_can_create_content(club_id));

CREATE POLICY content_channels_select ON public.content_channels FOR SELECT TO authenticated
  USING (public.actor_can_read_content(club_id));

CREATE POLICY content_channels_manage ON public.content_channels FOR ALL TO authenticated
  USING (public.actor_can_manage_content(club_id))
  WITH CHECK (public.actor_can_manage_content(club_id));

CREATE POLICY content_approvals_select ON public.content_approvals FOR SELECT TO authenticated
  USING (public.actor_can_access_content_post(post_id));

CREATE POLICY content_approvals_insert ON public.content_approvals FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_create_content(club_id));

CREATE POLICY content_calendar_select ON public.content_calendar FOR SELECT TO authenticated
  USING (public.actor_can_access_content_post(post_id));

CREATE POLICY content_calendar_manage ON public.content_calendar FOR ALL TO authenticated
  USING (public.actor_can_create_content(club_id))
  WITH CHECK (public.actor_can_create_content(club_id));

CREATE POLICY content_assets_select ON public.content_assets FOR SELECT TO authenticated
  USING (
    public.actor_can_read_content(club_id)
    AND (
      public.actor_can_create_content(club_id)
      OR post_id IS NULL
    )
  );

CREATE POLICY content_assets_manage ON public.content_assets FOR ALL TO authenticated
  USING (public.actor_can_create_content(club_id))
  WITH CHECK (public.actor_can_create_content(club_id));

CREATE POLICY content_ai_generations_select ON public.content_ai_generations FOR SELECT TO authenticated
  USING (public.actor_can_read_content(club_id));

CREATE POLICY content_ai_generations_insert ON public.content_ai_generations FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_create_content(club_id));

-- Storage path: club-assets/{clubId}/content/...
CREATE OR REPLACE FUNCTION public.storage_is_club_content_asset_path(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT object_name ~ (
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/content/'
  )
  AND position('..' IN object_name) = 0;
$$;

CREATE POLICY club_content_assets_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND public.storage_is_club_content_asset_path(name)
    AND public.storage_club_id_from_path(name) IN (SELECT public.user_club_ids())
    AND public.actor_can_read_content(public.storage_club_id_from_path(name))
  );

CREATE POLICY club_content_assets_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets'
    AND public.storage_is_club_content_asset_path(name)
    AND public.actor_can_create_content(public.storage_club_id_from_path(name))
  );

CREATE POLICY club_content_assets_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND public.storage_is_club_content_asset_path(name)
    AND public.actor_can_create_content(public.storage_club_id_from_path(name))
  )
  WITH CHECK (
    bucket_id = 'club-assets'
    AND public.storage_is_club_content_asset_path(name)
    AND public.actor_can_create_content(public.storage_club_id_from_path(name))
  );

CREATE POLICY club_content_assets_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND public.storage_is_club_content_asset_path(name)
    AND public.actor_can_manage_content(public.storage_club_id_from_path(name))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_channel_variants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_channels TO authenticated;
GRANT SELECT, INSERT ON public.content_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_calendar TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_assets TO authenticated;
GRANT SELECT, INSERT ON public.content_ai_generations TO authenticated;

-- Default channels per club (existing clubs)
-- [stripped: club INSERT]



-- =============================================================================
-- Source: 20260617121500_stage15a_seed_trigger_fix.sql
-- =============================================================================

-- Fix seed: allow migrations without auth.uid()

CREATE OR REPLACE FUNCTION public.enforce_content_publish_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    IF NOT public.actor_can_publish_content(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role to publish content';
    END IF;
    IF NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
  END IF;

  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF NOT public.actor_can_publish_content(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role to approve content';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;



-- =============================================================================
-- Source: 20260617123000_stage15a_audit_hardening.sql
-- =============================================================================

-- ETAP 15A audit: channel variant status, spójność referencji, RLS sponsorów, audyt approvals

CREATE OR REPLACE FUNCTION public.enforce_content_post_reference_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.match_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'match_id does not belong to club_id';
    END IF;
  END IF;

  IF NEW.video_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = NEW.video_id AND v.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'video_id does not belong to club_id';
    END IF;
  END IF;

  IF NEW.sponsor_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sponsors s
      WHERE s.id = NEW.sponsor_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'sponsor_id does not belong to club_id';
    END IF;
  END IF;

  IF NEW.video_report_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.video_reports vr
      WHERE vr.id = NEW.video_report_id AND vr.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'video_report_id does not belong to club_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_content_asset_reference_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.content_posts cp
      WHERE cp.id = NEW.post_id AND cp.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'post_id does not belong to club_id';
    END IF;
  END IF;

  IF NEW.video_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = NEW.video_id AND v.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'video_id does not belong to club_id';
    END IF;
  END IF;

  IF NEW.video_clip_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.video_clips vc
      JOIN public.videos v ON v.id = vc.video_id
      WHERE vc.id = NEW.video_clip_id AND v.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'video_clip_id does not belong to club_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_content_channel_variant_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('approved', 'published') THEN
    IF NOT public.actor_can_publish_content(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role for channel variant status %', NEW.status;
    END IF;
  END IF;

  IF NEW.status = 'queued' THEN
    IF NOT public.actor_can_manage_content(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role to queue channel variant';
    END IF;
  END IF;

  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := timezone('utc', now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_posts_enforce_references ON public.content_posts;
CREATE TRIGGER content_posts_enforce_references
  BEFORE INSERT OR UPDATE OF match_id, video_id, sponsor_id, video_report_id, club_id
  ON public.content_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_post_reference_consistency();

DROP TRIGGER IF EXISTS content_assets_enforce_references ON public.content_assets;
CREATE TRIGGER content_assets_enforce_references
  BEFORE INSERT OR UPDATE OF post_id, video_id, video_clip_id, club_id
  ON public.content_assets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_asset_reference_consistency();

DROP TRIGGER IF EXISTS content_channel_variants_enforce_status ON public.content_channel_variants;
CREATE TRIGGER content_channel_variants_enforce_status
  BEFORE INSERT OR UPDATE OF status, published_at
  ON public.content_channel_variants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_channel_variant_status();

-- Warianty kanałów: coach tylko draft; publikacja/kolejka wymaga roli
DROP POLICY IF EXISTS content_channel_variants_manage ON public.content_channel_variants;

CREATE POLICY content_channel_variants_insert ON public.content_channel_variants FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_create_content(club_id));

CREATE POLICY content_channel_variants_update ON public.content_channel_variants FOR UPDATE TO authenticated
  USING (public.actor_can_access_content_post(post_id))
  WITH CHECK (
    public.actor_can_create_content(club_id)
    AND (
      public.actor_can_publish_content(club_id)
      OR status = 'draft'
    )
  );

CREATE POLICY content_channel_variants_delete ON public.content_channel_variants FOR DELETE TO authenticated
  USING (public.actor_can_manage_content(club_id));

-- Audyt: coach może logować tylko submitted
DROP POLICY IF EXISTS content_approvals_insert ON public.content_approvals;
CREATE POLICY content_approvals_insert ON public.content_approvals FOR INSERT TO authenticated
  WITH CHECK (
    public.actor_can_create_content(club_id)
    AND (
      action = 'submitted'
      OR public.actor_can_publish_content(club_id)
    )
  );

-- Sponsor widzi assety tylko powiązane z własnymi postami
DROP POLICY IF EXISTS content_assets_select ON public.content_assets;
CREATE POLICY content_assets_select ON public.content_assets FOR SELECT TO authenticated
  USING (
    public.actor_can_read_content(club_id)
    AND (
      public.actor_can_create_content(club_id)
      OR (
        public.actor_is_sponsor_user(club_id)
        AND post_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.content_posts cp
          WHERE cp.id = post_id
            AND cp.sponsor_id = public.sponsor_id_for_user(club_id, auth.uid())
        )
      )
    )
  );



-- =============================================================================
-- Source: 20260618120000_stage15b_league_hub.sql
-- =============================================================================

-- ETAP 15B: League Hub — centralne zarządzanie rozgrywkami

CREATE TYPE public.league_source_adapter AS ENUM (
  'csv',
  'json',
  'xlsx',
  'api',
  'extranet',
  'manual'
);

CREATE TYPE public.league_sync_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE public.league_import_type AS ENUM (
  'league_table',
  'fixtures',
  'results',
  'full'
);

CREATE TYPE public.league_match_sync_status AS ENUM (
  'pending',
  'synced',
  'conflict',
  'error',
  'skipped'
);

CREATE TYPE public.league_conflict_status AS ENUM (
  'pending',
  'keep_local',
  'keep_external',
  'merged',
  'dismissed'
);

CREATE TABLE public.league_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, name)
);

CREATE TABLE public.league_competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.league_seasons (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_label TEXT,
  provider TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, season_id, name)
);

CREATE TABLE public.league_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  competition_id UUID REFERENCES public.league_competitions (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  adapter public.league_source_adapter NOT NULL DEFAULT 'manual',
  provider_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.league_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.league_competitions (id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  league_name TEXT NOT NULL,
  external_id TEXT,
  is_own_club BOOLEAN NOT NULL DEFAULT FALSE,
  provider TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, competition_id, league_name)
);

CREATE TABLE public.league_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.league_sources (id) ON DELETE SET NULL,
  competition_id UUID REFERENCES public.league_competitions (id) ON DELETE SET NULL,
  import_type public.league_import_type NOT NULL,
  status public.league_sync_status NOT NULL DEFAULT 'pending',
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  records_conflicts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  triggered_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.league_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.league_sync_jobs (id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.league_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.league_competitions (id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.league_seasons (id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.league_sources (id) ON DELETE SET NULL,
  sync_job_id UUID REFERENCES public.league_sync_jobs (id) ON DELETE SET NULL,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  team_name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  goal_difference INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  is_own_club BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE public.league_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.league_competitions (id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.league_seasons (id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.league_sources (id) ON DELETE SET NULL,
  sync_job_id UUID REFERENCES public.league_sync_jobs (id) ON DELETE SET NULL,
  external_key TEXT NOT NULL,
  round_number INTEGER,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL DEFAULT '15:00',
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  sync_status public.league_match_sync_status NOT NULL DEFAULT 'pending',
  match_id UUID REFERENCES public.matches (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, competition_id, external_key)
);

CREATE TABLE public.league_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  league_match_id UUID NOT NULL REFERENCES public.league_matches (id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches (id) ON DELETE SET NULL,
  field_name TEXT NOT NULL,
  local_value TEXT,
  external_value TEXT,
  status public.league_conflict_status NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.league_player_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  competition_id UUID REFERENCES public.league_competitions (id) ON DELETE SET NULL,
  season_id UUID REFERENCES public.league_seasons (id) ON DELETE SET NULL,
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  league_player_name TEXT NOT NULL,
  league_team_name TEXT,
  external_id TEXT,
  jersey_number INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX league_seasons_club_idx ON public.league_seasons (club_id, is_active);
CREATE INDEX league_competitions_season_idx ON public.league_competitions (club_id, season_id);
CREATE INDEX league_teams_competition_idx ON public.league_teams (club_id, competition_id);
CREATE INDEX league_tables_snapshot_idx ON public.league_tables (club_id, competition_id, snapshot_at DESC);
CREATE INDEX league_matches_date_idx ON public.league_matches (club_id, competition_id, match_date);
CREATE INDEX league_matches_sync_idx ON public.league_matches (club_id, sync_status);
CREATE INDEX league_sync_jobs_club_idx ON public.league_sync_jobs (club_id, created_at DESC);
CREATE INDEX league_sync_logs_job_idx ON public.league_sync_logs (job_id, created_at);
CREATE INDEX league_conflicts_pending_idx ON public.league_conflicts (club_id, status) WHERE status = 'pending';
CREATE INDEX league_player_registry_club_idx ON public.league_player_registry (club_id, league_player_name);

CREATE TRIGGER league_seasons_set_updated_at
  BEFORE UPDATE ON public.league_seasons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER league_competitions_set_updated_at
  BEFORE UPDATE ON public.league_competitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER league_sources_set_updated_at
  BEFORE UPDATE ON public.league_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER league_teams_set_updated_at
  BEFORE UPDATE ON public.league_teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER league_matches_set_updated_at
  BEFORE UPDATE ON public.league_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER league_player_registry_set_updated_at
  BEFORE UPDATE ON public.league_player_registry
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RBAC
CREATE OR REPLACE FUNCTION public.actor_can_read_league(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach','player']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_league(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_can_sync_league(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_manage_league(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.enforce_league_child_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'league_competitions' THEN
    IF NOT EXISTS (SELECT 1 FROM public.league_seasons s WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id';
    END IF;
  ELSIF TG_TABLE_NAME = 'league_teams' OR TG_TABLE_NAME = 'league_matches' OR TG_TABLE_NAME = 'league_tables' THEN
    IF NOT EXISTS (SELECT 1 FROM public.league_competitions c WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id) THEN
      RAISE EXCEPTION 'competition_id does not belong to club_id';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'league_matches' OR TG_TABLE_NAME = 'league_tables' THEN
    IF NOT EXISTS (SELECT 1 FROM public.league_seasons s WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'league_matches' THEN
    IF NEW.match_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.matches m WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id) THEN
        RAISE EXCEPTION 'match_id does not belong to club_id';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER league_competitions_enforce_club
  BEFORE INSERT OR UPDATE OF season_id, club_id ON public.league_competitions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_child_club_consistency();

CREATE TRIGGER league_teams_enforce_club
  BEFORE INSERT OR UPDATE OF competition_id, club_id ON public.league_teams
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_child_club_consistency();

CREATE TRIGGER league_matches_enforce_club
  BEFORE INSERT OR UPDATE OF competition_id, season_id, match_id, club_id ON public.league_matches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_child_club_consistency();

CREATE TRIGGER league_tables_enforce_club
  BEFORE INSERT OR UPDATE OF competition_id, season_id, club_id ON public.league_tables
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_child_club_consistency();

-- RLS
ALTER TABLE public.league_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_player_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY league_seasons_select ON public.league_seasons FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_seasons_manage ON public.league_seasons FOR ALL TO authenticated
  USING (public.actor_can_manage_league(club_id))
  WITH CHECK (public.actor_can_manage_league(club_id));

CREATE POLICY league_competitions_select ON public.league_competitions FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_competitions_manage ON public.league_competitions FOR ALL TO authenticated
  USING (public.actor_can_manage_league(club_id))
  WITH CHECK (public.actor_can_manage_league(club_id));

CREATE POLICY league_sources_select ON public.league_sources FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_sources_manage ON public.league_sources FOR ALL TO authenticated
  USING (public.actor_can_manage_league(club_id))
  WITH CHECK (public.actor_can_manage_league(club_id));

CREATE POLICY league_teams_select ON public.league_teams FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_teams_manage ON public.league_teams FOR ALL TO authenticated
  USING (public.actor_can_manage_league(club_id))
  WITH CHECK (public.actor_can_manage_league(club_id));

CREATE POLICY league_sync_jobs_select ON public.league_sync_jobs FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_sync_jobs_insert ON public.league_sync_jobs FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_sync_league(club_id));
CREATE POLICY league_sync_jobs_update ON public.league_sync_jobs FOR UPDATE TO authenticated
  USING (public.actor_can_sync_league(club_id))
  WITH CHECK (public.actor_can_sync_league(club_id));

CREATE POLICY league_sync_logs_select ON public.league_sync_logs FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_sync_logs_insert ON public.league_sync_logs FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_sync_league(club_id));

CREATE POLICY league_tables_select ON public.league_tables FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_tables_manage ON public.league_tables FOR ALL TO authenticated
  USING (public.actor_can_sync_league(club_id))
  WITH CHECK (public.actor_can_sync_league(club_id));

CREATE POLICY league_matches_select ON public.league_matches FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_matches_manage ON public.league_matches FOR ALL TO authenticated
  USING (public.actor_can_sync_league(club_id))
  WITH CHECK (public.actor_can_sync_league(club_id));

CREATE POLICY league_conflicts_select ON public.league_conflicts FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_conflicts_manage ON public.league_conflicts FOR ALL TO authenticated
  USING (public.actor_can_manage_league(club_id))
  WITH CHECK (public.actor_can_manage_league(club_id));

CREATE POLICY league_player_registry_select ON public.league_player_registry FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_player_registry_manage ON public.league_player_registry FOR ALL TO authenticated
  USING (public.actor_can_manage_league(club_id))
  WITH CHECK (public.actor_can_manage_league(club_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_seasons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_competitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_teams TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.league_sync_jobs TO authenticated;
GRANT SELECT, INSERT ON public.league_sync_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_tables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_matches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_conflicts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_player_registry TO authenticated;



-- =============================================================================
-- Source: 20260618123000_stage15b_audit_hardening.sql
-- =============================================================================

-- ETAP 15B audit hardening: spójność club_id, sezon↔rozgrywki, konflikty, GRANTs

-- ---------------------------------------------------------------------------
-- Rozszerzenie enforce_league_child_club_consistency
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_league_child_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'league_competitions' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.league_seasons s
      WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id';
    END IF;

  ELSIF TG_TABLE_NAME = 'league_sources' THEN
    IF NEW.competition_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'competition_id does not belong to club_id on league_sources';
    END IF;

  ELSIF TG_TABLE_NAME = 'league_teams' OR TG_TABLE_NAME = 'league_matches' OR TG_TABLE_NAME = 'league_tables' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'competition_id does not belong to club_id';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'league_matches' OR TG_TABLE_NAME = 'league_tables' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.league_seasons s
      WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id
        AND c.season_id = NEW.season_id
        AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not match competition season';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'league_matches' THEN
    IF NEW.match_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id
      ) THEN
        RAISE EXCEPTION 'match_id does not belong to club_id';
      END IF;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'league_player_registry' THEN
    IF NEW.player_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.players p
        WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
      ) THEN
        RAISE EXCEPTION 'player_id does not belong to club_id';
      END IF;
    END IF;

    IF NEW.competition_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'competition_id does not belong to club_id on league_player_registry';
    END IF;

    IF NEW.season_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.league_seasons s
      WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id on league_player_registry';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS league_sources_enforce_club ON public.league_sources;
CREATE TRIGGER league_sources_enforce_club
  BEFORE INSERT OR UPDATE OF competition_id, club_id ON public.league_sources
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_child_club_consistency();

DROP TRIGGER IF EXISTS league_player_registry_enforce_club ON public.league_player_registry;
CREATE TRIGGER league_player_registry_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, competition_id, season_id, club_id ON public.league_player_registry
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_child_club_consistency();

-- ---------------------------------------------------------------------------
-- league_sync_jobs / league_sync_logs spójność
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_league_sync_job_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.competition_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.league_competitions c
    WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'competition_id does not belong to club_id on league_sync_jobs';
  END IF;

  IF NEW.source_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.league_sources s
    WHERE s.id = NEW.source_id AND s.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'source_id does not belong to club_id on league_sync_jobs';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS league_sync_jobs_enforce_club ON public.league_sync_jobs;
CREATE TRIGGER league_sync_jobs_enforce_club
  BEFORE INSERT OR UPDATE OF competition_id, source_id, club_id ON public.league_sync_jobs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_sync_job_consistency();

CREATE OR REPLACE FUNCTION public.enforce_league_sync_log_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.league_sync_jobs j
    WHERE j.id = NEW.job_id AND j.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'job_id does not belong to club_id on league_sync_logs';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS league_sync_logs_enforce_club ON public.league_sync_logs;
CREATE TRIGGER league_sync_logs_enforce_club
  BEFORE INSERT OR UPDATE OF job_id, club_id ON public.league_sync_logs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_sync_log_consistency();

-- ---------------------------------------------------------------------------
-- league_conflicts spójność + unikalność pending
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_league_conflict_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.league_matches m
    WHERE m.id = NEW.league_match_id AND m.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'league_match_id does not belong to club_id';
  END IF;

  IF NEW.match_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.matches mt
    WHERE mt.id = NEW.match_id AND mt.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'match_id does not belong to club_id on league_conflicts';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status <> 'pending' AND NEW.status = 'pending' THEN
    RAISE EXCEPTION 'cannot reopen resolved league conflict';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS league_conflicts_enforce_club ON public.league_conflicts;
CREATE TRIGGER league_conflicts_enforce_club
  BEFORE INSERT OR UPDATE ON public.league_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_conflict_consistency();

CREATE UNIQUE INDEX IF NOT EXISTS league_conflicts_pending_uniq
  ON public.league_conflicts (league_match_id, field_name)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- GRANT EXECUTE (RLS helpers)
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.actor_can_read_league(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_league(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_sync_league(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Rozdzielenie RLS league_conflicts — sync INSERT, manage UPDATE/DELETE
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS league_conflicts_manage ON public.league_conflicts;

CREATE POLICY league_conflicts_insert ON public.league_conflicts FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_sync_league(club_id));

CREATE POLICY league_conflicts_update ON public.league_conflicts FOR UPDATE TO authenticated
  USING (public.actor_can_manage_league(club_id))
  WITH CHECK (public.actor_can_manage_league(club_id));

CREATE POLICY league_conflicts_delete ON public.league_conflicts FOR DELETE TO authenticated
  USING (public.actor_can_manage_league(club_id));



-- =============================================================================
-- Source: 20260618124000_stage15b_trigger_fix.sql
-- =============================================================================

-- Fix: nested IF for table-specific NEW fields (PL/pgSQL evaluates AND operands on all trigger tables)

CREATE OR REPLACE FUNCTION public.enforce_league_child_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'league_competitions' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.league_seasons s
      WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id';
    END IF;

  ELSIF TG_TABLE_NAME = 'league_sources' THEN
    IF NEW.competition_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'competition_id does not belong to club_id on league_sources';
    END IF;

  ELSIF TG_TABLE_NAME = 'league_teams' OR TG_TABLE_NAME = 'league_matches' OR TG_TABLE_NAME = 'league_tables' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'competition_id does not belong to club_id';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'league_matches' OR TG_TABLE_NAME = 'league_tables' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.league_seasons s
      WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id
        AND c.season_id = NEW.season_id
        AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not match competition season';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'league_matches' THEN
    IF NEW.match_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id
      ) THEN
        RAISE EXCEPTION 'match_id does not belong to club_id';
      END IF;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'league_player_registry' THEN
    IF NEW.player_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.players p
        WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
      ) THEN
        RAISE EXCEPTION 'player_id does not belong to club_id';
      END IF;
    END IF;

    IF NEW.competition_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'competition_id does not belong to club_id on league_player_registry';
    END IF;

    IF NEW.season_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.league_seasons s
      WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id on league_player_registry';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;



-- =============================================================================
-- Source: 20260631200000_public_players_stats_fix.sql
-- =============================================================================

-- Kadra publiczna: statystyki z player_stats (bieżący sezon) + fallback z league_player_registry.

CREATE OR REPLACE FUNCTION public.get_public_players(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH active_season AS (
    SELECT ls.name
    FROM public.clubs c
    JOIN public.league_seasons ls ON ls.club_id = c.id AND ls.is_active = TRUE
    WHERE c.slug = p_club_slug
      AND c.status = 'active'
      AND public.website_is_public(c.id)
    ORDER BY ls.updated_at DESC NULLS LAST
    LIMIT 1
  )
  SELECT COALESCE(jsonb_agg(row ORDER BY jersey_number NULLS LAST, last_name, first_name), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'firstName', p.first_name,
      'lastName', p.last_name,
      'jerseyNumber', p.jersey_number,
      'position', p.primary_position,
      'goals', GREATEST(
        COALESCE(SUM(ps.goals) FILTER (WHERE ps.season = COALESCE((SELECT name FROM active_season), '2025/2026')), 0),
        COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'goals')::int), 0)
      ),
      'assists', GREATEST(
        COALESCE(SUM(ps.assists) FILTER (WHERE ps.season = COALESCE((SELECT name FROM active_season), '2025/2026')), 0),
        COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'assists')::int), 0)
      ),
      'matchesPlayed', GREATEST(
        COALESCE(SUM(ps.matches_played) FILTER (WHERE ps.season = COALESCE((SELECT name FROM active_season), '2025/2026')), 0),
        COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'appearances')::int), 0)
      )
    ) AS row,
    p.jersey_number,
    p.last_name,
    p.first_name
    FROM public.clubs c
    JOIN public.players p ON p.club_id = c.id AND p.status = 'active'
    LEFT JOIN public.player_stats ps ON ps.player_id = p.id AND ps.club_id = c.id
    LEFT JOIN public.league_player_registry lpr ON lpr.player_id = p.id AND lpr.club_id = c.id
    WHERE c.slug = p_club_slug
      AND c.status = 'active'
      AND public.website_is_public(c.id)
    GROUP BY p.id, p.first_name, p.last_name, p.jersey_number, p.primary_position
  ) sub;
$$;

CREATE OR REPLACE FUNCTION public.get_public_team_stats(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH active_season AS (
    SELECT ls.name
    FROM public.clubs c
    JOIN public.league_seasons ls ON ls.club_id = c.id AND ls.is_active = TRUE
    WHERE c.slug = p_club_slug
      AND c.status = 'active'
      AND public.website_is_public(c.id)
    ORDER BY ls.updated_at DESC NULLS LAST
    LIMIT 1
  ),
  season_name AS (
    SELECT COALESCE((SELECT name FROM active_season), '2025/2026') AS name
  )
  SELECT jsonb_build_object(
    'playersCount', COUNT(DISTINCT p.id)::INTEGER,
    'goals', COALESCE(SUM(ps.goals) FILTER (WHERE ps.season = (SELECT name FROM season_name)), 0)::INTEGER,
    'assists', COALESCE(SUM(ps.assists) FILTER (WHERE ps.season = (SELECT name FROM season_name)), 0)::INTEGER,
    'matchesPlayed', COALESCE(SUM(ps.matches_played) FILTER (WHERE ps.season = (SELECT name FROM season_name)), 0)::INTEGER
  )
  FROM public.clubs c
  JOIN public.players p ON p.club_id = c.id AND p.status = 'active'
  LEFT JOIN public.player_stats ps ON ps.player_id = p.id AND ps.club_id = c.id
  WHERE c.slug = p_club_slug
    AND c.status = 'active'
    AND public.website_is_public(c.id)
  GROUP BY c.id;
$$;



-- =============================================================================
-- Source: 20260703120000_league_player_matching_161.sql
-- =============================================================================

-- Sprint 16.1: dopasowanie zawodników FC OS ↔ league_player_registry

CREATE TYPE public.league_player_match_status AS ENUM (
  'unmatched',
  'suggested',
  'auto_linked',
  'confirmed',
  'rejected'
);

ALTER TABLE public.league_player_registry
  ADD COLUMN match_status public.league_player_match_status NOT NULL DEFAULT 'unmatched',
  ADD COLUMN match_confidence SMALLINT,
  ADD COLUMN suggested_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL;

ALTER TABLE public.league_player_registry
  ADD CONSTRAINT league_player_registry_match_confidence_check
  CHECK (match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 100));

CREATE INDEX league_player_registry_match_status_idx
  ON public.league_player_registry (club_id, match_status);

-- Istniejące powiązania traktuj jako auto-link (100%)
-- [stripped: UPDATE]



-- =============================================================================
-- Source: 20260619120000_stage156_communication_hub.sql
-- =============================================================================

-- ETAP 15.6: Communication Hub — ogłoszenia, komunikaty trenera, czaty, powiadomienia

CREATE TYPE public.announcement_category AS ENUM (
  'club',
  'seniors',
  'juniors',
  'trampkarze',
  'mlodzicy',
  'sponsors',
  'board'
);

CREATE TYPE public.announcement_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

CREATE TYPE public.announcement_visibility AS ENUM (
  'all',
  'team',
  'role'
);

CREATE TYPE public.announcement_status AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE public.coach_message_status AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE public.attendance_response AS ENUM (
  'yes',
  'no',
  'unknown'
);

CREATE TYPE public.team_chat_type AS ENUM (
  'team',
  'board',
  'sponsor'
);

CREATE TYPE public.communication_notification_kind AS ENUM (
  'announcement',
  'coach_message',
  'chat_message',
  'training_change',
  'match_change'
);

ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'club_announcement';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'coach_message_new';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'chat_message_new';

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  category public.announcement_category NOT NULL DEFAULT 'club',
  priority public.announcement_priority NOT NULL DEFAULT 'normal',
  visibility public.announcement_visibility NOT NULL DEFAULT 'all',
  target_team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  target_role public.club_role,
  status public.announcement_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.announcements (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT announcement_reads_unique UNIQUE (announcement_id, user_id)
);

CREATE TABLE public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status public.coach_message_status NOT NULL DEFAULT 'draft',
  requires_attendance BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.coach_message_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  coach_message_id UUID NOT NULL REFERENCES public.coach_messages (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  response public.attendance_response NOT NULL,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT coach_message_responses_unique UNIQUE (coach_message_id, user_id)
);

CREATE TABLE public.team_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  chat_type public.team_chat_type NOT NULL,
  team_id UUID REFERENCES public.teams (id) ON DELETE CASCADE,
  sponsor_id UUID REFERENCES public.sponsors (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT team_chats_team_required CHECK (
    chat_type <> 'team' OR team_id IS NOT NULL
  ),
  CONSTRAINT team_chats_sponsor_required CHECK (
    chat_type <> 'sponsor' OR sponsor_id IS NOT NULL
  )
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES public.team_chats (id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  body TEXT NOT NULL DEFAULT '',
  is_emoji_only BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.chat_messages (id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind public.communication_notification_kind NOT NULL,
  source_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  push_queued BOOLEAN NOT NULL DEFAULT FALSE,
  in_app_created BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX announcements_club_status_idx ON public.announcements (club_id, status, published_at DESC);
CREATE INDEX announcements_club_category_idx ON public.announcements (club_id, category);
CREATE INDEX announcement_reads_announcement_idx ON public.announcement_reads (announcement_id);
CREATE INDEX coach_messages_team_idx ON public.coach_messages (club_id, team_id, published_at DESC);
CREATE INDEX coach_message_responses_message_idx ON public.coach_message_responses (coach_message_id);
CREATE INDEX team_chats_club_type_idx ON public.team_chats (club_id, chat_type, is_active);
CREATE INDEX chat_messages_chat_idx ON public.chat_messages (chat_id, created_at DESC);
CREATE INDEX chat_attachments_message_idx ON public.chat_attachments (message_id);
CREATE INDEX notification_events_user_idx ON public.notification_events (club_id, user_id, created_at DESC);

CREATE TRIGGER announcements_set_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER coach_messages_set_updated_at
  BEFORE UPDATE ON public.coach_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER team_chats_set_updated_at
  BEFORE UPDATE ON public.team_chats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER chat_messages_set_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RBAC helpers
CREATE OR REPLACE FUNCTION public.actor_can_manage_communication(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_can_publish_communication(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_create_coach_messages(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach']::public.club_role[]
    );
$$;

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
      OR (
        public.actor_can_create_coach_messages(p_club_id)
        AND EXISTS (
          SELECT 1 FROM public.club_memberships cm
          WHERE cm.club_id = p_club_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
            AND (cm.team_id IS NULL OR cm.team_id = t.id)
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.club_memberships cm
        WHERE cm.club_id = p_club_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
          AND cm.team_id = t.id
          AND cm.role IN ('player','coach')
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

CREATE OR REPLACE FUNCTION public.actor_can_read_announcement(p_announcement_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.announcements a
    WHERE a.id = p_announcement_id
      AND a.club_id IN (SELECT public.user_club_ids())
      AND a.status = 'published'
      AND (
        public.actor_can_manage_communication(a.club_id)
        OR (
          a.visibility = 'all'
          AND NOT public.actor_is_sponsor_user(a.club_id)
        )
        OR (
          a.visibility = 'team'
          AND a.target_team_id IS NOT NULL
          AND a.target_team_id IN (SELECT public.actor_communication_team_ids(a.club_id))
        )
        OR (
          a.visibility = 'role'
          AND a.target_role IS NOT NULL
          AND public.user_has_club_role(a.club_id, ARRAY[a.target_role]::public.club_role[])
        )
        OR (
          a.category = 'sponsors'
          AND public.actor_is_sponsor_user(a.club_id)
        )
        OR (
          a.category = 'board'
          AND public.user_has_club_role(
            a.club_id,
            ARRAY['owner','president','sports_director']::public.club_role[]
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_team_chat(p_chat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_chats tc
    WHERE tc.id = p_chat_id
      AND tc.club_id IN (SELECT public.user_club_ids())
      AND tc.is_active = TRUE
      AND (
        (
          tc.chat_type = 'board'
          AND public.user_has_club_role(
            tc.club_id,
            ARRAY['owner','president','sports_director']::public.club_role[]
          )
        )
        OR (
          tc.chat_type = 'team'
          AND tc.team_id IN (SELECT public.actor_communication_team_ids(tc.club_id))
        )
        OR (
          tc.chat_type = 'sponsor'
          AND public.actor_is_sponsor_user(tc.club_id)
          AND tc.sponsor_id = public.sponsor_id_for_user(tc.club_id, auth.uid())
        )
        OR public.actor_can_manage_communication(tc.club_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_communication_child_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'announcement_reads' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = NEW.announcement_id AND a.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'announcement_id does not belong to club_id';
    END IF;
  ELSIF TG_TABLE_NAME = 'coach_message_responses' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.coach_messages cm
      WHERE cm.id = NEW.coach_message_id AND cm.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'coach_message_id does not belong to club_id';
    END IF;
  ELSIF TG_TABLE_NAME = 'chat_messages' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.team_chats tc
      WHERE tc.id = NEW.chat_id AND tc.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'chat_id does not belong to club_id';
    END IF;
  ELSIF TG_TABLE_NAME = 'chat_attachments' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = NEW.message_id AND m.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'message_id does not belong to club_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER announcement_reads_enforce_club
  BEFORE INSERT OR UPDATE ON public.announcement_reads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_communication_child_club_consistency();

CREATE TRIGGER coach_message_responses_enforce_club
  BEFORE INSERT OR UPDATE ON public.coach_message_responses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_communication_child_club_consistency();

CREATE TRIGGER chat_messages_enforce_club
  BEFORE INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_communication_child_club_consistency();

CREATE TRIGGER chat_attachments_enforce_club
  BEFORE INSERT OR UPDATE ON public.chat_attachments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_communication_child_club_consistency();

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_message_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY announcements_select ON public.announcements FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_communication(club_id)
      OR (status = 'published' AND public.actor_can_read_announcement(id))
    )
  );

CREATE POLICY announcements_manage ON public.announcements FOR ALL TO authenticated
  USING (public.actor_can_manage_communication(club_id) OR public.actor_can_publish_communication(club_id))
  WITH CHECK (public.actor_can_manage_communication(club_id) OR public.actor_can_publish_communication(club_id));

CREATE POLICY announcement_reads_select ON public.announcement_reads FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      user_id = auth.uid()
      OR public.actor_can_manage_communication(club_id)
    )
  );

CREATE POLICY announcement_reads_insert ON public.announcement_reads FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.actor_can_read_announcement(announcement_id)
  );

CREATE POLICY coach_messages_select ON public.coach_messages FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_communication(club_id)
      OR (
        status = 'published'
        AND team_id IN (SELECT public.actor_communication_team_ids(club_id))
      )
    )
  );

CREATE POLICY coach_messages_manage ON public.coach_messages FOR ALL TO authenticated
  USING (public.actor_can_create_coach_messages(club_id))
  WITH CHECK (public.actor_can_create_coach_messages(club_id));

CREATE POLICY coach_message_responses_select ON public.coach_message_responses FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      user_id = auth.uid()
      OR public.actor_can_create_coach_messages(club_id)
    )
  );

CREATE POLICY coach_message_responses_upsert ON public.coach_message_responses FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.actor_can_create_coach_messages(club_id))
  WITH CHECK (user_id = auth.uid());

CREATE POLICY team_chats_select ON public.team_chats FOR SELECT TO authenticated
  USING (public.actor_can_access_team_chat(id));

CREATE POLICY team_chats_manage ON public.team_chats FOR ALL TO authenticated
  USING (public.actor_can_manage_communication(club_id))
  WITH CHECK (public.actor_can_manage_communication(club_id));

CREATE POLICY chat_messages_select ON public.chat_messages FOR SELECT TO authenticated
  USING (public.actor_can_access_team_chat(chat_id));

CREATE POLICY chat_messages_insert ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.actor_can_access_team_chat(chat_id)
  );

CREATE POLICY chat_attachments_select ON public.chat_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = message_id AND public.actor_can_access_team_chat(m.chat_id)
    )
  );

CREATE POLICY chat_attachments_insert ON public.chat_attachments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = message_id
        AND m.sender_id = auth.uid()
        AND public.actor_can_access_team_chat(m.chat_id)
    )
  );

CREATE POLICY notification_events_select ON public.notification_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY notification_events_manage ON public.notification_events FOR ALL TO authenticated
  USING (public.actor_can_manage_communication(club_id))
  WITH CHECK (public.actor_can_manage_communication(club_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_reads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_message_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_chats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_events TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_manage_communication(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_publish_communication(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_create_coach_messages(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_communication_team_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_announcement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_access_team_chat(UUID) TO authenticated;



-- =============================================================================
-- Source: 20260619123000_stage156_audit_hardening.sql
-- =============================================================================

-- ETAP 15.6 audit hardening — Communication Hub

CREATE OR REPLACE FUNCTION public.enforce_announcement_publish_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'published') THEN
    IF NOT public.actor_can_publish_communication(NEW.club_id)
      AND NOT public.actor_can_manage_communication(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role to publish announcement';
    END IF;
    IF NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
  END IF;

  IF NEW.status = 'archived' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'archived') THEN
    IF NEW.archived_at IS NULL THEN
      NEW.archived_at := timezone('utc', now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER announcements_enforce_publish
  BEFORE INSERT OR UPDATE OF status ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_announcement_publish_role();

CREATE OR REPLACE FUNCTION public.enforce_coach_message_team_access()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.actor_can_manage_communication(NEW.club_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.club_memberships cm
      WHERE cm.club_id = NEW.club_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
        AND (cm.team_id IS NULL OR cm.team_id = NEW.team_id)
        AND cm.role = 'coach'
    ) THEN
    RAISE EXCEPTION 'coach cannot post to this team';
  END IF;

  IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'published') THEN
    IF NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER coach_messages_enforce_team
  BEFORE INSERT OR UPDATE ON public.coach_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_message_team_access();

CREATE UNIQUE INDEX IF NOT EXISTS team_chats_board_unique
  ON public.team_chats (club_id)
  WHERE chat_type = 'board' AND is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS team_chats_team_unique
  ON public.team_chats (club_id, team_id)
  WHERE chat_type = 'team' AND is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS team_chats_sponsor_unique
  ON public.team_chats (club_id, sponsor_id)
  WHERE chat_type = 'sponsor' AND is_active = TRUE;



-- =============================================================================
-- Source: 20260619124000_stage156_security_hardening.sql
-- =============================================================================

-- ETAP 15.6 security hardening — izolacja drużyn, RSVP, coach messages, board access

CREATE OR REPLACE FUNCTION public.actor_can_access_board_communication(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (p_club_id IN (SELECT public.user_club_ids())) THEN
    RETURN FALSE;
  END IF;

  IF public.user_has_club_role(
    p_club_id,
    ARRAY['owner','president','sports_director']::public.club_role[]
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'club_role'
      AND e.enumlabel = 'treasurer'
  ) THEN
    RETURN public.user_has_club_role(p_club_id, ARRAY['treasurer']::public.club_role[]);
  END IF;

  RETURN FALSE;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.actor_can_modify_coach_message(p_club_id UUID, p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_communication(p_club_id)
      OR (
        public.actor_can_create_coach_messages(p_club_id)
        AND EXISTS (
          SELECT 1 FROM public.club_memberships cm
          WHERE cm.club_id = p_club_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
            AND cm.role = 'coach'
            AND cm.team_id = p_team_id
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_respond_coach_message(p_coach_message_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coach_messages cm
    WHERE cm.id = p_coach_message_id
      AND cm.club_id IN (SELECT public.user_club_ids())
      AND cm.status = 'published'
      AND cm.team_id IN (SELECT public.actor_communication_team_ids(cm.club_id))
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_announcement(p_announcement_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.announcements a
    WHERE a.id = p_announcement_id
      AND a.club_id IN (SELECT public.user_club_ids())
      AND a.status = 'published'
      AND (
        public.actor_can_manage_communication(a.club_id)
        OR (
          a.visibility = 'all'
          AND NOT public.actor_is_sponsor_user(a.club_id)
        )
        OR (
          a.visibility = 'team'
          AND a.target_team_id IS NOT NULL
          AND a.target_team_id IN (SELECT public.actor_communication_team_ids(a.club_id))
        )
        OR (
          a.visibility = 'role'
          AND a.target_role IS NOT NULL
          AND public.user_has_club_role(a.club_id, ARRAY[a.target_role]::public.club_role[])
        )
        OR (
          a.category = 'sponsors'
          AND public.actor_is_sponsor_user(a.club_id)
        )
        OR (
          a.category = 'board'
          AND public.actor_can_access_board_communication(a.club_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_team_chat(p_chat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_chats tc
    WHERE tc.id = p_chat_id
      AND tc.club_id IN (SELECT public.user_club_ids())
      AND tc.is_active = TRUE
      AND (
        (
          tc.chat_type = 'board'
          AND public.actor_can_access_board_communication(tc.club_id)
        )
        OR (
          tc.chat_type = 'team'
          AND tc.team_id IN (SELECT public.actor_communication_team_ids(tc.club_id))
        )
        OR (
          tc.chat_type = 'sponsor'
          AND public.actor_is_sponsor_user(tc.club_id)
          AND tc.sponsor_id = public.sponsor_id_for_user(tc.club_id, auth.uid())
        )
        OR public.actor_can_manage_communication(tc.club_id)
      )
  );
$$;

DROP POLICY IF EXISTS coach_messages_manage ON public.coach_messages;
CREATE POLICY coach_messages_manage ON public.coach_messages FOR ALL TO authenticated
  USING (public.actor_can_modify_coach_message(club_id, team_id))
  WITH CHECK (public.actor_can_modify_coach_message(club_id, team_id));

DROP POLICY IF EXISTS coach_message_responses_upsert ON public.coach_message_responses;
DROP POLICY IF EXISTS coach_message_responses_insert ON public.coach_message_responses;
DROP POLICY IF EXISTS coach_message_responses_update ON public.coach_message_responses;
CREATE POLICY coach_message_responses_insert ON public.coach_message_responses FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.actor_can_respond_coach_message(coach_message_id)
  );

CREATE POLICY coach_message_responses_update ON public.coach_message_responses FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND public.actor_can_respond_coach_message(coach_message_id)
  );

GRANT EXECUTE ON FUNCTION public.actor_can_access_board_communication(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_modify_coach_message(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_respond_coach_message(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_coach_message_team_access()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.actor_can_modify_coach_message(NEW.club_id, NEW.team_id) THEN
    RAISE EXCEPTION 'coach cannot post to this team';
  END IF;

  IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'published') THEN
    IF NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;



-- =============================================================================
-- Source: 20260620120000_stage157_attendance_availability.sql
-- =============================================================================

-- ETAP 15.7: Attendance & Availability 2.0

ALTER TYPE public.absence_reason ADD VALUE IF NOT EXISTS 'vacation';
ALTER TYPE public.absence_reason ADD VALUE IF NOT EXISTS 'family';

CREATE TYPE public.availability_event_type AS ENUM (
  'training',
  'match',
  'club_event'
);

CREATE TYPE public.attendance_record_source AS ENUM (
  'training',
  'match'
);

CREATE TYPE public.match_call_status AS ENUM (
  'called_up',
  'reserve',
  'not_called_up'
);

ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'match_squad_call';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'availability_reminder';

CREATE TABLE public.availability_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs (id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label_pl TEXT NOT NULL,
  absence_reason public.absence_reason,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX availability_reasons_club_code_unique
  ON public.availability_reasons (club_id, code)
  WHERE club_id IS NOT NULL;

CREATE UNIQUE INDEX availability_reasons_system_code_unique
  ON public.availability_reasons (code)
  WHERE club_id IS NULL;

CREATE TABLE public.player_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  event_type public.availability_event_type NOT NULL,
  training_id UUID REFERENCES public.trainings (id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches (id) ON DELETE CASCADE,
  club_event_ref UUID,
  status public.availability_status NOT NULL DEFAULT 'unknown',
  reason_id UUID REFERENCES public.availability_reasons (id) ON DELETE SET NULL,
  absence_reason public.absence_reason,
  comment TEXT,
  declared_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT player_availability_event_check CHECK (
    (event_type = 'training' AND training_id IS NOT NULL AND match_id IS NULL)
    OR (event_type = 'match' AND match_id IS NOT NULL AND training_id IS NULL)
    OR (event_type = 'club_event' AND club_event_ref IS NOT NULL AND training_id IS NULL AND match_id IS NULL)
  ),
  CONSTRAINT player_availability_absent_reason CHECK (
    status <> 'absent' OR absence_reason IS NOT NULL OR reason_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX player_availability_training_unique
  ON public.player_availability (training_id, player_id)
  WHERE training_id IS NOT NULL;

CREATE UNIQUE INDEX player_availability_match_unique
  ON public.player_availability (match_id, player_id)
  WHERE match_id IS NOT NULL;

CREATE UNIQUE INDEX player_availability_club_event_unique
  ON public.player_availability (club_event_ref, player_id)
  WHERE event_type = 'club_event';

CREATE INDEX player_availability_club_player_idx
  ON public.player_availability (club_id, player_id, updated_at DESC);

CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  source_type public.attendance_record_source NOT NULL,
  training_id UUID REFERENCES public.trainings (id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches (id) ON DELETE CASCADE,
  declared_availability public.availability_status,
  attendance_status public.attendance_status NOT NULL,
  absence_reason public.absence_reason,
  comment TEXT,
  season TEXT,
  recorded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT attendance_records_source_check CHECK (
    (source_type = 'training' AND training_id IS NOT NULL AND match_id IS NULL)
    OR (source_type = 'match' AND match_id IS NOT NULL AND training_id IS NULL)
  )
);

CREATE UNIQUE INDEX attendance_records_training_unique
  ON public.attendance_records (training_id, player_id)
  WHERE training_id IS NOT NULL;

CREATE UNIQUE INDEX attendance_records_match_unique
  ON public.attendance_records (match_id, player_id)
  WHERE match_id IS NOT NULL;

CREATE INDEX attendance_records_club_player_idx
  ON public.attendance_records (club_id, player_id, recorded_at DESC);

ALTER TABLE public.match_squad
  ADD COLUMN IF NOT EXISTS call_status public.match_call_status NOT NULL DEFAULT 'not_called_up';

CREATE TABLE public.match_squad_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  response public.attendance_response NOT NULL,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT match_squad_responses_unique UNIQUE (match_id, player_id)
);

CREATE INDEX match_squad_responses_match_idx ON public.match_squad_responses (match_id);

CREATE TRIGGER player_availability_set_updated_at
  BEFORE UPDATE ON public.player_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER attendance_records_set_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed system availability reasons
-- [stripped: club INSERT]

-- RBAC helpers
CREATE OR REPLACE FUNCTION public.actor_managed_player_ids(p_club_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id
  FROM public.players p
  WHERE p.club_id = p_club_id
    AND p.email IS NOT NULL
    AND lower(p.email) = lower((
      SELECT pr.email FROM public.profiles pr WHERE pr.id = auth.uid()
    ));

  IF to_regclass('public.player_guardians') IS NOT NULL THEN
    RETURN QUERY EXECUTE $guardian$
      SELECT pg.player_id
      FROM public.player_guardians pg
      WHERE pg.club_id = $1
        AND pg.profile_id = auth.uid()
    $guardian$ USING p_club_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.actor_can_set_player_availability(
  p_club_id UUID,
  p_player_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_trainings(p_club_id)
      OR p_player_id IN (SELECT public.actor_managed_player_ids(p_club_id))
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_team_availability(p_club_id UUID, p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_trainings(p_club_id)
      OR public.actor_can_mark_training_attendance(p_club_id)
      OR (
        public.user_has_club_role(p_club_id, ARRAY['player','parent']::public.club_role[])
        AND EXISTS (
          SELECT 1 FROM public.players p
          WHERE p.club_id = p_club_id
            AND p.team_id = p_team_id
            AND p.id IN (SELECT public.actor_managed_player_ids(p_club_id))
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_respond_match_squad(p_match_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = p_match_id
      AND m.club_id IN (SELECT public.user_club_ids())
      AND m.status = 'planned'
      AND p_player_id IN (SELECT public.actor_managed_player_ids(m.club_id))
      AND EXISTS (
        SELECT 1 FROM public.match_squad ms
        WHERE ms.match_id = p_match_id
          AND ms.player_id = p_player_id
          AND ms.call_status IN ('called_up', 'reserve')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_training_availability_to_player_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
-- [stripped: public INSERT block]

  RETURN NEW;
END;
$$;

CREATE TRIGGER training_availability_sync_player
  AFTER INSERT OR UPDATE ON public.training_availability
  FOR EACH ROW EXECUTE FUNCTION public.sync_training_availability_to_player_availability();

CREATE OR REPLACE FUNCTION public.sync_training_attendance_to_records()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_season TEXT;
BEGIN
  SELECT tm.season INTO v_season
  FROM public.trainings tr
  JOIN public.teams tm ON tm.id = tr.team_id
  WHERE tr.id = NEW.training_id
  LIMIT 1;

-- [stripped: public INSERT block]

  RETURN NEW;
END;
$$;

CREATE TRIGGER training_attendance_sync_records
  AFTER INSERT OR UPDATE ON public.training_attendance
  FOR EACH ROW EXECUTE FUNCTION public.sync_training_attendance_to_records();

ALTER TABLE public.availability_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_squad_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY availability_reasons_select ON public.availability_reasons FOR SELECT TO authenticated
  USING (club_id IS NULL OR club_id IN (SELECT public.user_club_ids()));

CREATE POLICY availability_reasons_manage ON public.availability_reasons FOR ALL TO authenticated
  USING (public.actor_can_manage_trainings(club_id))
  WITH CHECK (public.actor_can_manage_trainings(club_id));

CREATE POLICY player_availability_select ON public.player_availability FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_trainings(club_id)
      OR player_id IN (SELECT public.actor_managed_player_ids(club_id))
      OR (
        training_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.trainings tr
          WHERE tr.id = training_id
            AND public.actor_can_read_team_availability(club_id, tr.team_id)
        )
      )
      OR (
        match_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.matches m
          WHERE m.id = match_id
            AND public.actor_can_read_team_availability(club_id, m.team_id)
        )
      )
    )
  );

CREATE POLICY player_availability_manage ON public.player_availability FOR ALL TO authenticated
  USING (public.actor_can_set_player_availability(club_id, player_id))
  WITH CHECK (public.actor_can_set_player_availability(club_id, player_id));

CREATE POLICY attendance_records_select ON public.attendance_records FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_trainings(club_id)
      OR public.actor_can_mark_training_attendance(club_id)
      OR player_id IN (SELECT public.actor_managed_player_ids(club_id))
    )
  );

CREATE POLICY attendance_records_manage ON public.attendance_records FOR ALL TO authenticated
  USING (
    public.actor_can_mark_training_attendance(club_id)
    OR public.actor_can_manage_trainings(club_id)
  )
  WITH CHECK (
    public.actor_can_mark_training_attendance(club_id)
    OR public.actor_can_manage_trainings(club_id)
  );

CREATE POLICY match_squad_responses_select ON public.match_squad_responses FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      user_id = auth.uid()
      OR public.actor_can_manage_matches(club_id)
    )
  );

CREATE POLICY match_squad_responses_insert ON public.match_squad_responses FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.actor_can_respond_match_squad(match_id, player_id)
  );

CREATE POLICY match_squad_responses_update ON public.match_squad_responses FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND public.actor_can_respond_match_squad(match_id, player_id)
  );

GRANT SELECT ON public.availability_reasons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.match_squad_responses TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_managed_player_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_set_player_availability(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_team_availability(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_respond_match_squad(UUID, UUID) TO authenticated;



-- =============================================================================
-- Source: 20260620123000_stage157_audit_hardening.sql
-- =============================================================================

-- ETAP 15.7 audit hardening

CREATE OR REPLACE FUNCTION public.enforce_player_availability_player_club()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.training_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.trainings tr
      JOIN public.players p ON p.id = NEW.player_id AND p.club_id = NEW.club_id
      WHERE tr.id = NEW.training_id AND tr.club_id = NEW.club_id AND tr.team_id = p.team_id
    ) THEN
      RAISE EXCEPTION 'player not on training team';
    END IF;
  ELSIF NEW.match_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.players p ON p.id = NEW.player_id AND p.club_id = NEW.club_id
      WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id AND m.team_id = p.team_id
    ) THEN
      RAISE EXCEPTION 'player not on match team';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER player_availability_enforce_team
  BEFORE INSERT OR UPDATE ON public.player_availability
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_availability_player_club();

CREATE OR REPLACE FUNCTION public.enforce_match_squad_response_club()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'match_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER match_squad_responses_enforce_club
  BEFORE INSERT OR UPDATE ON public.match_squad_responses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_squad_response_club();

CREATE INDEX IF NOT EXISTS player_availability_match_status_idx
  ON public.player_availability (club_id, match_id, status);

CREATE INDEX IF NOT EXISTS attendance_records_season_idx
  ON public.attendance_records (club_id, season, player_id);

CREATE INDEX IF NOT EXISTS match_squad_call_status_idx
  ON public.match_squad (club_id, match_id, call_status);



-- =============================================================================
-- Source: 20260621120000_stage158_club_crm.sql
-- =============================================================================

-- ETAP 15.8: Club CRM & Relationship Management

CREATE TYPE public.crm_contact_type AS ENUM (
  'sponsor',
  'partner',
  'parent',
  'volunteer',
  'donor',
  'company',
  'institution',
  'media'
);

CREATE TYPE public.crm_pipeline_status AS ENUM (
  'new_contact',
  'conversation',
  'offer_sent',
  'negotiation',
  'active_sponsor',
  'lost'
);

CREATE TYPE public.crm_interaction_type AS ENUM (
  'meeting',
  'phone',
  'email',
  'event',
  'sponsorship'
);

CREATE TYPE public.crm_task_type AS ENUM (
  'call_back',
  'send_offer',
  'meeting',
  'reminder'
);

CREATE TYPE public.crm_task_status AS ENUM (
  'open',
  'done',
  'cancelled'
);

CREATE TYPE public.crm_event_type AS ENUM (
  'tournament',
  'club_picnic',
  'sponsor_meeting',
  'parent_meeting',
  'other'
);

CREATE TYPE public.crm_volunteer_area AS ENUM (
  'match_help',
  'transport',
  'event_org',
  'tournament_ops'
);

CREATE TYPE public.crm_event_rsvp AS ENUM (
  'invited',
  'confirmed',
  'declined',
  'attended'
);

ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'crm_task_reminder';

CREATE TABLE public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  contact_type public.crm_contact_type NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  notes TEXT,
  pipeline_status public.crm_pipeline_status NOT NULL DEFAULT 'new_contact',
  profile_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  sponsor_id UUID REFERENCES public.sponsors (id) ON DELETE SET NULL,
  partner_services TEXT,
  partner_discounts TEXT,
  volunteer_areas public.crm_volunteer_area[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX crm_contacts_club_type_idx ON public.crm_contacts (club_id, contact_type, is_active);
CREATE INDEX crm_contacts_pipeline_idx ON public.crm_contacts (club_id, pipeline_status);
CREATE INDEX crm_contacts_profile_idx ON public.crm_contacts (club_id, profile_id) WHERE profile_id IS NOT NULL;

CREATE TABLE public.crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts (id) ON DELETE CASCADE,
  interaction_type public.crm_interaction_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX crm_interactions_contact_idx ON public.crm_interactions (contact_id, occurred_at DESC);

CREATE TABLE public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts (id) ON DELETE SET NULL,
  task_type public.crm_task_type NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  due_at TIMESTAMPTZ,
  status public.crm_task_status NOT NULL DEFAULT 'open',
  notify_user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX crm_tasks_club_due_idx ON public.crm_tasks (club_id, status, due_at);

CREATE TABLE public.crm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  event_type public.crm_event_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX crm_events_club_starts_idx ON public.crm_events (club_id, starts_at DESC);

CREATE TABLE public.crm_event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.crm_events (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts (id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles (id) ON DELETE CASCADE,
  rsvp_status public.crm_event_rsvp NOT NULL DEFAULT 'invited',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT crm_event_attendees_target_check CHECK (
    contact_id IS NOT NULL OR profile_id IS NOT NULL
  ),
  CONSTRAINT crm_event_attendees_contact_unique UNIQUE (event_id, contact_id),
  CONSTRAINT crm_event_attendees_profile_unique UNIQUE (event_id, profile_id)
);

CREATE TABLE public.crm_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts (id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  donated_at DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT,
  purpose TEXT,
  finance_income_id UUID,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX crm_donations_club_date_idx ON public.crm_donations (club_id, donated_at DESC);

DO $$
BEGIN
  IF to_regclass('public.finance_income') IS NOT NULL THEN
    ALTER TABLE public.crm_donations
      ADD CONSTRAINT crm_donations_finance_income_fk
      FOREIGN KEY (finance_income_id) REFERENCES public.finance_income (id) ON DELETE SET NULL;

    ALTER TABLE public.finance_income
      ADD COLUMN IF NOT EXISTS crm_donation_id UUID REFERENCES public.crm_donations (id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TRIGGER crm_contacts_set_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER crm_tasks_set_updated_at
  BEFORE UPDATE ON public.crm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER crm_events_set_updated_at
  BEFORE UPDATE ON public.crm_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER crm_donations_set_updated_at
  BEFORE UPDATE ON public.crm_donations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RBAC helpers
CREATE OR REPLACE FUNCTION public.crm_contact_id_for_user(p_club_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id
  FROM public.crm_contacts c
  WHERE c.club_id = p_club_id
    AND c.profile_id = p_user_id
    AND c.is_active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_crm(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (p_club_id IN (SELECT public.user_club_ids())) THEN
    RETURN FALSE;
  END IF;

  IF public.user_has_club_role(
    p_club_id,
    ARRAY['owner', 'president', 'sports_director']::public.club_role[]
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'club_role' AND e.enumlabel = 'treasurer'
  ) AND EXISTS (
    SELECT 1 FROM public.club_memberships cm
    WHERE cm.club_id = p_club_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND cm.role::text = 'treasurer'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_crm(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_crm(p_club_id)
      OR public.user_has_club_role(p_club_id, ARRAY['coach']::public.club_role[])
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_crm_contact(p_club_id UUID, p_contact_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_contacts c
    WHERE c.id = p_contact_id
      AND c.club_id = p_club_id
      AND (
        public.actor_can_manage_crm(p_club_id)
        OR (
          public.user_has_club_role(p_club_id, ARRAY['coach']::public.club_role[])
          AND c.contact_type IN ('parent', 'volunteer')
        )
        OR c.profile_id = auth.uid()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_crm_portal_contact_ids(p_club_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id FROM public.crm_contacts c
  WHERE c.club_id = p_club_id AND c.profile_id = auth.uid();

  IF to_regclass('public.player_guardians') IS NOT NULL THEN
    RETURN QUERY
    SELECT c.id
    FROM public.crm_contacts c
    JOIN public.player_guardians pg ON pg.player_id = c.player_id AND pg.club_id = c.club_id
    WHERE c.club_id = p_club_id
      AND pg.profile_id = auth.uid()
      AND c.contact_type = 'parent';
  END IF;
END;
$$;

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_contacts_select ON public.crm_contacts FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_crm(club_id)
      OR (
        public.actor_can_read_crm(club_id)
        AND contact_type IN ('parent', 'volunteer')
      )
      OR id IN (SELECT public.actor_crm_portal_contact_ids(club_id))
    )
  );

CREATE POLICY crm_contacts_manage ON public.crm_contacts FOR ALL TO authenticated
  USING (public.actor_can_manage_crm(club_id))
  WITH CHECK (public.actor_can_manage_crm(club_id));

CREATE POLICY crm_interactions_select ON public.crm_interactions FOR SELECT TO authenticated
  USING (public.actor_can_access_crm_contact(club_id, contact_id));

CREATE POLICY crm_interactions_manage ON public.crm_interactions FOR ALL TO authenticated
  USING (public.actor_can_manage_crm(club_id))
  WITH CHECK (public.actor_can_manage_crm(club_id));

CREATE POLICY crm_tasks_select ON public.crm_tasks FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_crm(club_id)
      OR notify_user_id = auth.uid()
      OR created_by = auth.uid()
    )
  );

CREATE POLICY crm_tasks_manage ON public.crm_tasks FOR ALL TO authenticated
  USING (public.actor_can_manage_crm(club_id))
  WITH CHECK (public.actor_can_manage_crm(club_id));

CREATE POLICY crm_events_select ON public.crm_events FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_crm(club_id)
      OR (
        public.user_has_club_role(club_id, ARRAY['coach']::public.club_role[])
        AND event_type IN ('tournament', 'club_picnic', 'parent_meeting', 'other')
      )
      OR EXISTS (
        SELECT 1 FROM public.crm_event_attendees ea
        WHERE ea.event_id = id
          AND (
            ea.profile_id = auth.uid()
            OR ea.contact_id IN (SELECT public.actor_crm_portal_contact_ids(club_id))
          )
      )
    )
  );

CREATE POLICY crm_events_manage ON public.crm_events FOR ALL TO authenticated
  USING (public.actor_can_manage_crm(club_id))
  WITH CHECK (public.actor_can_manage_crm(club_id));

CREATE POLICY crm_event_attendees_select ON public.crm_event_attendees FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_crm(club_id)
      OR profile_id = auth.uid()
      OR contact_id IN (SELECT public.actor_crm_portal_contact_ids(club_id))
    )
  );

CREATE POLICY crm_event_attendees_manage ON public.crm_events FOR ALL TO authenticated
  USING (public.actor_can_manage_crm(club_id))
  WITH CHECK (public.actor_can_manage_crm(club_id));

DROP POLICY IF EXISTS crm_event_attendees_manage ON public.crm_events;

CREATE POLICY crm_event_attendees_manage ON public.crm_event_attendees FOR ALL TO authenticated
  USING (public.actor_can_manage_crm(club_id))
  WITH CHECK (public.actor_can_manage_crm(club_id));

CREATE POLICY crm_donations_select ON public.crm_donations FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_crm(club_id)
      OR (
        contact_id IS NOT NULL
        AND contact_id IN (SELECT public.actor_crm_portal_contact_ids(club_id))
      )
    )
  );

CREATE POLICY crm_donations_manage ON public.crm_donations FOR ALL TO authenticated
  USING (public.actor_can_manage_crm(club_id))
  WITH CHECK (public.actor_can_manage_crm(club_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_interactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_event_attendees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_donations TO authenticated;

GRANT EXECUTE ON FUNCTION public.crm_contact_id_for_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_crm(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_crm(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_access_crm_contact(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_crm_portal_contact_ids(UUID) TO authenticated;



-- =============================================================================
-- Source: 20260621123000_stage158_audit_hardening.sql
-- =============================================================================

-- ETAP 15.8 audit hardening

CREATE OR REPLACE FUNCTION public.enforce_crm_contact_player_club()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.player_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'player_id does not belong to club_id';
    END IF;
  END IF;
  IF NEW.sponsor_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sponsors s
      WHERE s.id = NEW.sponsor_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'sponsor_id does not belong to club_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_contacts_enforce_refs
  BEFORE INSERT OR UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_crm_contact_player_club();

CREATE OR REPLACE FUNCTION public.enforce_crm_interaction_contact_club()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.crm_contacts c
    WHERE c.id = NEW.contact_id AND c.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'contact_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_interactions_enforce_contact
  BEFORE INSERT OR UPDATE ON public.crm_interactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_crm_interaction_contact_club();

CREATE OR REPLACE FUNCTION public.enforce_crm_donation_finance_club()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.finance_income_id IS NOT NULL AND to_regclass('public.finance_income') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.finance_income fi
      WHERE fi.id = NEW.finance_income_id AND fi.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'finance_income_id does not belong to club_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_donations_enforce_finance
  BEFORE INSERT OR UPDATE ON public.crm_donations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_crm_donation_finance_club();

CREATE INDEX IF NOT EXISTS crm_contacts_sponsor_pipeline_idx
  ON public.crm_contacts (club_id, contact_type, pipeline_status)
  WHERE contact_type IN ('sponsor', 'donor', 'company');

CREATE INDEX IF NOT EXISTS crm_tasks_open_due_idx
  ON public.crm_tasks (club_id, due_at)
  WHERE status = 'open';



-- =============================================================================
-- Source: 20260621124000_stage158_treasurer_fix.sql
-- =============================================================================

-- Fix actor_can_manage_crm treasurer enum cast on DB without treasurer role

CREATE OR REPLACE FUNCTION public.actor_can_manage_crm(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (p_club_id IN (SELECT public.user_club_ids())) THEN
    RETURN FALSE;
  END IF;

  IF public.user_has_club_role(
    p_club_id,
    ARRAY['owner', 'president', 'sports_director']::public.club_role[]
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'club_role' AND e.enumlabel = 'treasurer'
  ) AND EXISTS (
    SELECT 1 FROM public.club_memberships cm
    WHERE cm.club_id = p_club_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND cm.role::text = 'treasurer'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;



-- =============================================================================
-- Source: 20260621126000_stage158_coach_events_scope.sql
-- =============================================================================

-- ETAP 15.8 — coach scoped events (hide sponsor meetings from coach)

DROP POLICY IF EXISTS crm_events_select ON public.crm_events;

CREATE POLICY crm_events_select ON public.crm_events FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_crm(club_id)
      OR (
        public.user_has_club_role(club_id, ARRAY['coach']::public.club_role[])
        AND event_type IN ('tournament', 'club_picnic', 'parent_meeting', 'other')
      )
      OR EXISTS (
        SELECT 1 FROM public.crm_event_attendees ea
        WHERE ea.event_id = id
          AND (
            ea.profile_id = auth.uid()
            OR ea.contact_id IN (SELECT public.actor_crm_portal_contact_ids(club_id))
          )
      )
    )
  );



-- =============================================================================
-- Source: 20260622120000_stage159_equipment_assets.sql
-- =============================================================================

-- ETAP 15.9: Equipment & Assets Management

CREATE TYPE public.asset_condition AS ENUM (
  'new',
  'good',
  'needs_repair',
  'damaged',
  'retired'
);

CREATE TYPE public.asset_maintenance_type AS ENUM (
  'repair',
  'inspection',
  'replacement'
);

CREATE TYPE public.asset_maintenance_status AS ENUM (
  'reported',
  'in_progress',
  'completed'
);

CREATE TYPE public.asset_assignee_kind AS ENUM (
  'coach',
  'player',
  'staff',
  'team_manager'
);

CREATE TYPE public.equipment_kit_type AS ENUM (
  'match_kit',
  'training_kit',
  'tracksuit'
);

ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'asset_return_overdue';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'asset_damaged';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'asset_maintenance_due';

CREATE TABLE public.asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT asset_categories_club_slug_unique UNIQUE (club_id, slug)
);

CREATE INDEX asset_categories_club_idx ON public.asset_categories (club_id, sort_order);

CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.asset_categories (id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  inventory_number TEXT,
  description TEXT,
  purchase_date DATE,
  purchase_value NUMERIC(12, 2) CHECK (purchase_value IS NULL OR purchase_value >= 0),
  condition public.asset_condition NOT NULL DEFAULT 'good',
  location TEXT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  quantity_available INT NOT NULL DEFAULT 1 CHECK (quantity_available >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT equipment_assets_qty_available_check CHECK (quantity_available <= quantity)
);

CREATE INDEX assets_club_category_idx ON public.assets (club_id, category_id, is_active);
CREATE INDEX assets_club_condition_idx ON public.assets (club_id, condition) WHERE is_active = TRUE;
CREATE INDEX assets_club_location_idx ON public.assets (club_id, location) WHERE location IS NOT NULL;
CREATE UNIQUE INDEX assets_club_inventory_unique ON public.assets (club_id, inventory_number)
  WHERE inventory_number IS NOT NULL AND inventory_number <> '';

CREATE TABLE public.asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,
  assignee_kind public.asset_assignee_kind NOT NULL,
  profile_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  assignee_label TEXT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  due_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  notes TEXT,
  issued_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  returned_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT asset_assignments_target_check CHECK (
    profile_id IS NOT NULL OR player_id IS NOT NULL OR assignee_label IS NOT NULL
  )
);

CREATE INDEX asset_assignments_club_open_idx ON public.asset_assignments (club_id, returned_at)
  WHERE returned_at IS NULL;
CREATE INDEX asset_assignments_asset_idx ON public.asset_assignments (asset_id, issued_at DESC);
CREATE INDEX asset_assignments_player_idx ON public.asset_assignments (club_id, player_id)
  WHERE player_id IS NOT NULL;

CREATE TABLE public.asset_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,
  maintenance_type public.asset_maintenance_type NOT NULL,
  status public.asset_maintenance_status NOT NULL DEFAULT 'reported',
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at DATE,
  completed_at TIMESTAMPTZ,
  cost NUMERIC(12, 2) CHECK (cost IS NULL OR cost >= 0),
  reported_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX asset_maintenance_club_status_idx ON public.asset_maintenance (club_id, status);
CREATE INDEX asset_maintenance_scheduled_idx ON public.asset_maintenance (club_id, scheduled_at)
  WHERE status <> 'completed';

CREATE TABLE public.equipment_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  kit_type public.equipment_kit_type NOT NULL,
  jersey_number INT CHECK (jersey_number IS NULL OR (jersey_number >= 1 AND jersey_number <= 99)),
  size TEXT NOT NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX equipment_kits_club_player_idx ON public.equipment_kits (club_id, player_id, is_active);
CREATE UNIQUE INDEX equipment_kits_active_unique ON public.equipment_kits (club_id, player_id, kit_type)
  WHERE is_active = TRUE;

CREATE TABLE public.equipment_kit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  kit_id UUID NOT NULL REFERENCES public.equipment_kits (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX equipment_kit_history_kit_idx ON public.equipment_kit_history (kit_id, changed_at DESC);

CREATE TRIGGER assets_set_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER asset_assignments_set_updated_at
  BEFORE UPDATE ON public.asset_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER asset_maintenance_set_updated_at
  BEFORE UPDATE ON public.asset_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER equipment_kits_set_updated_at
  BEFORE UPDATE ON public.equipment_kits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RBAC helpers
CREATE OR REPLACE FUNCTION public.actor_can_manage_equipment(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner', 'president', 'sports_director']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_issue_equipment(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_equipment(p_club_id)
      OR public.user_has_club_role(p_club_id, ARRAY['coach']::public.club_role[])
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_equipment_staff(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_issue_equipment(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_equipment_assignment(p_club_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_equipment_staff(p_club_id)
      OR p_player_id IN (SELECT public.actor_managed_player_ids(p_club_id))
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_equipment_portal(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['player', 'parent']::public.club_role[]
    );
$$;

ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_kit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY asset_categories_select ON public.asset_categories FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_equipment_staff(club_id)
      OR public.actor_can_access_equipment_portal(club_id)
    )
  );

CREATE POLICY asset_categories_manage ON public.asset_categories FOR ALL TO authenticated
  USING (public.actor_can_manage_equipment(club_id))
  WITH CHECK (public.actor_can_manage_equipment(club_id));

CREATE POLICY assets_select ON public.assets FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_equipment_staff(club_id)
      OR (
        public.actor_can_access_equipment_portal(club_id)
        AND EXISTS (
          SELECT 1 FROM public.asset_assignments aa
          WHERE aa.asset_id = id
            AND aa.returned_at IS NULL
            AND aa.player_id IN (SELECT public.actor_managed_player_ids(club_id))
        )
      )
    )
  );

CREATE POLICY assets_manage ON public.assets FOR ALL TO authenticated
  USING (public.actor_can_manage_equipment(club_id))
  WITH CHECK (public.actor_can_manage_equipment(club_id));

CREATE POLICY asset_assignments_select ON public.asset_assignments FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_equipment_staff(club_id)
      OR (
        player_id IS NOT NULL
        AND public.actor_can_read_equipment_assignment(club_id, player_id)
      )
      OR profile_id = auth.uid()
    )
  );

CREATE POLICY asset_assignments_insert ON public.asset_assignments FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_issue_equipment(club_id));

CREATE POLICY asset_assignments_update ON public.asset_assignments FOR UPDATE TO authenticated
  USING (public.actor_can_issue_equipment(club_id))
  WITH CHECK (public.actor_can_issue_equipment(club_id));

CREATE POLICY asset_assignments_delete ON public.asset_assignments FOR DELETE TO authenticated
  USING (public.actor_can_manage_equipment(club_id));

CREATE POLICY asset_maintenance_select ON public.asset_maintenance FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_equipment_staff(club_id)
  );

CREATE POLICY asset_maintenance_insert ON public.asset_maintenance FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_issue_equipment(club_id));

CREATE POLICY asset_maintenance_update ON public.asset_maintenance FOR UPDATE TO authenticated
  USING (
    public.actor_can_manage_equipment(club_id)
    OR (
      public.actor_can_issue_equipment(club_id)
      AND status = 'reported'
      AND reported_by = auth.uid()
    )
  )
  WITH CHECK (public.actor_can_issue_equipment(club_id));

CREATE POLICY asset_maintenance_delete ON public.asset_maintenance FOR DELETE TO authenticated
  USING (public.actor_can_manage_equipment(club_id));

CREATE POLICY equipment_kits_select ON public.equipment_kits FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_equipment_staff(club_id)
      OR public.actor_can_read_equipment_assignment(club_id, player_id)
    )
  );

CREATE POLICY equipment_kits_manage ON public.equipment_kits FOR ALL TO authenticated
  USING (public.actor_can_manage_equipment(club_id))
  WITH CHECK (public.actor_can_manage_equipment(club_id));

CREATE POLICY equipment_kit_history_select ON public.equipment_kit_history FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_equipment_staff(club_id)
      OR public.actor_can_read_equipment_assignment(club_id, player_id)
    )
  );

CREATE POLICY equipment_kit_history_insert ON public.equipment_kit_history FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_manage_equipment(club_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_maintenance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_kits TO authenticated;
GRANT SELECT, INSERT ON public.equipment_kit_history TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_manage_equipment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_issue_equipment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_equipment_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_equipment_assignment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_access_equipment_portal(UUID) TO authenticated;



-- =============================================================================
-- Source: 20260622123000_stage159_audit_hardening.sql
-- =============================================================================

-- ETAP 15.9 audit hardening — scope triggers + indexes

CREATE OR REPLACE FUNCTION public.enforce_asset_assignment_club_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_asset_club UUID;
BEGIN
  SELECT club_id INTO v_asset_club FROM public.assets WHERE id = NEW.asset_id;
  IF v_asset_club IS NULL OR v_asset_club <> NEW.club_id THEN
    RAISE EXCEPTION 'asset_id must belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER asset_assignments_club_scope
  BEFORE INSERT OR UPDATE ON public.asset_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_asset_assignment_club_scope();

CREATE OR REPLACE FUNCTION public.enforce_asset_maintenance_club_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_asset_club UUID;
BEGIN
  SELECT club_id INTO v_asset_club FROM public.assets WHERE id = NEW.asset_id;
  IF v_asset_club IS NULL OR v_asset_club <> NEW.club_id THEN
    RAISE EXCEPTION 'asset_id must belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER asset_maintenance_club_scope
  BEFORE INSERT OR UPDATE ON public.asset_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.enforce_asset_maintenance_club_scope();

CREATE OR REPLACE FUNCTION public.enforce_equipment_kit_club_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_player_club UUID;
BEGIN
  SELECT club_id INTO v_player_club FROM public.players WHERE id = NEW.player_id;
  IF v_player_club IS NULL OR v_player_club <> NEW.club_id THEN
    RAISE EXCEPTION 'player_id must belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER equipment_kits_club_scope
  BEFORE INSERT OR UPDATE ON public.equipment_kits
  FOR EACH ROW EXECUTE FUNCTION public.enforce_equipment_kit_club_scope();

CREATE OR REPLACE FUNCTION public.log_equipment_kit_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.jersey_number IS DISTINCT FROM NEW.jersey_number THEN
-- [stripped: public INSERT block]
    END IF;
    IF OLD.size IS DISTINCT FROM NEW.size THEN
-- [stripped: public INSERT block]
    END IF;
    IF OLD.kit_type IS DISTINCT FROM NEW.kit_type THEN
-- [stripped: public INSERT block]
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER equipment_kits_history_log
  AFTER UPDATE ON public.equipment_kits
  FOR EACH ROW EXECUTE FUNCTION public.log_equipment_kit_change();

CREATE INDEX IF NOT EXISTS assets_club_active_idx ON public.assets (club_id, is_active, updated_at DESC);
CREATE INDEX IF NOT EXISTS asset_assignments_due_idx ON public.asset_assignments (club_id, due_at)
  WHERE returned_at IS NULL AND due_at IS NOT NULL;



-- =============================================================================
-- Source: 20260622124000_stage159_rls_fix.sql
-- =============================================================================

-- ETAP 15.9 — fix partial apply / rename constraint if needed

DO $$
BEGIN
  IF to_regclass('public.assets') IS NOT NULL THEN
    ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_quantity_available_check;
    ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS equipment_assets_qty_available_check;
    ALTER TABLE public.assets
      ADD CONSTRAINT equipment_assets_qty_available_check
      CHECK (quantity_available <= quantity);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Re-apply assets_select if portal leak fix needed
DROP POLICY IF EXISTS assets_select ON public.assets;
CREATE POLICY assets_select ON public.assets FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_equipment_staff(club_id)
      OR (
        public.actor_can_access_equipment_portal(club_id)
        AND EXISTS (
          SELECT 1 FROM public.asset_assignments aa
          WHERE aa.asset_id = id
            AND aa.returned_at IS NULL
            AND aa.player_id IN (SELECT public.actor_managed_player_ids(club_id))
        )
      )
    )
  );



-- =============================================================================
-- Source: 20260623120000_stage1510_injury_medical.sql
-- =============================================================================

-- ETAP 15.10: Injury & Medical Management (sport availability — not clinical records)

ALTER TYPE public.availability_status ADD VALUE IF NOT EXISTS 'limited';

CREATE TYPE public.injury_record_status AS ENUM (
  'active',
  'rehabilitation',
  'ready_for_training',
  'closed'
);

CREATE TYPE public.injury_availability_impact AS ENUM (
  'unavailable',
  'limited'
);

CREATE TYPE public.rehabilitation_plan_status AS ENUM (
  'started',
  'in_progress',
  'completed'
);

CREATE TYPE public.return_to_training_status AS ENUM (
  'no_clearance',
  'individual',
  'partial',
  'full'
);

CREATE TYPE public.return_to_match_status AS ENUM (
  'unavailable',
  'conditional',
  'available'
);

ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'injury_reported';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'injury_return_training';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'injury_return_match';

CREATE TABLE public.injury_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT injury_categories_club_slug_unique UNIQUE (club_id, slug)
);

CREATE INDEX injury_categories_club_idx ON public.injury_categories (club_id, sort_order);

ALTER TABLE public.player_injuries
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.injury_categories (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS injury_status public.injury_record_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS availability_impact public.injury_availability_impact,
  ADD COLUMN IF NOT EXISTS expected_return_date DATE;

-- [stripped: UPDATE]

-- [stripped: UPDATE]

CREATE INDEX player_injuries_club_status_idx
  ON public.player_injuries (club_id, injury_status)
  WHERE injury_status <> 'closed';

CREATE INDEX player_injuries_team_idx ON public.player_injuries (club_id, team_id);

CREATE TABLE public.rehabilitation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  injury_id UUID NOT NULL REFERENCES public.player_injuries (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  stage_label TEXT NOT NULL DEFAULT 'Etap I',
  coach_note TEXT,
  progress_note TEXT,
  status public.rehabilitation_plan_status NOT NULL DEFAULT 'started',
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT rehabilitation_plans_injury_unique UNIQUE (injury_id)
);

CREATE INDEX rehabilitation_plans_club_player_idx
  ON public.rehabilitation_plans (club_id, player_id, status);

CREATE TABLE public.return_to_play (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  injury_id UUID NOT NULL REFERENCES public.player_injuries (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  training_status public.return_to_training_status NOT NULL DEFAULT 'no_clearance',
  match_status public.return_to_match_status NOT NULL DEFAULT 'unavailable',
  notes TEXT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT return_to_play_injury_unique UNIQUE (injury_id)
);

CREATE INDEX return_to_play_club_player_idx ON public.return_to_play (club_id, player_id);

CREATE TRIGGER rehabilitation_plans_set_updated_at
  BEFORE UPDATE ON public.rehabilitation_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER return_to_play_set_updated_at
  BEFORE UPDATE ON public.return_to_play
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RBAC helpers
CREATE OR REPLACE FUNCTION public.actor_can_manage_injury_config(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner', 'president', 'sports_director']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_injury_staff(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_injury_config(p_club_id)
      OR public.user_has_club_role(p_club_id, ARRAY['coach']::public.club_role[])
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_injury_staff(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_manage_injury_staff(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_injury_row(p_club_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_injury_staff(p_club_id)
      OR public.actor_can_read_player_row(p_club_id, p_player_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_injury_row(p_club_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_manage_player_row(p_club_id, p_player_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_injury_portal(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['player', 'parent']::public.club_role[]
    );
$$;

-- Sync injury impact → player_availability (club_event scope)
CREATE OR REPLACE FUNCTION public.sync_injury_availability_impact()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status public.availability_status;
  v_declared_by UUID;
BEGIN
  v_declared_by := COALESCE(NEW.created_by, auth.uid());

  IF NEW.injury_status IN ('active', 'rehabilitation')
    AND NEW.availability_impact IS NOT NULL THEN
    v_status := CASE
      WHEN NEW.availability_impact = 'unavailable' THEN 'absent'::public.availability_status
      ELSE 'limited'::public.availability_status
    END;

-- [stripped: public INSERT block]
  ELSE
-- [stripped: DELETE]
  END IF;

  NEW.is_active := NEW.injury_status NOT IN ('closed', 'ready_for_training');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS player_injuries_sync_availability ON public.player_injuries;
CREATE TRIGGER player_injuries_sync_availability
  BEFORE INSERT OR UPDATE OF injury_status, availability_impact, description, player_id, club_id
  ON public.player_injuries
  FOR EACH ROW EXECUTE FUNCTION public.sync_injury_availability_impact();

CREATE OR REPLACE FUNCTION public.enforce_injury_team_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  SELECT team_id INTO v_team_id FROM public.players WHERE id = NEW.player_id LIMIT 1;
  NEW.team_id := COALESCE(NEW.team_id, v_team_id);

  IF NEW.category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.injury_categories ic
      WHERE ic.id = NEW.category_id AND ic.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'invalid injury category for club';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS player_injuries_enforce_team ON public.player_injuries;
CREATE TRIGGER player_injuries_enforce_team
  BEFORE INSERT OR UPDATE ON public.player_injuries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_injury_team_scope();

ALTER TABLE public.injury_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_to_play ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_injuries_select" ON public.player_injuries;
DROP POLICY IF EXISTS "player_injuries_manage" ON public.player_injuries;

CREATE POLICY player_injuries_select ON public.player_injuries FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_injury_row(club_id, player_id)
  );

CREATE POLICY player_injuries_manage ON public.player_injuries FOR ALL TO authenticated
  USING (public.actor_can_manage_injury_row(club_id, player_id))
  WITH CHECK (public.actor_can_manage_injury_row(club_id, player_id));

CREATE POLICY injury_categories_select ON public.injury_categories FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_injury_staff(club_id)
      OR public.actor_can_access_injury_portal(club_id)
    )
  );

CREATE POLICY injury_categories_manage ON public.injury_categories FOR ALL TO authenticated
  USING (public.actor_can_manage_injury_config(club_id))
  WITH CHECK (public.actor_can_manage_injury_config(club_id));

CREATE POLICY rehabilitation_plans_select ON public.rehabilitation_plans FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_injury_row(club_id, player_id)
  );

CREATE POLICY rehabilitation_plans_manage ON public.rehabilitation_plans FOR ALL TO authenticated
  USING (public.actor_can_manage_injury_row(club_id, player_id))
  WITH CHECK (public.actor_can_manage_injury_row(club_id, player_id));

CREATE POLICY return_to_play_select ON public.return_to_play FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_injury_row(club_id, player_id)
  );

CREATE POLICY return_to_play_manage ON public.return_to_play FOR ALL TO authenticated
  USING (public.actor_can_manage_injury_row(club_id, player_id))
  WITH CHECK (public.actor_can_manage_injury_row(club_id, player_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.injury_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rehabilitation_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.return_to_play TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_manage_injury_config(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_injury_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_injury_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_injury_row(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_injury_row(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_access_injury_portal(UUID) TO authenticated;



-- =============================================================================
-- Source: 20260623123000_stage1510_audit_hardening.sql
-- =============================================================================

-- ETAP 15.10 audit hardening

CREATE OR REPLACE FUNCTION public.enforce_rehabilitation_plan_club_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_injury RECORD;
BEGIN
  SELECT club_id, player_id INTO v_injury
  FROM public.player_injuries WHERE id = NEW.injury_id;

  IF v_injury.club_id IS NULL OR v_injury.club_id <> NEW.club_id THEN
    RAISE EXCEPTION 'rehabilitation plan club mismatch';
  END IF;

  NEW.player_id := v_injury.player_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_return_to_play_club_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_injury RECORD;
BEGIN
  SELECT club_id, player_id INTO v_injury
  FROM public.player_injuries WHERE id = NEW.injury_id;

  IF v_injury.club_id IS NULL OR v_injury.club_id <> NEW.club_id THEN
    RAISE EXCEPTION 'return_to_play club mismatch';
  END IF;

  NEW.player_id := v_injury.player_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rehabilitation_plans_enforce_club ON public.rehabilitation_plans;
CREATE TRIGGER rehabilitation_plans_enforce_club
  BEFORE INSERT OR UPDATE ON public.rehabilitation_plans
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rehabilitation_plan_club_scope();

DROP TRIGGER IF EXISTS return_to_play_enforce_club ON public.return_to_play;
CREATE TRIGGER return_to_play_enforce_club
  BEFORE INSERT OR UPDATE ON public.return_to_play
  FOR EACH ROW EXECUTE FUNCTION public.enforce_return_to_play_club_scope();

CREATE OR REPLACE FUNCTION public.enforce_injury_coach_team_access()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.actor_is_coach_team_scoped(NEW.club_id)
    AND NOT public.actor_can_manage_injury_config(NEW.club_id) THEN
    IF NEW.team_id IS NULL OR NEW.team_id NOT IN (SELECT public.coach_team_ids(NEW.club_id)) THEN
      RAISE EXCEPTION 'coach cannot manage injury outside assigned team';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS player_injuries_enforce_coach_team ON public.player_injuries;
CREATE TRIGGER player_injuries_enforce_coach_team
  BEFORE INSERT OR UPDATE ON public.player_injuries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_injury_coach_team_access();



-- =============================================================================
-- Source: 20260623124000_stage1510_sync_fix.sql
-- =============================================================================

-- ETAP 15.10 fix — sync injury availability when declared_by unavailable (seed/admin)

CREATE OR REPLACE FUNCTION public.sync_injury_availability_impact()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status public.availability_status;
  v_declared_by UUID;
BEGIN
  v_declared_by := COALESCE(NEW.created_by, auth.uid());

  IF v_declared_by IS NULL THEN
    SELECT cm.user_id INTO v_declared_by
    FROM public.club_memberships cm
    WHERE cm.club_id = NEW.club_id
      AND cm.status = 'active'
    ORDER BY
      CASE cm.role
        WHEN 'owner' THEN 1
        WHEN 'president' THEN 2
        WHEN 'sports_director' THEN 3
        WHEN 'coach' THEN 4
        ELSE 5
      END
    LIMIT 1;
  END IF;

  IF NEW.injury_status IN ('active', 'rehabilitation')
    AND NEW.availability_impact IS NOT NULL
    AND v_declared_by IS NOT NULL THEN
    v_status := CASE
      WHEN NEW.availability_impact = 'unavailable' THEN 'absent'::public.availability_status
      ELSE 'limited'::public.availability_status
    END;

-- [stripped: public INSERT block]
  ELSE
-- [stripped: DELETE]
  END IF;

  NEW.is_active := NEW.injury_status NOT IN ('closed', 'ready_for_training');

  RETURN NEW;
END;
$$;



-- =============================================================================
-- Source: 20260623125000_stage1510_parent_guardian.sql
-- =============================================================================

-- ETAP 15.10 — upewnij powiązanie rodzic ↔ zawodnik testowy (portal urazów)

-- [stripped: club-specific DO block]
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



-- =============================================================================
-- Source: 20260631161000_piorun_social_public_read.sql
-- =============================================================================

-- Publiczna strona klubu — odczyt włączonych linków social (hero + sidebar)

DROP POLICY IF EXISTS "website_social_public_read" ON public.website_social_integrations;

CREATE POLICY "website_social_public_read" ON public.website_social_integrations
  FOR SELECT TO anon, authenticated
  USING (
    is_enabled = true
    AND public.website_is_public(club_id)
  );



-- =============================================================================
-- Source: 20260631190000_public_website_last_result_date_fix.sql
-- =============================================================================

-- Ignore future-dated completed matches when picking lastResult for public homepage.
CREATE OR REPLACE FUNCTION public.get_public_website_home(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
  v_club public.clubs%ROWTYPE;
  v_settings public.website_settings%ROWTYPE;
  v_next_match JSONB;
  v_last_result JSONB;
BEGIN
  SELECT c.* INTO v_club
  FROM public.clubs c
  WHERE c.slug = p_club_slug
    AND c.status = 'active'
    AND public.website_is_public(c.id);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_club_id := v_club.id;

  SELECT ws.* INTO v_settings
  FROM public.website_settings ws
  WHERE ws.club_id = v_club_id;

  SELECT jsonb_build_object(
    'id', m.id,
    'matchDate', m.match_date,
    'matchTime', m.match_time,
    'homeTeamName', m.home_team_name,
    'awayTeamName', m.away_team_name,
    'homeScore', m.home_score,
    'awayScore', m.away_score,
    'competition', m.competition,
    'roundNumber', m.round_number,
    'status', m.status
  ) INTO v_next_match
  FROM public.matches m
  WHERE m.club_id = v_club_id
    AND m.status IN ('planned', 'in_progress')
    AND m.match_date >= CURRENT_DATE
  ORDER BY m.match_date, m.match_time
  LIMIT 1;

  SELECT jsonb_build_object(
    'id', m.id,
    'matchDate', m.match_date,
    'matchTime', m.match_time,
    'homeTeamName', m.home_team_name,
    'awayTeamName', m.away_team_name,
    'homeScore', m.home_score,
    'awayScore', m.away_score,
    'competition', m.competition,
    'roundNumber', m.round_number,
    'status', m.status
  ) INTO v_last_result
  FROM public.matches m
  WHERE m.club_id = v_club_id
    AND m.status = 'completed'
    AND m.match_date <= CURRENT_DATE
  ORDER BY m.match_date DESC, m.match_time DESC, m.round_number DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'club', jsonb_build_object(
      'id', v_club.id,
      'slug', v_club.slug,
      'publicName', v_club.public_name,
      'officialName', v_club.official_name,
      'competitionLevel', v_club.competition_level,
      'voivodeship', v_club.voivodeship
    ),
    'settings', jsonb_build_object(
      'logoPath', v_settings.logo_path,
      'logoDarkPath', v_settings.logo_dark_path,
      'primaryColor', v_settings.primary_color,
      'secondaryColor', v_settings.secondary_color,
      'accentColor', v_settings.accent_color,
      'heroImagePath', v_settings.hero_image_path,
      'heroTitle', COALESCE(v_settings.hero_title, v_club.public_name),
      'heroSubtitle', v_settings.hero_subtitle,
      'seoTitle', v_settings.seo_title,
      'seoDescription', v_settings.seo_description,
      'contactAddress', v_settings.contact_address,
      'contactEmail', v_settings.contact_email,
      'contactPhone', v_settings.contact_phone
    ),
    'nextMatch', v_next_match,
    'lastResult', v_last_result,
    'newsCount', (SELECT COUNT(*)::INTEGER FROM public.website_news n WHERE n.club_id = v_club_id AND n.status = 'published'),
    'sponsorCount', (SELECT COUNT(*)::INTEGER FROM public.sponsors s WHERE s.club_id = v_club_id AND s.show_on_website = TRUE)
  );
END;
$$;



-- =============================================================================
-- Source: 20260703140000_public_home_bundle_162.sql
-- =============================================================================

-- Sprint 16.2 Etap B: jeden RPC dla strony głównej publicznej

CREATE INDEX IF NOT EXISTS idx_matches_public_home_results
  ON public.matches (club_id, status, match_date DESC, round_number DESC, match_time DESC)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_matches_public_home_upcoming
  ON public.matches (club_id, status, match_date ASC, match_time ASC)
  WHERE status IN ('planned', 'in_progress');

CREATE OR REPLACE FUNCTION public.get_public_home_bundle(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_club public.clubs%ROWTYPE;
  v_settings public.website_settings%ROWTYPE;
  v_season_name TEXT;
  v_competition_name TEXT;
  v_next_match JSONB;
  v_last_match JSONB;
  v_recent_results JSONB;
  v_news JSONB;
  v_teams JSONB;
  v_sponsors JSONB;
  v_players JSONB;
  v_top_scorers JSONB;
  v_club_stats JSONB;
  v_team_stats JSONB;
  v_league JSONB;
  v_media JSONB;
  v_academy JSONB;
BEGIN
  SELECT c.* INTO v_club
  FROM public.clubs c
  WHERE c.slug = p_club_slug
    AND c.status = 'active'
    AND public.website_is_public(c.id);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT ws.* INTO v_settings
  FROM public.website_settings ws
  WHERE ws.club_id = v_club.id;

  SELECT ls.name INTO v_season_name
  FROM public.league_seasons ls
  WHERE ls.club_id = v_club.id AND ls.is_active = TRUE
  ORDER BY ls.updated_at DESC NULLS LAST
  LIMIT 1;

  v_season_name := COALESCE(v_season_name, '2025/2026');

  SELECT lc.name INTO v_competition_name
  FROM public.league_competitions lc
  WHERE lc.club_id = v_club.id AND lc.is_active = TRUE
  ORDER BY lc.name
  LIMIT 1;

  v_competition_name := COALESCE(v_competition_name, 'B Klasa');

  SELECT jsonb_build_object(
    'id', m.id,
    'matchDate', m.match_date,
    'matchTime', m.match_time,
    'homeTeamName', m.home_team_name,
    'awayTeamName', m.away_team_name,
    'homeScore', m.home_score,
    'awayScore', m.away_score,
    'stadium', m.stadium,
    'competition', m.competition,
    'roundNumber', m.round_number,
    'status', m.status
  ) INTO v_next_match
  FROM public.matches m
  WHERE m.club_id = v_club.id
    AND m.status IN ('planned', 'in_progress')
    AND m.match_date >= CURRENT_DATE
  ORDER BY m.match_date, m.match_time
  LIMIT 1;

  SELECT jsonb_build_object(
    'id', m.id,
    'matchDate', m.match_date,
    'matchTime', m.match_time,
    'homeTeamName', m.home_team_name,
    'awayTeamName', m.away_team_name,
    'homeScore', m.home_score,
    'awayScore', m.away_score,
    'stadium', m.stadium,
    'competition', m.competition,
    'roundNumber', m.round_number,
    'status', m.status
  ) INTO v_last_match
  FROM public.matches m
  WHERE m.club_id = v_club.id
    AND m.status = 'completed'
    AND m.match_date <= CURRENT_DATE
  ORDER BY m.match_date DESC, m.match_time DESC, m.round_number DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(row ORDER BY sort_date DESC, sort_round DESC, sort_time DESC), '[]'::jsonb)
  INTO v_recent_results
  FROM (
    SELECT
      jsonb_build_object(
        'id', m.id,
        'matchDate', m.match_date,
        'matchTime', m.match_time,
        'homeTeamName', m.home_team_name,
        'awayTeamName', m.away_team_name,
        'homeScore', m.home_score,
        'awayScore', m.away_score,
        'stadium', m.stadium,
        'competition', m.competition,
        'roundNumber', m.round_number,
        'status', m.status
      ) AS row,
      m.match_date AS sort_date,
      m.round_number AS sort_round,
      m.match_time AS sort_time
    FROM public.matches m
    WHERE m.club_id = v_club.id
      AND m.status = 'completed'
      AND m.match_date <= CURRENT_DATE
    ORDER BY m.match_date DESC, m.round_number DESC, m.match_time DESC
    LIMIT 8
  ) sub;

  SELECT COALESCE(jsonb_agg(row ORDER BY published_at DESC NULLS LAST), '[]'::jsonb)
  INTO v_news
  FROM (
    SELECT
      jsonb_build_object(
        'id', n.id,
        'slug', n.slug,
        'title', n.title,
        'excerpt', n.excerpt,
        'featuredImagePath', n.featured_image_path,
        'category', n.category,
        'authorName', pr.full_name,
        'publishedAt', n.published_at
      ) AS row,
      n.published_at
    FROM public.website_news n
    LEFT JOIN public.profiles pr ON pr.id = n.author_id
    WHERE n.club_id = v_club.id
      AND n.status = 'published'
    ORDER BY n.published_at DESC NULLS LAST
    LIMIT 6
  ) sub;

  SELECT COALESCE(
    (
      SELECT jsonb_agg(sub.row ORDER BY sub.sort_order, sub.team_name)
      FROM (
        SELECT
          jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'category', t.category,
            'season', t.season,
            'playersCount', (
              SELECT COUNT(*)::INTEGER
              FROM public.players p
              WHERE p.team_id = t.id AND p.club_id = v_club.id AND p.status = 'active'
            ),
            'coachName', (
              SELECT pr.full_name
              FROM public.academy_groups ag
              JOIN public.academy_group_staff ags
                ON ags.group_id = ag.id AND ags.staff_role = 'head_coach'
              JOIN public.profiles pr ON pr.id = ags.profile_id
              WHERE ag.team_id = t.id AND ag.club_id = v_club.id
              LIMIT 1
            ),
            'description', ag.description,
            'ageGroup', ag.age_group
          ) AS row,
          CASE t.category
            WHEN 'seniors' THEN 1
            WHEN 'u18' THEN 2
            WHEN 'u12' THEN 3
            WHEN 'u10' THEN 4
            ELSE 5
          END AS sort_order,
          t.name AS team_name
        FROM public.teams t
        LEFT JOIN public.academy_groups ag ON ag.team_id = t.id AND ag.club_id = v_club.id
        WHERE t.club_id = v_club.id AND t.is_active = TRUE
      ) sub
    ),
    '[]'::jsonb
  ) INTO v_teams;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'companyName', s.company_name,
      'logoUrl', s.logo_url,
      'website', s.website,
      'publicTier', s.public_tier,
      'publicDescription', s.public_description
    ) ORDER BY
      CASE s.public_tier WHEN 'main' THEN 1 WHEN 'supporting' THEN 2 ELSE 3 END,
      s.company_name
  ), '[]'::jsonb)
  INTO v_sponsors
  FROM public.sponsors s
  WHERE s.club_id = v_club.id
    AND s.show_on_website = TRUE
    AND s.cooperation_status IN ('active', 'expiring');

  WITH player_rows AS (
    SELECT
      jsonb_build_object(
        'id', p.id,
        'firstName', p.first_name,
        'lastName', p.last_name,
        'jerseyNumber', p.jersey_number,
        'position', p.primary_position,
        'goals', GREATEST(
          COALESCE(SUM(ps.goals) FILTER (WHERE ps.season = v_season_name), 0),
          COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'goals')::int), 0)
        ),
        'assists', GREATEST(
          COALESCE(SUM(ps.assists) FILTER (WHERE ps.season = v_season_name), 0),
          COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'assists')::int), 0)
        ),
        'matchesPlayed', GREATEST(
          COALESCE(SUM(ps.matches_played) FILTER (WHERE ps.season = v_season_name), 0),
          COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'appearances')::int), 0)
        )
      ) AS row,
      p.jersey_number,
      p.last_name,
      p.first_name,
      GREATEST(
        COALESCE(SUM(ps.goals) FILTER (WHERE ps.season = v_season_name), 0),
        COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'goals')::int), 0)
      ) AS goals_total
    FROM public.players p
    LEFT JOIN public.player_stats ps ON ps.player_id = p.id AND ps.club_id = v_club.id
    LEFT JOIN public.league_player_registry lpr ON lpr.player_id = p.id AND lpr.club_id = v_club.id
    WHERE p.club_id = v_club.id AND p.status = 'active'
    GROUP BY p.id, p.first_name, p.last_name, p.jersey_number, p.primary_position
  )
  SELECT
    COALESCE(jsonb_agg(row ORDER BY jersey_number NULLS LAST, last_name, first_name), '[]'::jsonb),
    COALESCE(
      (
        SELECT jsonb_agg(row ORDER BY goals_total DESC, matches_played DESC)
        FROM (
          SELECT row, goals_total,
            (row ->> 'matchesPlayed')::int AS matches_played
          FROM player_rows
          WHERE goals_total > 0
          ORDER BY goals_total DESC, (row ->> 'matchesPlayed')::int DESC
          LIMIT 5
        ) scorers
      ),
      '[]'::jsonb
    )
  INTO v_players, v_top_scorers
  FROM player_rows;

  SELECT jsonb_build_object(
    'playersCount', (
      SELECT COUNT(*)::INTEGER FROM public.players p
      WHERE p.club_id = v_club.id AND p.status = 'active'
    ),
    'teamsCount', (
      SELECT COUNT(*)::INTEGER FROM public.teams t
      WHERE t.club_id = v_club.id AND t.is_active = TRUE
    ),
    'matchesPlayed', (
      SELECT COUNT(*)::INTEGER FROM public.matches m
      WHERE m.club_id = v_club.id AND m.status = 'completed'
    ),
    'yearsActive', GREATEST(
      1,
      EXTRACT(YEAR FROM age(timezone('utc', now()), v_club.created_at))::INTEGER
    )
  ) INTO v_club_stats;

  SELECT jsonb_build_object(
    'playersCount', COUNT(DISTINCT p.id)::INTEGER,
    'goals', COALESCE(SUM(ps.goals) FILTER (WHERE ps.season = v_season_name), 0)::INTEGER,
    'assists', COALESCE(SUM(ps.assists) FILTER (WHERE ps.season = v_season_name), 0)::INTEGER,
    'matchesPlayed', COALESCE(SUM(ps.matches_played) FILTER (WHERE ps.season = v_season_name), 0)::INTEGER
  )
  INTO v_team_stats
  FROM public.players p
  LEFT JOIN public.player_stats ps ON ps.player_id = p.id AND ps.club_id = v_club.id
  WHERE p.club_id = v_club.id AND p.status = 'active';

  SELECT jsonb_build_object(
    'entries', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', lte.id,
            'teamName', lte.team_name,
            'played', lte.played,
            'won', lte.won,
            'drawn', lte.drawn,
            'lost', lte.lost,
            'goalsFor', lte.goals_for,
            'goalsAgainst', lte.goals_against,
            'points', lte.points,
            'isOwnClub', lte.is_own_club
          ) ORDER BY lte.points DESC, (lte.goals_for - lte.goals_against) DESC, lte.goals_for DESC
        )
        FROM public.league_table_entries lte
        WHERE lte.club_id = v_club.id
          AND lte.competition = v_competition_name
          AND lte.season = v_season_name
      ),
      '[]'::jsonb
    ),
    'ownTeamName', v_club.public_name,
    'competition', v_competition_name,
    'season', v_season_name
  ) INTO v_league;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', wm.id,
      'section', wm.section,
      'slotKey', wm.slot_key,
      'storagePath', wm.storage_path,
      'demoAssetKey', wm.demo_asset_key,
      'caption', wm.caption,
      'teamId', wm.team_id,
      'newsId', wm.news_id,
      'sortOrder', wm.sort_order
    ) ORDER BY wm.section, wm.sort_order
  ), '[]'::jsonb)
  INTO v_media
  FROM public.website_media wm
  WHERE wm.club_id = v_club.id AND wm.is_active = TRUE;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'slotKey', wm.slot_key,
      'storagePath', wm.storage_path,
      'demoAssetKey', wm.demo_asset_key,
      'caption', wm.caption
    ) ORDER BY wm.sort_order
  ), '[]'::jsonb)
  INTO v_academy
  FROM public.website_media wm
  WHERE wm.club_id = v_club.id
    AND wm.is_active = TRUE
    AND wm.section = 'academy';

  RETURN jsonb_build_object(
    'club', jsonb_build_object(
      'id', v_club.id,
      'slug', v_club.slug,
      'publicName', v_club.public_name,
      'officialName', v_club.official_name,
      'competitionLevel', v_club.competition_level,
      'voivodeship', v_club.voivodeship
    ),
    'branding', jsonb_build_object(
      'logoPath', v_settings.logo_path,
      'logoDarkPath', v_settings.logo_dark_path,
      'primaryColor', v_settings.primary_color,
      'secondaryColor', v_settings.secondary_color,
      'accentColor', v_settings.accent_color,
      'heroImagePath', v_settings.hero_image_path,
      'heroTitle', COALESCE(v_settings.hero_title, v_club.public_name),
      'heroSubtitle', v_settings.hero_subtitle,
      'contactAddress', v_settings.contact_address,
      'contactEmail', v_settings.contact_email,
      'contactPhone', v_settings.contact_phone
    ),
    'news', v_news,
    'teams', v_teams,
    'academy', v_academy,
    'stats', jsonb_build_object('club', v_club_stats, 'team', v_team_stats),
    'nextMatch', v_next_match,
    'lastMatch', v_last_match,
    'recentResults', v_recent_results,
    'league', v_league,
    'players', v_players,
    'topScorers', v_top_scorers,
    'sponsors', v_sponsors,
    'media', v_media,
    'newsCount', (
      SELECT COUNT(*)::INTEGER FROM public.website_news n
      WHERE n.club_id = v_club.id AND n.status = 'published'
    ),
    'sponsorCount', jsonb_array_length(v_sponsors)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_home_bundle(TEXT) TO anon, authenticated;



-- =============================================================================
-- Source: 20260703141000_public_home_bundle_academy_fix.sql
-- =============================================================================

-- Hotfix: get_public_home_bundle bez zależności od academy_groups (brak modułu na części prod DB)

CREATE OR REPLACE FUNCTION public.get_public_home_bundle(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_club public.clubs%ROWTYPE;
  v_settings public.website_settings%ROWTYPE;
  v_season_name TEXT;
  v_competition_name TEXT;
  v_next_match JSONB;
  v_last_match JSONB;
  v_recent_results JSONB;
  v_news JSONB;
  v_teams JSONB;
  v_sponsors JSONB;
  v_players JSONB;
  v_top_scorers JSONB;
  v_club_stats JSONB;
  v_team_stats JSONB;
  v_league JSONB;
  v_media JSONB;
  v_academy JSONB;
  v_has_academy BOOLEAN;
BEGIN
  SELECT c.* INTO v_club
  FROM public.clubs c
  WHERE c.slug = p_club_slug
    AND c.status = 'active'
    AND public.website_is_public(c.id);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT ws.* INTO v_settings
  FROM public.website_settings ws
  WHERE ws.club_id = v_club.id;

  SELECT ls.name INTO v_season_name
  FROM public.league_seasons ls
  WHERE ls.club_id = v_club.id AND ls.is_active = TRUE
  ORDER BY ls.updated_at DESC NULLS LAST
  LIMIT 1;

  v_season_name := COALESCE(v_season_name, '2025/2026');

  SELECT lc.name INTO v_competition_name
  FROM public.league_competitions lc
  WHERE lc.club_id = v_club.id AND lc.is_active = TRUE
  ORDER BY lc.name
  LIMIT 1;

  v_competition_name := COALESCE(v_competition_name, 'B Klasa');

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'academy_groups'
  ) INTO v_has_academy;

  SELECT jsonb_build_object(
    'id', m.id,
    'matchDate', m.match_date,
    'matchTime', m.match_time,
    'homeTeamName', m.home_team_name,
    'awayTeamName', m.away_team_name,
    'homeScore', m.home_score,
    'awayScore', m.away_score,
    'stadium', m.stadium,
    'competition', m.competition,
    'roundNumber', m.round_number,
    'status', m.status
  ) INTO v_next_match
  FROM public.matches m
  WHERE m.club_id = v_club.id
    AND m.status IN ('planned', 'in_progress')
    AND m.match_date >= CURRENT_DATE
  ORDER BY m.match_date, m.match_time
  LIMIT 1;

  SELECT jsonb_build_object(
    'id', m.id,
    'matchDate', m.match_date,
    'matchTime', m.match_time,
    'homeTeamName', m.home_team_name,
    'awayTeamName', m.away_team_name,
    'homeScore', m.home_score,
    'awayScore', m.away_score,
    'stadium', m.stadium,
    'competition', m.competition,
    'roundNumber', m.round_number,
    'status', m.status
  ) INTO v_last_match
  FROM public.matches m
  WHERE m.club_id = v_club.id
    AND m.status = 'completed'
    AND m.match_date <= CURRENT_DATE
  ORDER BY m.match_date DESC, m.match_time DESC, m.round_number DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(row ORDER BY sort_date DESC, sort_round DESC, sort_time DESC), '[]'::jsonb)
  INTO v_recent_results
  FROM (
    SELECT
      jsonb_build_object(
        'id', m.id,
        'matchDate', m.match_date,
        'matchTime', m.match_time,
        'homeTeamName', m.home_team_name,
        'awayTeamName', m.away_team_name,
        'homeScore', m.home_score,
        'awayScore', m.away_score,
        'stadium', m.stadium,
        'competition', m.competition,
        'roundNumber', m.round_number,
        'status', m.status
      ) AS row,
      m.match_date AS sort_date,
      m.round_number AS sort_round,
      m.match_time AS sort_time
    FROM public.matches m
    WHERE m.club_id = v_club.id
      AND m.status = 'completed'
      AND m.match_date <= CURRENT_DATE
    ORDER BY m.match_date DESC, m.round_number DESC, m.match_time DESC
    LIMIT 8
  ) sub;

  SELECT COALESCE(jsonb_agg(row ORDER BY published_at DESC NULLS LAST), '[]'::jsonb)
  INTO v_news
  FROM (
    SELECT
      jsonb_build_object(
        'id', n.id,
        'slug', n.slug,
        'title', n.title,
        'excerpt', n.excerpt,
        'featuredImagePath', n.featured_image_path,
        'category', n.category,
        'authorName', pr.full_name,
        'publishedAt', n.published_at
      ) AS row,
      n.published_at
    FROM public.website_news n
    LEFT JOIN public.profiles pr ON pr.id = n.author_id
    WHERE n.club_id = v_club.id
      AND n.status = 'published'
    ORDER BY n.published_at DESC NULLS LAST
    LIMIT 6
  ) sub;

  IF v_has_academy THEN
    SELECT COALESCE(
      (
        SELECT jsonb_agg(sub.row ORDER BY sub.sort_order, sub.team_name)
        FROM (
          SELECT
            jsonb_build_object(
              'id', t.id,
              'name', t.name,
              'category', t.category,
              'season', t.season,
              'playersCount', (
                SELECT COUNT(*)::INTEGER
                FROM public.players p
                WHERE p.team_id = t.id AND p.club_id = v_club.id AND p.status = 'active'
              ),
              'coachName', (
                SELECT pr.full_name
                FROM public.academy_groups ag
                JOIN public.academy_group_staff ags
                  ON ags.group_id = ag.id AND ags.staff_role = 'head_coach'
                JOIN public.profiles pr ON pr.id = ags.profile_id
                WHERE ag.team_id = t.id AND ag.club_id = v_club.id
                LIMIT 1
              ),
              'description', ag.description,
              'ageGroup', ag.age_group
            ) AS row,
            CASE t.category
              WHEN 'seniors' THEN 1
              WHEN 'u18' THEN 2
              WHEN 'u12' THEN 3
              WHEN 'u10' THEN 4
              ELSE 5
            END AS sort_order,
            t.name AS team_name
          FROM public.teams t
          LEFT JOIN public.academy_groups ag ON ag.team_id = t.id AND ag.club_id = v_club.id
          WHERE t.club_id = v_club.id AND t.is_active = TRUE
        ) sub
      ),
      '[]'::jsonb
    ) INTO v_teams;
  ELSE
    SELECT COALESCE(
      (
        SELECT jsonb_agg(sub.row ORDER BY sub.sort_order, sub.team_name)
        FROM (
          SELECT
            jsonb_build_object(
              'id', t.id,
              'name', t.name,
              'category', t.category,
              'season', t.season,
              'playersCount', (
                SELECT COUNT(*)::INTEGER
                FROM public.players p
                WHERE p.team_id = t.id AND p.club_id = v_club.id AND p.status = 'active'
              ),
              'coachName', NULL,
              'description', NULL,
              'ageGroup', NULL
            ) AS row,
            CASE t.category
              WHEN 'seniors' THEN 1
              WHEN 'u18' THEN 2
              WHEN 'u12' THEN 3
              WHEN 'u10' THEN 4
              ELSE 5
            END AS sort_order,
            t.name AS team_name
          FROM public.teams t
          WHERE t.club_id = v_club.id AND t.is_active = TRUE
        ) sub
      ),
      '[]'::jsonb
    ) INTO v_teams;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'companyName', s.company_name,
      'logoUrl', s.logo_url,
      'website', s.website,
      'publicTier', s.public_tier,
      'publicDescription', s.public_description
    ) ORDER BY
      CASE s.public_tier WHEN 'main' THEN 1 WHEN 'supporting' THEN 2 ELSE 3 END,
      s.company_name
  ), '[]'::jsonb)
  INTO v_sponsors
  FROM public.sponsors s
  WHERE s.club_id = v_club.id
    AND s.show_on_website = TRUE
    AND s.cooperation_status IN ('active', 'expiring');

  WITH player_rows AS (
    SELECT
      jsonb_build_object(
        'id', p.id,
        'firstName', p.first_name,
        'lastName', p.last_name,
        'jerseyNumber', p.jersey_number,
        'position', p.primary_position,
        'goals', GREATEST(
          COALESCE(SUM(ps.goals) FILTER (WHERE ps.season = v_season_name), 0),
          COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'goals')::int), 0)
        ),
        'assists', GREATEST(
          COALESCE(SUM(ps.assists) FILTER (WHERE ps.season = v_season_name), 0),
          COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'assists')::int), 0)
        ),
        'matchesPlayed', GREATEST(
          COALESCE(SUM(ps.matches_played) FILTER (WHERE ps.season = v_season_name), 0),
          COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'appearances')::int), 0)
        )
      ) AS row,
      p.jersey_number,
      p.last_name,
      p.first_name,
      GREATEST(
        COALESCE(SUM(ps.goals) FILTER (WHERE ps.season = v_season_name), 0),
        COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'goals')::int), 0)
      ) AS goals_total
    FROM public.players p
    LEFT JOIN public.player_stats ps ON ps.player_id = p.id AND ps.club_id = v_club.id
    LEFT JOIN public.league_player_registry lpr ON lpr.player_id = p.id AND lpr.club_id = v_club.id
    WHERE p.club_id = v_club.id AND p.status = 'active'
    GROUP BY p.id, p.first_name, p.last_name, p.jersey_number, p.primary_position
  )
  SELECT
    COALESCE(jsonb_agg(row ORDER BY jersey_number NULLS LAST, last_name, first_name), '[]'::jsonb),
    COALESCE(
      (
        SELECT jsonb_agg(row ORDER BY goals_total DESC, matches_played DESC)
        FROM (
          SELECT row, goals_total,
            (row ->> 'matchesPlayed')::int AS matches_played
          FROM player_rows
          WHERE goals_total > 0
          ORDER BY goals_total DESC, (row ->> 'matchesPlayed')::int DESC
          LIMIT 5
        ) scorers
      ),
      '[]'::jsonb
    )
  INTO v_players, v_top_scorers
  FROM player_rows;

  SELECT jsonb_build_object(
    'playersCount', (
      SELECT COUNT(*)::INTEGER FROM public.players p
      WHERE p.club_id = v_club.id AND p.status = 'active'
    ),
    'teamsCount', (
      SELECT COUNT(*)::INTEGER FROM public.teams t
      WHERE t.club_id = v_club.id AND t.is_active = TRUE
    ),
    'matchesPlayed', (
      SELECT COUNT(*)::INTEGER FROM public.matches m
      WHERE m.club_id = v_club.id AND m.status = 'completed'
    ),
    'yearsActive', GREATEST(
      1,
      EXTRACT(YEAR FROM age(timezone('utc', now()), v_club.created_at))::INTEGER
    )
  ) INTO v_club_stats;

  SELECT jsonb_build_object(
    'playersCount', COUNT(DISTINCT p.id)::INTEGER,
    'goals', COALESCE(SUM(ps.goals) FILTER (WHERE ps.season = v_season_name), 0)::INTEGER,
    'assists', COALESCE(SUM(ps.assists) FILTER (WHERE ps.season = v_season_name), 0)::INTEGER,
    'matchesPlayed', COALESCE(SUM(ps.matches_played) FILTER (WHERE ps.season = v_season_name), 0)::INTEGER
  )
  INTO v_team_stats
  FROM public.players p
  LEFT JOIN public.player_stats ps ON ps.player_id = p.id AND ps.club_id = v_club.id
  WHERE p.club_id = v_club.id AND p.status = 'active';

  SELECT jsonb_build_object(
    'entries', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', lte.id,
            'teamName', lte.team_name,
            'played', lte.played,
            'won', lte.won,
            'drawn', lte.drawn,
            'lost', lte.lost,
            'goalsFor', lte.goals_for,
            'goalsAgainst', lte.goals_against,
            'points', lte.points,
            'isOwnClub', lte.is_own_club
          ) ORDER BY lte.points DESC, (lte.goals_for - lte.goals_against) DESC, lte.goals_for DESC
        )
        FROM public.league_table_entries lte
        WHERE lte.club_id = v_club.id
          AND lte.competition = v_competition_name
          AND lte.season = v_season_name
      ),
      '[]'::jsonb
    ),
    'ownTeamName', v_club.public_name,
    'competition', v_competition_name,
    'season', v_season_name
  ) INTO v_league;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', wm.id,
      'section', wm.section,
      'slotKey', wm.slot_key,
      'storagePath', wm.storage_path,
      'demoAssetKey', wm.demo_asset_key,
      'caption', wm.caption,
      'teamId', wm.team_id,
      'newsId', wm.news_id,
      'sortOrder', wm.sort_order
    ) ORDER BY wm.section, wm.sort_order
  ), '[]'::jsonb)
  INTO v_media
  FROM public.website_media wm
  WHERE wm.club_id = v_club.id AND wm.is_active = TRUE;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'slotKey', wm.slot_key,
      'storagePath', wm.storage_path,
      'demoAssetKey', wm.demo_asset_key,
      'caption', wm.caption
    ) ORDER BY wm.sort_order
  ), '[]'::jsonb)
  INTO v_academy
  FROM public.website_media wm
  WHERE wm.club_id = v_club.id
    AND wm.is_active = TRUE
    AND wm.section = 'academy';

  RETURN jsonb_build_object(
    'club', jsonb_build_object(
      'id', v_club.id,
      'slug', v_club.slug,
      'publicName', v_club.public_name,
      'officialName', v_club.official_name,
      'competitionLevel', v_club.competition_level,
      'voivodeship', v_club.voivodeship
    ),
    'branding', jsonb_build_object(
      'logoPath', v_settings.logo_path,
      'logoDarkPath', v_settings.logo_dark_path,
      'primaryColor', v_settings.primary_color,
      'secondaryColor', v_settings.secondary_color,
      'accentColor', v_settings.accent_color,
      'heroImagePath', v_settings.hero_image_path,
      'heroTitle', COALESCE(v_settings.hero_title, v_club.public_name),
      'heroSubtitle', v_settings.hero_subtitle,
      'contactAddress', v_settings.contact_address,
      'contactEmail', v_settings.contact_email,
      'contactPhone', v_settings.contact_phone
    ),
    'news', v_news,
    'teams', v_teams,
    'academy', v_academy,
    'stats', jsonb_build_object('club', v_club_stats, 'team', v_team_stats),
    'nextMatch', v_next_match,
    'lastMatch', v_last_match,
    'recentResults', v_recent_results,
    'league', v_league,
    'players', v_players,
    'topScorers', v_top_scorers,
    'sponsors', v_sponsors,
    'media', v_media,
    'newsCount', (
      SELECT COUNT(*)::INTEGER FROM public.website_news n
      WHERE n.club_id = v_club.id AND n.status = 'published'
    ),
    'sponsorCount', jsonb_array_length(v_sponsors)
  );
END;
$$;


-- End of FC OS baseline (68 source migrations, Sprint 17.5b)
