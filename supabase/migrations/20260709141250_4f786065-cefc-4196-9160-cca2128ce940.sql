DROP POLICY IF EXISTS "Public read ingest_audit" ON public.ingest_audit;
REVOKE SELECT ON public.ingest_audit FROM anon;