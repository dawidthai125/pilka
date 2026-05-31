-- ETAP 6 seed: sponsorzy Piorun Wawrzeńczyce

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_owner_id UUID;
  v_sponsor_user_id UUID;
  v_s1 UUID := 'c6010001-0001-4000-8000-000000000001';
  v_s2 UUID := 'c6010002-0002-4000-8000-000000000002';
  v_s3 UUID := 'c6010003-0003-4000-8000-000000000003';
  v_s4 UUID := 'c6010004-0004-4000-8000-000000000004';
  v_s5 UUID := 'c6010005-0005-4000-8000-000000000005';
  v_s6 UUID := 'c6010006-0006-4000-8000-000000000006';
  v_s7 UUID := 'c6010007-0007-4000-8000-000000000007';
  v_s8 UUID := 'c6010008-0008-4000-8000-000000000008';
  v_s9 UUID := 'c6010009-0009-4000-8000-000000000009';
  v_s10 UUID := 'c6010010-0010-4000-8000-000000000010';
  v_c1 UUID := 'd7010001-0001-4000-8000-000000000001';
  v_c2 UUID := 'd7010002-0002-4000-8000-000000000002';
  v_c3 UUID := 'd7010003-0003-4000-8000-000000000003';
  v_c4 UUID := 'd7010004-0004-4000-8000-000000000004';
  v_c5 UUID := 'd7010005-0005-4000-8000-000000000005';
  v_p1 UUID := 'e8010001-0001-4000-8000-000000000001';
  v_p2 UUID := 'e8010002-0002-4000-8000-000000000002';
  v_p3 UUID := 'e8010003-0003-4000-8000-000000000003';
  v_r1 UUID := 'f9010001-0001-4000-8000-000000000001';
  v_match_id UUID;
