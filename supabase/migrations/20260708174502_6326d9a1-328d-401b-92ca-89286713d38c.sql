-- Restrict ingest_audit to admins only
DROP POLICY IF EXISTS "Public read ingest_audit" ON public.ingest_audit;

REVOKE SELECT ON public.ingest_audit FROM anon;

CREATE POLICY "Admins read ingest_audit"
ON public.ingest_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Tighten SECURITY DEFINER function: remove broad EXECUTE, keep only what RLS needs
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
