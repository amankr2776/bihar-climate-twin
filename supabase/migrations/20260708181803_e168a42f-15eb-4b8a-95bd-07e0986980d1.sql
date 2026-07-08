CREATE TABLE public.phone_otps (
  phone text PRIMARY KEY,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.phone_otps TO service_role;

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: only service_role bypasses RLS to access this table.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_phone_otps_updated_at
BEFORE UPDATE ON public.phone_otps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
