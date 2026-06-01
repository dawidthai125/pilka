-- ETAP 15.7 seed — sync existing training availability into player_availability

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
BEGIN
  INSERT INTO public.player_availability (
    club_id, player_id, event_type, training_id, status, absence_reason, comment, declared_by
  )
  SELECT
    ta.club_id,
    ta.player_id,
    'training',
    ta.training_id,
    ta.status,
    ta.absence_reason,
    ta.notes,
    COALESCE(
      ta.responded_by,
      (SELECT id FROM public.profiles WHERE email = 'trener@piorun.test' LIMIT 1)
    )
  FROM public.training_availability ta
  WHERE ta.club_id = v_club_id
  ON CONFLICT (training_id, player_id) WHERE training_id IS NOT NULL DO NOTHING;

  INSERT INTO public.attendance_records (
    club_id, player_id, source_type, training_id, attendance_status, comment, recorded_by, recorded_at
  )
  SELECT
    att.club_id,
    att.player_id,
    'training',
    att.training_id,
    att.status,
    att.notes,
    att.marked_by,
    att.marked_at
  FROM public.training_attendance att
  WHERE att.club_id = v_club_id
  ON CONFLICT (training_id, player_id) WHERE training_id IS NOT NULL DO NOTHING;

  RAISE NOTICE 'ETAP 15.7 seed OK for club %', v_club_id;
END $$;
