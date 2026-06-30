-- Confirm email + grant admin for Mukremin Cakmak
-- Also assign default user role on signup when email confirmation is required.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone);

  selected_role := CASE
    WHEN NEW.raw_user_meta_data->>'user_type' = 'car_owner' THEN 'car_owner'::public.app_role
    ELSE 'user'::public.app_role
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  target_user_id uuid;
  target_email text := 'mukremin.cakmak.da@gmail.com';
BEGIN
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower(target_email);

  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User % not found — register first, then re-run: npm run supabase:migrate', target_email;
    RETURN;
  END IF;

  UPDATE auth.users
  SET
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
  WHERE id = target_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Admin granted and email confirmed for %', target_email;
END $$;
