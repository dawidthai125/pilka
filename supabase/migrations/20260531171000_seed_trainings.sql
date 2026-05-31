-- ETAP 3: Seed harmonogramu treningów (6 miesięcy), frekwencja, dostępność, powiadomienia

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_team_id UUID := 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  v_coach_id UUID;
  v_day DATE;
  v_training_id UUID;
  v_player RECORD;
  v_status public.training_status;
  v_avail public.availability_status;
  v_att public.attendance_status;
  v_reason public.absence_reason;
  v_membership RECORD;
BEGIN
  SELECT id INTO v_coach_id FROM public.profiles WHERE email = 'trener@piorun.test' LIMIT 1;

  DELETE FROM public.club_notifications WHERE club_id = v_club_id;
  DELETE FROM public.training_session_notes WHERE club_id = v_club_id;
  DELETE FROM public.training_attendance WHERE club_id = v_club_id;
  DELETE FROM public.training_availability WHERE club_id = v_club_id;
  DELETE FROM public.trainings WHERE club_id = v_club_id;

  FOR v_day IN
    SELECT generate_series(DATE '2026-03-01', DATE '2026-08-31', INTERVAL '1 day')::DATE
  LOOP
    IF EXTRACT(DOW FROM v_day) NOT IN (2, 4) THEN
      CONTINUE;
    END IF;

    v_status := CASE
      WHEN v_day < CURRENT_DATE THEN 'completed'::public.training_status
      WHEN v_day = CURRENT_DATE THEN 'planned'::public.training_status
      ELSE 'planned'::public.training_status
    END;

    INSERT INTO public.trainings (
      club_id, team_id, name, training_date, start_time, end_time,
      location, description, coach_user_id, status
    ) VALUES (
      v_club_id,
      v_team_id,
      'Trening ligowy',
      v_day,
      TIME '18:00',
      TIME '19:30',
      'Boisko Wawrzeńczyce',
      'Trening techniczno-taktyczny drużyny Seniorzy.',
      v_coach_id,
      v_status
    )
    RETURNING id INTO v_training_id;

    FOR v_player IN
      SELECT id, status AS player_status
      FROM public.players
      WHERE club_id = v_club_id AND team_id = v_team_id
    LOOP
      IF v_status = 'completed' THEN
        IF v_player.player_status = 'injured' THEN
          v_att := 'excused';
        ELSIF (abs(hashtext(v_player.id::TEXT || v_day::TEXT)) % 10) = 0 THEN
          v_att := 'absent';
        ELSIF (abs(hashtext(v_player.id::TEXT || v_day::TEXT || 'l')) % 12) = 0 THEN
          v_att := 'late';
        ELSE
          v_att := 'present';
        END IF;

        INSERT INTO public.training_attendance (
          club_id, training_id, player_id, status, marked_by
        ) VALUES (
          v_club_id, v_training_id, v_player.id, v_att, v_coach_id
        );
      ELSE
        v_avail := CASE (abs(hashtext(v_player.id::TEXT || v_day::TEXT || 'a')) % 5)
          WHEN 0 THEN 'absent'::public.availability_status
          WHEN 1 THEN 'unknown'::public.availability_status
          ELSE 'present'::public.availability_status
        END;

        v_reason := CASE
          WHEN v_avail = 'absent' THEN (
            ARRAY['work', 'school', 'injury', 'travel', 'illness', 'other']::public.absence_reason[]
          )[(abs(hashtext(v_player.id::TEXT || v_day::TEXT)) % 6) + 1]
          ELSE NULL
        END;

        INSERT INTO public.training_availability (
          club_id, training_id, player_id, status, absence_reason, responded_by
        ) VALUES (
          v_club_id, v_training_id, v_player.id, v_avail, v_reason, v_coach_id
        );
      END IF;
    END LOOP;

    IF v_status = 'completed' AND v_day >= CURRENT_DATE - 14 THEN
      INSERT INTO public.training_session_notes (
        club_id, training_id, author_id, content
      ) VALUES (
        v_club_id,
        v_training_id,
        v_coach_id,
        'Trening zakończony — dobra intensywność, praca nad pressingu.'
      );
    END IF;
  END LOOP;

  -- Powiadomienia przypomnienia (in_app) dla członków klubu z nadchodzącymi treningami
  FOR v_training_id IN
    SELECT t.id
    FROM public.trainings t
    WHERE t.club_id = v_club_id
      AND t.status = 'planned'
      AND t.training_date >= CURRENT_DATE
  LOOP
    FOR v_membership IN
      SELECT DISTINCT cm.user_id
      FROM public.club_memberships cm
      WHERE cm.club_id = v_club_id
        AND cm.status = 'active'
        AND cm.role = ANY (ARRAY[
          'owner', 'president', 'sports_director', 'coach', 'player', 'parent'
        ]::public.club_role[])
    LOOP
      INSERT INTO public.club_notifications (
        club_id, user_id, training_id, reminder_type, title, body, href, scheduled_at
      )
      SELECT
        v_club_id,
        v_membership.user_id,
        tr.id,
        r.reminder,
        'Przypomnienie o treningu',
        'Trening ' || tr.name || ' — ' || to_char(tr.training_date, 'DD.MM.YYYY') || ' o ' || to_char(tr.start_time, 'HH24:MI'),
        '/training/' || tr.id,
        (tr.training_date + tr.start_time) - r.reminder_offset
      FROM public.trainings tr
      CROSS JOIN (
        VALUES
          ('hours_48'::public.training_reminder_type, INTERVAL '48 hours'),
          ('hours_24'::public.training_reminder_type, INTERVAL '24 hours'),
          ('hours_3'::public.training_reminder_type, INTERVAL '3 hours')
      ) AS r(reminder, reminder_offset)
      WHERE tr.id = v_training_id
        AND (tr.training_date + tr.start_time) - r.reminder_offset <= timezone('utc', now()) + INTERVAL '7 days'
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
