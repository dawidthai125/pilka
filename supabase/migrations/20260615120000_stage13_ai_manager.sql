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
