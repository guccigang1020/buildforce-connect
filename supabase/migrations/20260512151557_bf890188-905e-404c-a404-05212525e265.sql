
-- Prevent non-admin users from changing their own verification_status,
-- is_verified, or admin_notes via the public API. Without this, a regular
-- user could call profiles.update on their own row from the browser and
-- self-approve.
CREATE OR REPLACE FUNCTION public.prevent_self_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
    RAISE EXCEPTION 'Only admins can change verification fields';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_self_verification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_prevent_self_verification ON public.profiles;
CREATE TRIGGER profiles_prevent_self_verification
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_verification();
