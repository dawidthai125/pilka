-- ETAP 5: Seed przykładowych danych AI — Piorun Wawrzeńczyce

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_coach_id UUID;
  v_owner_id UUID;
  v_conv_id UUID;
  v_match_id UUID;
BEGIN
  SELECT id INTO v_coach_id FROM public.profiles WHERE email = 'trener@piorun.test' LIMIT 1;
  SELECT id INTO v_owner_id FROM public.profiles WHERE email = 'wlasciciel@piorun.test' LIMIT 1;

  SELECT id INTO v_match_id FROM public.matches
  WHERE club_id = v_club_id AND status = 'completed'
  ORDER BY match_date DESC LIMIT 1;

  DELETE FROM public.ai_messages WHERE club_id = v_club_id;
  DELETE FROM public.ai_conversations WHERE club_id = v_club_id;
  DELETE FROM public.ai_reports WHERE club_id = v_club_id;
  DELETE FROM public.ai_suggestions WHERE club_id = v_club_id;

  INSERT INTO public.ai_conversations (club_id, user_id, title, is_pinned)
  VALUES (v_club_id, v_coach_id, 'Frekwencja treningowa — tydzień', TRUE)
  RETURNING id INTO v_conv_id;

  INSERT INTO public.ai_messages (club_id, conversation_id, role, content) VALUES
    (v_club_id, v_conv_id, 'user', 'Ilu zawodników było na treningu w tym tygodniu?'),
    (v_club_id, v_conv_id, 'assistant',
     'Na podstawie danych klubu: w bieżącym tygodniu odbyły się zaplanowane treningi drużyny Seniorów. Średnia frekwencja wynosi ok. 78%. Najniższą frekwencję ma grupa z 3 zawodnikami poniżej 60% — warto skontaktować się indywidualnie.');

  INSERT INTO public.ai_conversations (club_id, user_id, title, is_pinned)
  VALUES (v_club_id, v_coach_id, 'Forma drużyny', FALSE);

  INSERT INTO public.ai_reports (
    club_id, category, report_type, title, content, status,
    metadata, source_type, source_id, created_by
  ) VALUES
  (
    v_club_id, 'matches', 'match_summary',
    'Raport meczowy AI — ostatni mecz ligowy',
    E'## Podsumowanie\n\nMecz zakończył się pozytywnym wynikiem dla Piorun Wawrzeńczyce. Drużyna kontrolowała większość spotkania.\n\n## Najważniejsze wydarzenia\n\n- Bramka w pierwszej połowie\n- Asysta przy golu\n- Żółta kartka w drugiej połowie\n\n## Wyróżnieni zawodnicy\n\n- MVP meczu — wyróżniona aktywność ofensywna\n\n## Mocne strony\n\n- Pressing w środku pola\n- Skuteczność stałych fragmentów\n\n## Słabe strony\n\n- Koncentracja w końcówce meczu\n- Straty piłki przy wyjściu z obrony',
    'draft',
    jsonb_build_object('generatedBy', 'ai', 'matchId', v_match_id),
    'match', v_match_id, v_coach_id
  ),
  (
    v_club_id, 'trainings', 'training_weekly',
    'Raport treningowy AI — podsumowanie tygodnia',
    E'## Frekwencja\n\nŚrednia frekwencja na treningach w tym tygodniu: 78%. 2 zawodników nie potwierdziło obecności przed treningiem.\n\n## Aktywność\n\nNajwyższą frekwencję sezonową utrzymuje grupa podstawowa (powyżej 85%).\n\n## Nieobecności\n\nDominują powody: praca i kontuzje. Warto przypomnieć o wcześniejszym zgłaszaniu absencji.',
    'draft',
    jsonb_build_object('generatedBy', 'ai', 'week', '2026-W22'),
    'week', NULL, v_coach_id
  ),
  (
    v_club_id, 'management', 'management_monthly',
    'Raport zarządu AI — maj 2026',
    E'## Podsumowanie miesiąca\n\n- Treningi: zaplanowane i zrealizowane zgodnie z harmonogramem\n- Mecze: 4 spotkania ligowe w B Klasie\n- Średnia frekwencja treningowa: 76%\n- Aktywni zawodnicy: 25 w kadrze Seniorów\n\n## Najważniejsze wydarzenia\n\n- Seria 3 zwycięstw z rzędu\n- Aktualizacja dokumentacji medycznej 2 zawodników\n\n## Rekomendacje\n\n- Monitorować frekwencję przed kluczowymi meczami\n- Zaplanować spotkanie sztabu przed kolejką',
    'published',
    jsonb_build_object('generatedBy', 'ai', 'month', '2026-05'),
    'month', NULL, v_owner_id
  ),
  (
    v_club_id, 'matches', 'social_facebook',
    'Post Facebook — wynik meczu',
    E'⚽ Piorun Wawrzeńczyce w akcji! Kolejny mecz ligowy za nami — dziękujemy kibicom za wsparcie! 💙⚡ #PiorunWawrzenczyce #BKlasa',
    'draft',
    jsonb_build_object('platform', 'facebook', 'matchId', v_match_id),
    'match', v_match_id, v_coach_id
  ),
  (
    v_club_id, 'matches', 'social_instagram',
    'Post Instagram — wynik meczu',
    E'⚡ Wynik meczu w B Klasie! Dzięki zespołowi za walkę do końca. #Piorun #AmatorskaPiłka',
    'draft',
    jsonb_build_object('platform', 'instagram', 'matchId', v_match_id),
    'match', v_match_id, v_coach_id
  );

  INSERT INTO public.ai_suggestions (
    club_id, suggestion_type, title, description, action_hint, metadata
  ) VALUES
  (
    v_club_id, 'low_attendance', 'Niska frekwencja treningowa',
    '3 zawodników ma frekwencję poniżej 60% w bieżącym sezonie.',
    'Skontaktuj się indywidualnie i ustal plan poprawy obecności.',
    '{"threshold": 60, "playerCount": 3}'::JSONB
  ),
  (
    v_club_id, 'expiring_documents', 'Wygasające badania lekarskie',
    '2 zawodników ma badania wygasające w ciągu 30 dni.',
    'Przypomnij o konieczności odnowienia dokumentacji medycznej.',
    '{"daysAhead": 30, "playerCount": 2}'::JSONB
  ),
  (
    v_club_id, 'high_injuries', 'Podwyższona liczba kontuzji',
    '4 zawodników ma status kontuzji w kadrze Seniorów.',
    'Rozważ modyfikację obciążeń treningowych i konsultację z fizjoterapeutą.',
    '{"injuredCount": 4}'::JSONB
  );
END $$;
