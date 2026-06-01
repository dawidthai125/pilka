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
