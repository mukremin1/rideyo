-- Sync phone from Supabase phone auth into profiles on signup.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role public.app_role;
  profile_phone text;
BEGIN
  profile_phone := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    CASE
      WHEN NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
        CASE
          WHEN NEW.phone LIKE '+90%' THEN '0' || substring(NEW.phone from 4)
          ELSE NEW.phone
        END
      ELSE NULL
    END
  );

  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    profile_phone
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
