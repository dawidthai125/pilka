-- Model nazw klubu: public_name (branding) + official_name (licencja / dokumenty).
-- Zmiana nazwy oficjalnej w przyszłości = UPDATE official_name; slug i public_name pozostają stabilne.

COMMENT ON COLUMN public.clubs.public_name IS
  'Nazwa publiczna (branding) — UI, nawigacja, komunikacja z użytkownikami.';

COMMENT ON COLUMN public.clubs.official_name IS
  'Nazwa oficjalna — licencja, protokoły, zgłoszenia do związku. Edytowalna bez zmiany schematu.';

UPDATE public.clubs
SET official_name = 'GLKS Mietków'
WHERE official_name IS NULL OR btrim(official_name) = '';

ALTER TABLE public.clubs
  ALTER COLUMN official_name SET NOT NULL;
