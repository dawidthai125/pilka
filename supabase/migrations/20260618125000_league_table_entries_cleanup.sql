-- Usuń przestarzałe wpisy tabeli publicznej po zmianie nazwy rozgrywek (B Klasa → Pełna nazwa Grupy VII)

DELETE FROM public.league_table_entries
WHERE club_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND season = '2025/2026'
  AND competition = 'B Klasa';
