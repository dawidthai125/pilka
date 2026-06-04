-- Sprint 17.5 — test migration for schema_migrations tracking validation
-- Apply AFTER baseline + prod-parity-patch on staging only

CREATE TABLE IF NOT EXISTS public._sprint175_validation_marker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260705000000', 'test_validation')
ON CONFLICT DO NOTHING;
