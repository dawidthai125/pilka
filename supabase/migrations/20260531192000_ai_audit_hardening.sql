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
