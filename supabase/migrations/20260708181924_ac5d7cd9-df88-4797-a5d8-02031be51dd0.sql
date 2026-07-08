CREATE TABLE public.phone_identities (
  phone text PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.phone_identities TO service_role;

ALTER TABLE public.phone_identities ENABLE ROW LEVEL SECURITY;

-- Service-role only; no anon/authenticated policies.

CREATE TRIGGER update_phone_identities_updated_at
BEFORE UPDATE ON public.phone_identities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
