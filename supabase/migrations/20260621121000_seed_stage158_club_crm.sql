-- ETAP 15.8 seed — sample CRM data for test club

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_coach_id UUID;
  v_sponsor_contact UUID;
  v_parent_contact UUID;
  v_volunteer_contact UUID;
  v_event_id UUID;
BEGIN
  SELECT id INTO v_coach_id FROM public.profiles WHERE email = 'prezes@piorun.test' LIMIT 1;

  INSERT INTO public.crm_contacts (
    club_id, contact_type, name, contact_person, email, phone, pipeline_status, notes, created_by
  )
  VALUES
    (v_club_id, 'sponsor', 'AutoSerwis Kowalski', 'Jan Kowalski', 'kontakt@autoserwis.test', '+48 500 100 200', 'negotiation', 'Potencjalny sponsor główny', v_coach_id),
    (v_club_id, 'sponsor', 'BudMax Sp. z o.o.', 'Anna Nowak', 'anna@budmax.test', '+48 500 300 400', 'offer_sent', 'Oferta wysłana 15.05', v_coach_id),
    (v_club_id, 'partner', 'Fizjoterapia SportMed', 'Dr Piotr Wiśniewski', 'kontakt@sportmed.test', '+48 500 500 600', 'active_sponsor', 'Rabaty dla zawodników — rehabilitacja, masaż', v_coach_id),
    (v_club_id, 'donor', 'Anonimowy darczyńca', NULL, NULL, NULL, 'active_sponsor', 'Darowizna na sprzęt', v_coach_id),
    (v_club_id, 'volunteer', 'Maria Lewandowska', 'Maria Lewandowska', 'maria.l@test', '+48 600 111 222', 'new_contact', 'Pomoc przy meczach domowych', v_coach_id),
    (v_club_id, 'media', 'Radio Wawrzeńczyce', 'Redakcja', 'redakcja@radio.test', NULL, 'conversation', 'Relacja z meczu', v_coach_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sponsor_contact FROM public.crm_contacts
  WHERE club_id = v_club_id AND name = 'AutoSerwis Kowalski' LIMIT 1;

  IF v_sponsor_contact IS NOT NULL THEN
    UPDATE public.crm_contacts
    SET partner_services = 'Rehabilitacja, masaż sportowy', partner_discounts = '2 wizyty gratis / sezon'
    WHERE club_id = v_club_id AND contact_type = 'partner' AND name = 'Fizjoterapia SportMed';

    UPDATE public.crm_contacts
    SET volunteer_areas = ARRAY['match_help', 'event_org']::public.crm_volunteer_area[]
    WHERE club_id = v_club_id AND contact_type = 'volunteer';

    INSERT INTO public.crm_interactions (club_id, contact_id, interaction_type, title, body, occurred_at, created_by)
    VALUES
      (v_club_id, v_sponsor_contact, 'phone', 'Rozmowa wstępna', 'Zainteresowanie tablicą LED', timezone('utc', now()) - interval '5 days', v_coach_id),
      (v_club_id, v_sponsor_contact, 'meeting', 'Spotkanie u sponsora', 'Omówiono pakiet gold', timezone('utc', now()) - interval '2 days', v_coach_id);

    INSERT INTO public.crm_tasks (club_id, contact_id, task_type, title, notes, due_at, status, created_by)
    VALUES
      (v_club_id, v_sponsor_contact, 'send_offer', 'Wysłać ofertę pakiet Gold', 'Do piątku', timezone('utc', now()) + interval '3 days', 'open', v_coach_id),
      (v_club_id, NULL, 'reminder', 'Oddzwonić do BudMax', 'Status oferty', timezone('utc', now()) + interval '1 day', 'open', v_coach_id);

    INSERT INTO public.crm_events (club_id, event_type, title, description, location, starts_at, ends_at, created_by)
    VALUES (
      v_club_id, 'sponsor_meeting', 'Spotkanie ze sponsorami', 'Prezentacja planu sezonu',
      'Sala klubowa', timezone('utc', now()) + interval '14 days', timezone('utc', now()) + interval '14 days 2 hours', v_coach_id
    )
    RETURNING id INTO v_event_id;

    INSERT INTO public.crm_event_attendees (club_id, event_id, contact_id, rsvp_status)
    VALUES (v_club_id, v_event_id, v_sponsor_contact, 'invited');

    INSERT INTO public.crm_donations (club_id, contact_id, amount, donated_at, source, purpose, created_by)
    VALUES (v_club_id, NULL, 2500.00, CURRENT_DATE - 30, 'Darowizna indywidualna', 'Sprzęt treningowy', v_coach_id);
  END IF;

  RAISE NOTICE 'ETAP 15.8 CRM seed OK for club %', v_club_id;
END $$;
