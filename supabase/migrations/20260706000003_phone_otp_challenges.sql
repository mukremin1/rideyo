-- External SMS OTP challenges (Netgsm / İletiMerkezi via edge functions).

CREATE TABLE IF NOT EXISTS public.phone_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_phone_created
  ON public.phone_otp_challenges(phone_e164, created_at DESC);

ALTER TABLE public.phone_otp_challenges ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) accesses this table.

CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_phone(p_phone text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id
  FROM auth.users
  WHERE phone = p_phone
     OR email = replace(replace(p_phone, '+', ''), ' ', '') || '@phone.ride-yo.com'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_phone(text) TO service_role;
