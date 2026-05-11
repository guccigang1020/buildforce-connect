ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE p.user_id = u.id AND p.email IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_is_admin boolean;
BEGIN
  INSERT INTO public.profiles (
    user_id, full_name, phone, company_name, city,
    business_id, business_name,
    contractor_license_number, contractor_classification,
    verification_status, email
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'business_id',
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'contractor_license_number',
    NEW.raw_user_meta_data->>'contractor_classification',
    'pending'::public.verification_status,
    NEW.email
  );

  v_is_admin := lower(NEW.email) = 'bbuildforceprime@gmail.com';
  IF v_is_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::public.app_role);
  END IF;

  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'contractor'::public.app_role);
  IF v_role = 'admin' THEN v_role := 'contractor'; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;