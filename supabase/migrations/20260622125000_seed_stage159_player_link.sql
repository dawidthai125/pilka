-- ETAP 15.9 — powiązanie zawodnik@ z rekordem players (portal + audyt R159-06)

UPDATE public.players
SET email = 'zawodnik@piorun.test'
WHERE id = 'c1000001-0000-4000-8000-000000000006'
  AND club_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND (email IS NULL OR email <> 'zawodnik@piorun.test');
