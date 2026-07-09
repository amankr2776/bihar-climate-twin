
-- 1. Public transparency: anyone can read the ingest audit log (metadata only; no PII)
CREATE POLICY "Public read ingest_audit"
  ON public.ingest_audit
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.ingest_audit TO anon;

-- 2. Enable scheduling extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Nightly retention + heartbeat: trim observations > 5 years old and log run
CREATE OR REPLACE FUNCTION public.varuna_nightly_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  started TIMESTAMPTZ := now();
  deleted_count INT := 0;
BEGIN
  WITH d AS (
    DELETE FROM public.climate_observations
    WHERE observed_on < (current_date - INTERVAL '5 years')
    RETURNING 1
  )
  SELECT count(*) INTO deleted_count FROM d;

  INSERT INTO public.ingest_audit(source, dataset_version, rows_received, rows_upserted, status, detail, started_at, finished_at)
  VALUES (
    'retention',
    'nightly-5y',
    deleted_count,
    deleted_count,
    'ok',
    'Automated retention + heartbeat (rows deleted).',
    started,
    now()
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.ingest_audit(source, status, detail, started_at, finished_at)
  VALUES ('retention', 'error', SQLERRM, started, now());
END;
$$;

REVOKE ALL ON FUNCTION public.varuna_nightly_retention() FROM PUBLIC, anon, authenticated;

-- Remove any previous schedule with same name, then schedule daily at 19:30 UTC (01:00 IST)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'varuna-nightly-retention';
SELECT cron.schedule(
  'varuna-nightly-retention',
  '30 19 * * *',
  $cron$SELECT public.varuna_nightly_retention();$cron$
);