BEGIN
  SELECT id INTO v_owner_id FROM public.profiles WHERE email = 'wlasciciel@piorun.test' LIMIT 1;
  SELECT id INTO v_sponsor_user_id FROM public.profiles WHERE email = 'sponsor@piorun.test' LIMIT 1;
  SELECT id INTO v_match_id FROM public.matches WHERE club_id = v_club_id AND status = 'completed' ORDER BY match_date DESC LIMIT 1;

  DELETE FROM public.sponsor_financial_entries WHERE club_id = v_club_id;
  DELETE FROM public.sponsor_reports WHERE club_id = v_club_id;
  DELETE FROM public.sponsor_exposure WHERE club_id = v_club_id;
  DELETE FROM public.sponsor_publication_links WHERE club_id = v_club_id;
  DELETE FROM public.sponsor_publications WHERE club_id = v_club_id;
  DELETE FROM public.sponsor_notes WHERE club_id = v_club_id;
  DELETE FROM public.sponsor_leads WHERE club_id = v_club_id;
  DELETE FROM public.sponsor_contract_attachments WHERE club_id = v_club_id;
  DELETE FROM public.sponsor_contracts WHERE club_id = v_club_id;
  DELETE FROM public.sponsors WHERE club_id = v_club_id;

  INSERT INTO public.sponsors (
    id, club_id, profile_id, company_name, nip, address, city, postal_code, website, phone, email,
    contact_first_name, contact_last_name, contact_position, contact_phone, contact_email, cooperation_status
  ) VALUES
    (v_s1, v_club_id, v_sponsor_user_id, 'Budmax Sp. z o.o.', '6830001122', 'ul. Sportowa 12', 'Wawrzeńczyce', '32-020', 'https://budmax.example', '+48 12 345 67 01', 'kontakt@budmax.example', 'Piotr', 'Budny', 'Dyrektor marketingu', '+48 600 111 001', 'p.budny@budmax.example', 'active'),
    (v_s2, v_club_id, NULL, 'AutoSerwis Kowalski', '6830002233', 'ul. Główna 45', 'Wieliczka', '32-020', 'https://autoserwis-kowalski.example', '+48 12 345 67 02', 'biuro@autoserwis.example', 'Jan', 'Kowalski', 'Właściciel', '+48 600 222 002', 'jan@autoserwis.example', 'active'),
    (v_s3, v_club_id, NULL, 'Pizzeria Roma', '6830003344', 'Rynek 3', 'Wawrzeńczyce', '32-020', NULL, '+48 12 345 67 03', 'roma@pizza.example', 'Maria', 'Romano', 'Manager', '+48 600 333 003', 'maria@pizza.example', 'active'),
    (v_s4, v_club_id, NULL, 'Kancelaria Prawna Nowak', '6830004455', 'ul. Sądowa 8', 'Kraków', '31-001', 'https://nowak-legal.example', '+48 12 345 67 04', 'info@nowak-legal.example', 'Adam', 'Nowak', 'Partner', '+48 600 444 004', 'adam@nowak-legal.example', 'expiring'),
    (v_s5, v_club_id, NULL, 'Hotel Wawrzeńczyce', '6830005566', 'ul. Parkowa 1', 'Wawrzeńczyce', '32-020', 'https://hotel-wawrzenczyce.example', '+48 12 345 67 05', 'rezerwacja@hotel.example', 'Ewa', 'Wiśniewska', 'Dyrektor', '+48 600 555 005', 'ewa@hotel.example', 'active'),
    (v_s6, v_club_id, NULL, 'Sklep Sportowy PRO', '6830006677', 'ul. Handlowa 22', 'Kraków', '30-001', 'https://sportpro.example', '+48 12 345 67 06', 'sklep@sportpro.example', 'Tomasz', 'Zieliński', 'Właściciel', '+48 600 666 006', 'tomasz@sportpro.example', 'active'),
    (v_s7, v_club_id, NULL, 'Termbud S.A.', '6830007788', 'ul. Budowlana 99', 'Kraków', '30-100', 'https://termbud.example', '+48 12 345 67 07', 'kontakt@termbud.example', 'Krzysztof', 'Lis', 'Prezes', '+48 600 777 007', 'k.lis@termbud.example', 'ended'),
    (v_s8, v_club_id, NULL, 'MediaPress Group', '6830008899', 'ul. Medialna 5', 'Kraków', '31-500', 'https://mediapress.example', '+48 12 345 67 08', 'redakcja@mediapress.example', 'Anna', 'Krawczyk', 'Redaktor', '+48 600 888 008', 'anna@mediapress.example', 'active'),
    (v_s9, v_club_id, NULL, 'Agro-Farm Sp. z o.o.', '6830009900', 'ul. Polna 77', 'Wawrzeńczyce', '32-020', NULL, '+48 12 345 67 09', 'biuro@agrofarm.example', 'Marek', 'Sowa', 'Dyrektor', '+48 600 999 009', 'marek@agrofarm.example', 'potential'),
    (v_s10, v_club_id, NULL, 'TechSolutions IT', '6830010011', 'ul. Informatyczna 14', 'Kraków', '30-200', 'https://techsolutions.example', '+48 12 345 67 10', 'hello@techsolutions.example', 'Ola', 'Maj', 'CEO', '+48 600 000 010', 'ola@techsolutions.example', 'potential');

  INSERT INTO public.sponsor_contracts (
    id, club_id, sponsor_id, name, start_date, end_date, value, currency, benefits_description
  ) VALUES
    (v_c1, v_club_id, v_s1, 'Umowa główna — sponsoring sezon 2025/2026', '2025-07-01', '2026-06-30', 25000, 'PLN', 'Logo na strojach meczowych, baner przy boisku, wzmianki w social media.'),
    (v_c2, v_club_id, v_s2, 'Partner techniczny — serwis floty', '2025-08-01', '2026-07-31', 8000, 'PLN', 'Serwis autobusu drużyny, logo na koszulkach treningowych.'),
    (v_c3, v_club_id, v_s3, 'Partner gastronomiczny', '2025-09-01', '2026-08-31', 5000, 'PLN', 'Catering po meczach domowych, publikacje w social media.'),
    (v_c4, v_club_id, v_s4, 'Partner prawny', '2024-09-01', CURRENT_DATE + 45, 12000, 'PLN', 'Obsługa prawna klubu, logo na stronie www.'),
    (v_c5, v_club_id, v_s5, 'Partner hotelowy', '2025-10-01', '2026-09-30', 15000, 'PLN', 'Noclegi dla drużyny wyjazdowej, baner w lobby.');

  INSERT INTO public.sponsor_contract_attachments (club_id, contract_id, file_name, file_url, uploaded_by)
  VALUES
    (v_club_id, v_c1, 'umowa-budmax-2025.pdf', 'https://example.com/docs/umowa-budmax-2025.pdf', v_owner_id),
    (v_club_id, v_c2, 'umowa-autoserwis-2025.pdf', 'https://example.com/docs/umowa-autoserwis-2025.pdf', v_owner_id);

  INSERT INTO public.sponsor_leads (club_id, company_name, contact_name, contact_email, contact_phone, status, notes)
  VALUES
    (v_club_id, 'TechSolutions IT', 'Ola Maj', 'ola@techsolutions.example', '+48 600 000 010', 'negotiation', 'Zainteresowani pakietem premium na kolejny sezon.'),
    (v_club_id, 'Agro-Farm Sp. z o.o.', 'Marek Sowa', 'marek@agrofarm.example', '+48 600 999 009', 'offer_sent', 'Oferta wysłana 2026-05-15.'),
    (v_club_id, 'Bank Regionalny SA', 'Katarzyna Więcek', 'k.wiecek@bankreg.example', '+48 600 123 456', 'new', 'Pierwszy kontakt na spotkaniu biznesowym.');

  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.sponsor_notes (club_id, sponsor_id, note_type, content, contact_date, author_id)
    VALUES
      (v_club_id, v_s1, 'meeting', 'Spotkanie dot. przedłużenia umowy na sezon 2026/2027.', CURRENT_DATE - 14, v_owner_id),
      (v_club_id, v_s1, 'email', 'Wysłano raport Q1 z ekspozycją marki.', CURRENT_DATE - 7, v_owner_id),
      (v_club_id, v_s4, 'phone', 'Przypomnienie o końcu umowy za 45 dni.', CURRENT_DATE - 3, v_owner_id),
      (v_club_id, v_s2, 'note', 'Sponsor zainteresowany dodatkowym banerem na turnieju.', CURRENT_DATE - 30, v_owner_id);
  END IF;

  INSERT INTO public.sponsor_publications (id, club_id, title, published_at, description, source)
  VALUES
    (v_p1, v_club_id, 'Podziękowania dla Budmax po wygranym meczu', CURRENT_DATE - 10, 'Post z podziękowaniami dla sponsora głównego.', 'facebook'),
    (v_p2, v_club_id, 'AutoSerwis Kowalski — partner techniczny', CURRENT_DATE - 25, 'Prezentacja partnera na stronie klubu.', 'website'),
    (v_p3, v_club_id, 'Pizzeria Roma — catering po meczu', CURRENT_DATE - 5, 'Relacja z Instagram po meczu domowym.', 'instagram');

  INSERT INTO public.sponsor_publication_links (club_id, publication_id, sponsor_id)
  VALUES
    (v_club_id, v_p1, v_s1),
    (v_club_id, v_p2, v_s2),
    (v_club_id, v_p3, v_s3),
    (v_club_id, v_p1, v_s8);

  INSERT INTO public.sponsor_exposure (club_id, sponsor_id, exposure_type, title, description, exposure_date, publication_id, match_id)
  VALUES
    (v_club_id, v_s1, 'publication', 'Post Facebook — wygrany mecz', 'Logo Budmax w grafice meczowej.', CURRENT_DATE - 10, v_p1, v_match_id),
    (v_club_id, v_s1, 'sponsored_match', 'Mecz sponsorowany — Budmax', 'Baner przy boisku podczas meczu domowego.', CURRENT_DATE - 10, NULL, v_match_id),
    (v_club_id, v_s2, 'publication', 'Artykuł na stronie klubu', 'Profil partnera technicznego.', CURRENT_DATE - 25, v_p2, NULL),
    (v_club_id, v_s5, 'sponsored_event', 'Turniej młodzieżowy — Hotel Wawrzeńczyce', 'Sponsor tytularny turnieju U12.', CURRENT_DATE - 60, NULL, NULL);

  INSERT INTO public.sponsor_reports (id, club_id, sponsor_id, period_start, period_end, title, content, status, created_by)
  VALUES (
    v_r1, v_club_id, v_s1, '2025-07-01', '2025-12-31',
    'Raport sponsorski Q3–Q4 2025 — Budmax',
    jsonb_build_object(
      'publicationsCount', 4,
      'matchesCount', 8,
      'eventsCount', 1,
      'teamResults', 'Forma: WWDLW',
      'highlights', jsonb_build_array('Logo na strojach', 'Baner przy boisku', '4 publikacje social media')
    ),
    'published',
    v_owner_id
  );

  INSERT INTO public.sponsor_financial_entries (club_id, sponsor_id, contract_id, entry_type, amount, currency, due_date, status, reference_number, notes)
  VALUES
    (v_club_id, v_s1, v_c1, 'installment', 12500, 'PLN', '2025-10-01', 'paid', 'FV/2025/001', 'Rata I — sezon 2025/2026'),
    (v_club_id, v_s1, v_c1, 'installment', 12500, 'PLN', '2026-03-01', 'pending', 'FV/2026/002', 'Rata II — sezon 2025/2026'),
    (v_club_id, v_s2, v_c2, 'invoice', 8000, 'PLN', '2025-11-15', 'paid', 'FV/AS/2025/01', 'Płatność roczna');

END $$;
