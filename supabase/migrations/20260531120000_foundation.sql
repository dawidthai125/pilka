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
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name')
  );
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
