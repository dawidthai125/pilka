-- Fix seed: allow migrations without auth.uid()

CREATE OR REPLACE FUNCTION public.enforce_content_publish_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    IF NOT public.actor_can_publish_content(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role to publish content';
    END IF;
    IF NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
  END IF;

  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF NOT public.actor_can_publish_content(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role to approve content';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
