
CREATE TABLE public.climate_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  district_id TEXT NOT NULL REFERENCES public.climate_districts(id) ON DELETE CASCADE,
  forecast_for DATE NOT NULL,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rainfall_mm DOUBLE PRECISION,
  tmax_c DOUBLE PRECISION,
  tmin_c DOUBLE PRECISION,
  source TEXT NOT NULL DEFAULT 'openmeteo-gfs',
  dataset_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (district_id, forecast_for, source)
);

CREATE INDEX idx_climate_forecasts_district_day ON public.climate_forecasts (district_id, forecast_for);
CREATE INDEX idx_climate_forecasts_forecast_for ON public.climate_forecasts (forecast_for);

GRANT SELECT ON public.climate_forecasts TO anon;
GRANT SELECT ON public.climate_forecasts TO authenticated;
GRANT ALL ON public.climate_forecasts TO service_role;

ALTER TABLE public.climate_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read forecasts"
  ON public.climate_forecasts
  FOR SELECT
  TO anon, authenticated
  USING (true);
