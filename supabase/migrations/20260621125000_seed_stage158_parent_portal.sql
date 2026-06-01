-- ETAP 15.8 — seed parent CRM portal (rodzic@piorun.test)

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_player_id UUID := 'c1000001-0000-4000-8000-000000000006';
  v_parent_id UUID;
  v_staff_id UUID;
BEGIN
  SELECT id INTO v_parent_id FROM public.profiles WHERE email = 'rodzic@piorun.test' LIMIT 1;
  SELECT id INTO v_staff_id FROM public.profiles WHERE email = 'prezes@piorun.test' LIMIT 1;

  IF v_parent_id IS NULL THEN
    RAISE NOTICE 'ETAP 15.8 parent seed SKIP — brak rodzic@piorun.test';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.crm_contacts
    WHERE club_id = v_club_id AND profile_id = v_parent_id
  ) THEN
    INSERT INTO public.crm_contacts (
      club_id, contact_type, name, contact_person, email, phone, profile_id, player_id, notes, created_by
    )
    VALUES (
      v_club_id,
      'parent',
      'Anna Rodzic',
      'Anna Rodzic',
      'rodzic@piorun.test',
      '+48 600 700 800',
      v_parent_id,
      v_player_id,
      'Kontakt CRM rodzica — portal własnych danych',
      v_staff_id
    );
  END IF;

  RAISE NOTICE 'ETAP 15.8 parent CRM portal seed OK';
END $$;
