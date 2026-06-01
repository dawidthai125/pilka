-- ETAP 15.10 fix — sync injury availability when declared_by unavailable (seed/admin)

CREATE OR REPLACE FUNCTION public.sync_injury_availability_impact()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status public.availability_status;
  v_declared_by UUID;
BEGIN
  v_declared_by := COALESCE(NEW.created_by, auth.uid());

  IF v_declared_by IS NULL THEN
    SELECT cm.user_id INTO v_declared_by
    FROM public.club_memberships cm
    WHERE cm.club_id = NEW.club_id
      AND cm.status = 'active'
    ORDER BY
      CASE cm.role
        WHEN 'owner' THEN 1
        WHEN 'president' THEN 2
        WHEN 'sports_director' THEN 3
        WHEN 'coach' THEN 4
        ELSE 5
      END
    LIMIT 1;
  END IF;

  IF NEW.injury_status IN ('active', 'rehabilitation')
    AND NEW.availability_impact IS NOT NULL
    AND v_declared_by IS NOT NULL THEN
    v_status := CASE
      WHEN NEW.availability_impact = 'unavailable' THEN 'absent'::public.availability_status
      ELSE 'limited'::public.availability_status
    END;

    INSERT INTO public.player_availability (
      club_id, player_id, event_type, club_event_ref,
      status, absence_reason, comment, declared_by
    )
    VALUES (
      NEW.club_id,
      NEW.player_id,
      'club_event',
      NEW.id,
      v_status,
      'injury',
      left(NEW.description, 500),
      v_declared_by
    )
    ON CONFLICT (club_event_ref, player_id)
    WHERE event_type = 'club_event'
    DO UPDATE SET
      status = EXCLUDED.status,
      absence_reason = EXCLUDED.absence_reason,
      comment = EXCLUDED.comment,
      declared_by = EXCLUDED.declared_by,
      updated_at = timezone('utc', now());
  ELSE
    DELETE FROM public.player_availability
    WHERE club_id = NEW.club_id
      AND player_id = NEW.player_id
      AND event_type = 'club_event'
      AND club_event_ref = NEW.id;
  END IF;

  NEW.is_active := NEW.injury_status NOT IN ('closed', 'ready_for_training');

  RETURN NEW;
END;
$$;
