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
