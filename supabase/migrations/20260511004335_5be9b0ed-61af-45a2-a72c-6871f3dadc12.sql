
-- 1) Verification status enum
DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_id TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS contractor_license_number TEXT,
  ADD COLUMN IF NOT EXISTS contractor_classification TEXT,
  ADD COLUMN IF NOT EXISTS license_doc_url TEXT,
  ADD COLUMN IF NOT EXISTS insurance_doc_url TEXT,
  ADD COLUMN IF NOT EXISTS books_cert_url TEXT,
  ADD COLUMN IF NOT EXISTS verification_status public.verification_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 3) Storage bucket for contractor verification docs (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contractor-docs', 'contractor-docs', false)
ON CONFLICT (id) DO NOTHING;

-- 4) Storage RLS — owner folder pattern (user_id as first folder)
DROP POLICY IF EXISTS "Users read own contractor docs" ON storage.objects;
CREATE POLICY "Users read own contractor docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contractor-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users upload own contractor docs" ON storage.objects;
CREATE POLICY "Users upload own contractor docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contractor-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users update own contractor docs" ON storage.objects;
CREATE POLICY "Users update own contractor docs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'contractor-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own contractor docs" ON storage.objects;
CREATE POLICY "Users delete own contractor docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'contractor-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Admins read all contractor docs" ON storage.objects;
CREATE POLICY "Admins read all contractor docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contractor-docs' AND public.has_role(auth.uid(), 'admin'));

-- 5) Update handle_new_user trigger to capture business fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (
    user_id, full_name, phone, company_name, city,
    business_id, business_name,
    contractor_license_number, contractor_classification,
    verification_status
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
    'pending'::public.verification_status
  );

  v_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::public.app_role,
    'contractor'::public.app_role
  );
  IF v_role = 'admin' THEN
    v_role := 'contractor';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$function$;

-- 6) Make sure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
