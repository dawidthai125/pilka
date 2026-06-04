-- Hotfix 18.3d — enable club bootstrap ON CONFLICT (club_id, code)
-- Partial unique index is not inferrable by PostgreSQL for bare ON CONFLICT.

BEGIN;

DROP INDEX IF EXISTS public.availability_reasons_club_code_unique;

CREATE UNIQUE INDEX availability_reasons_club_id_code_key
  ON public.availability_reasons (club_id, code);

COMMIT;
