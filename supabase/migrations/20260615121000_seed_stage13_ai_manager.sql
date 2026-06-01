-- ETAP 13: Seed AI Club Manager — Piorun Wawrzeńczyce

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_coach_id UUID;
  v_owner_id UUID;
  v_president_id UUID;
  v_task_completed UUID;
  v_task_pending UUID;
  v_task_approval UUID;
  v_tool_call UUID;
BEGIN
  SELECT id INTO v_coach_id FROM public.profiles WHERE email = 'trener@piorun.test' LIMIT 1;
  SELECT id INTO v_owner_id FROM public.profiles WHERE email = 'wlasciciel@piorun.test' LIMIT 1;
  SELECT id INTO v_president_id FROM public.profiles WHERE email = 'prezes@piorun.test' LIMIT 1;

  IF v_coach_id IS NULL OR v_owner_id IS NULL THEN
    RAISE NOTICE 'Stage 13 seed skipped — brak użytkowników testowych.';
    RETURN;
  END IF;

  DELETE FROM public.ai_action_approvals WHERE club_id = v_club_id;
  DELETE FROM public.ai_tool_calls WHERE club_id = v_club_id;
  DELETE FROM public.ai_task_logs WHERE club_id = v_club_id;
  DELETE FROM public.ai_tasks WHERE club_id = v_club_id;
  DELETE FROM public.ai_memory WHERE club_id = v_club_id;

  -- Wykonane zadanie: analiza frekwencji
  INSERT INTO public.ai_tasks (club_id, user_id, title, command, status, result_summary, completed_at, metadata)
  VALUES (
    v_club_id, v_coach_id,
    'Zawodnicy z frekwencją poniżej 60%',
    'Pokaż zawodników z frekwencją poniżej 60%',
    'completed',
    'Znaleziono 3 zawodników z frekwencją poniżej 60%.',
    now() - interval '2 days',
    '{"kind":"agent_command"}'::JSONB
  )
  RETURNING id INTO v_task_completed;

  INSERT INTO public.ai_tool_calls (club_id, task_id, user_id, tool_name, tool_input, tool_output, risk_level, status, executed_at)
  VALUES (
    v_club_id, v_task_completed, v_coach_id,
    'getPlayers',
    '{"minAttendanceRate":60}'::JSONB,
    '{"count":3,"players":["Jan Kowalski","Piotr Nowak","Adam Wiśniewski"]}'::JSONB,
    'low', 'success', now() - interval '2 days'
  );

  INSERT INTO public.ai_task_logs (club_id, task_id, user_id, action, details)
  VALUES
    (v_club_id, v_task_completed, v_coach_id, 'task_started', '{"command":"frekwencja"}'::JSONB),
    (v_club_id, v_task_completed, v_coach_id, 'tool_executed', '{"tool":"getPlayers"}'::JSONB),
    (v_club_id, v_task_completed, v_coach_id, 'task_completed', '{}'::JSONB);

  -- Oczekujące zatwierdzenie: utworzenie treningu
  INSERT INTO public.ai_tasks (club_id, user_id, title, command, status, metadata)
  VALUES (
    v_club_id, v_coach_id,
    'Utwórz trening na jutro',
    'Utwórz trening jutro o 18:00 dla Seniorów',
    'awaiting_approval',
    '{"kind":"agent_command"}'::JSONB
  )
  RETURNING id INTO v_task_approval;

  INSERT INTO public.ai_tool_calls (club_id, task_id, user_id, tool_name, tool_input, risk_level, status)
  VALUES (
    v_club_id, v_task_approval, v_coach_id,
    'createTraining',
    '{"name":"Trening tygodniowy","trainingDate":"2026-06-02","startTime":"18:00","endTime":"19:30","location":"Boisko Wawrzeńczyce"}'::JSONB,
    'medium', 'pending'
  )
  RETURNING id INTO v_tool_call;

  INSERT INTO public.ai_action_approvals (club_id, task_id, tool_call_id, user_id, risk_level, status, preview)
  VALUES (
    v_club_id, v_task_approval, v_tool_call, v_coach_id, 'medium', 'pending',
    '{"title":"Trening tygodniowy","date":"2026-06-02","time":"18:00–19:30","location":"Boisko Wawrzeńczyce"}'::JSONB
  );

  -- Anulowane
  INSERT INTO public.ai_tasks (club_id, user_id, title, command, status, result_summary, metadata)
  VALUES (
    v_club_id, COALESCE(v_president_id, v_owner_id),
    'Raport dla prezesa',
    'Wygeneruj raport dla prezesa',
    'cancelled',
    'Anulowane przez użytkownika.',
    '{"kind":"agent_command"}'::JSONB
  );

  -- Automatyzacja: wygasające dokumenty
  INSERT INTO public.ai_tasks (club_id, user_id, title, command, status, metadata)
  VALUES (
    v_club_id, v_coach_id,
    'Automatyzacja: wygasające badania',
    'Pokaż zawodników z wygasającymi badaniami',
    'pending',
    '{"kind":"automation_proposal","automationType":"expiring_documents","suggestedAction":"createNotification"}'::JSONB
  )
  RETURNING id INTO v_task_pending;

  INSERT INTO public.ai_tasks (club_id, user_id, title, command, status, metadata)
  VALUES (
    v_club_id, v_owner_id,
    'Automatyzacja: sponsor bez kontaktu',
    'Znajdź sponsorów bez kontaktu od 30 dni',
    'pending',
    '{"kind":"automation_proposal","automationType":"sponsor_no_contact","suggestedAction":"generateReport"}'::JSONB
  );

  INSERT INTO public.ai_memory (club_id, user_id, summary, message_count)
  VALUES (
    v_club_id, v_coach_id,
    'Użytkownik analizował frekwencję i formę drużyny Seniorów. Ostatnie pytanie dotyczyło zawodników poniżej 60% frekwencji.',
    4
  );

END $$;
