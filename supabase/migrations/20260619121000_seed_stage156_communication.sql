-- ETAP 15.6 seed — Communication Hub (klub testowy Piorun)

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_owner_id UUID;
  v_team_senior UUID;
  v_team_u18 UUID;
  v_ann1 UUID := gen_random_uuid();
  v_ann2 UUID := gen_random_uuid();
  v_coach_msg UUID := gen_random_uuid();
  v_board_chat UUID := gen_random_uuid();
  v_team_chat UUID := gen_random_uuid();
BEGIN
  SELECT id INTO v_owner_id FROM public.profiles LIMIT 1;
  IF v_owner_id IS NULL THEN
    RAISE NOTICE 'Brak profili — pomijam seed Communication Hub';
    RETURN;
  END IF;

  SELECT id INTO v_team_senior FROM public.teams WHERE club_id = v_club_id AND category = 'seniors' LIMIT 1;
  SELECT id INTO v_team_u18 FROM public.teams WHERE club_id = v_club_id AND category = 'u18' LIMIT 1;

  DELETE FROM public.notification_events WHERE club_id = v_club_id;
  DELETE FROM public.chat_attachments WHERE club_id = v_club_id;
  DELETE FROM public.chat_messages WHERE club_id = v_club_id;
  DELETE FROM public.team_chats WHERE club_id = v_club_id;
  DELETE FROM public.coach_message_responses WHERE club_id = v_club_id;
  DELETE FROM public.coach_messages WHERE club_id = v_club_id;
  DELETE FROM public.announcement_reads WHERE club_id = v_club_id;
  DELETE FROM public.announcements WHERE club_id = v_club_id;

  INSERT INTO public.announcements (id, club_id, title, body, category, priority, visibility, status, created_by, published_at)
  VALUES
    (
      v_ann1,
      v_club_id,
      'Zebranie zarządu — harmonogram sezonu',
      'Zapraszamy członków zarządu na spotkanie w sobotę o 10:00. Prosimy o potwierdzenie obecności.',
      'board',
      'high',
      'role',
      'published',
      v_owner_id,
      timezone('utc', now()) - interval '2 days'
    ),
    (
      v_ann2,
      v_club_id,
      'Mecz ligowy — dojazd na stadion',
      'Seniorzy: autokar w niedzielę o 9:00 spod klubowego. Prosimy o punktualność.',
      'seniors',
      'normal',
      'team',
      'published',
      v_owner_id,
      timezone('utc', now()) - interval '1 day'
    );

  IF v_team_senior IS NOT NULL THEN
    UPDATE public.announcements SET target_team_id = v_team_senior, target_role = 'president' WHERE id IN (v_ann1, v_ann2);
  END IF;

  INSERT INTO public.announcement_reads (club_id, announcement_id, user_id)
  VALUES (v_club_id, v_ann1, v_owner_id)
  ON CONFLICT DO NOTHING;

  IF v_team_senior IS NOT NULL THEN
    INSERT INTO public.coach_messages (id, club_id, team_id, title, body, status, requires_attendance, created_by, published_at)
    VALUES (
      v_coach_msg,
      v_club_id,
      v_team_senior,
      'Trening przeniesiony na 19:30',
      'Zbiórka 13:15. Proszę zabrać dokument tożsamości.',
      'published',
      TRUE,
      v_owner_id,
      timezone('utc', now()) - interval '6 hours'
    );

    INSERT INTO public.coach_message_responses (club_id, coach_message_id, user_id, response)
    VALUES (v_club_id, v_coach_msg, v_owner_id, 'yes')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.team_chats (id, club_id, chat_type, name)
  VALUES (v_board_chat, v_club_id, 'board', 'Czat zarządu');

  IF v_team_senior IS NOT NULL THEN
    INSERT INTO public.team_chats (id, club_id, chat_type, team_id, name)
    VALUES (v_team_chat, v_club_id, 'team', v_team_senior, 'Seniorzy — drużyna');

    INSERT INTO public.chat_messages (club_id, chat_id, sender_id, body)
    VALUES (v_club_id, v_team_chat, v_owner_id, 'Cześć ekipa! Do zobaczenia na treningu 💪');
  END IF;

  INSERT INTO public.chat_messages (club_id, chat_id, sender_id, body)
  VALUES (v_club_id, v_board_chat, v_owner_id, 'Ustalamy budżet na nowy sezon.');

  RAISE NOTICE 'Communication Hub seed OK dla klubu %', v_club_id;
END $$;
