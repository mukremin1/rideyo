-- Assign car_owner role after OAuth signup (metadata may arrive after auth.users insert).

CREATE OR REPLACE FUNCTION public.apply_oauth_signup_role(p_user_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  auth_meta jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT raw_user_meta_data INTO auth_meta FROM auth.users WHERE id = uid;

  IF p_user_type = 'car_owner' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (uid, 'car_owner')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  UPDATE public.profiles
  SET
    full_name = COALESCE(
      NULLIF(full_name, ''),
      NULLIF(auth_meta->>'full_name', ''),
      NULLIF(auth_meta->>'name', ''),
      full_name
    )
  WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_oauth_signup_role(text) TO authenticated;
