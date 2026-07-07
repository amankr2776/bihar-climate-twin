
-- Districts registry
CREATE TABLE public.climate_districts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Bihar',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.climate_districts TO anon, authenticated;
GRANT ALL ON public.climate_districts TO service_role;
ALTER TABLE public.climate_districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read districts" ON public.climate_districts FOR SELECT TO anon, authenticated USING (true);

-- Daily observations from IMD grids
CREATE TABLE public.climate_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id TEXT NOT NULL REFERENCES public.climate_districts(id) ON DELETE CASCADE,
  observed_on DATE NOT NULL,
  rainfall_mm DOUBLE PRECISION,
  tmax_c DOUBLE PRECISION,
  tmin_c DOUBLE PRECISION,
  source TEXT NOT NULL DEFAULT 'imd',
  dataset_version TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (district_id, observed_on, source)
);
GRANT SELECT ON public.climate_observations TO anon, authenticated;
GRANT ALL ON public.climate_observations TO service_role;
ALTER TABLE public.climate_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read observations" ON public.climate_observations FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX climate_observations_district_date_idx ON public.climate_observations (district_id, observed_on DESC);
CREATE INDEX climate_observations_date_idx ON public.climate_observations (observed_on DESC);
