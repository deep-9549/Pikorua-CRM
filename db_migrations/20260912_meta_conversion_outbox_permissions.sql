-- Follow-up for environments where 20260912_meta_conversion_outbox.sql was
-- applied before the application-role grant was added.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pikorua_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.meta_conversion_outbox TO pikorua_app';
  END IF;
END
$$;
