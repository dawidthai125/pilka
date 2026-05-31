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

INSERT INTO public.ai_report_categories (id, label, sort_order) VALUES
  ('matches', 'Mecze', 1),
  ('trainings', 'Treningi', 2),
  ('players', 'Zawodnicy', 3),
  ('management', 'Zarząd', 4),
  ('sponsors', 'Sponsorzy', 5);

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
