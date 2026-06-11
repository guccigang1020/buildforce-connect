-- ============================================================
-- BuildForce — make bbuildforceprime@gmail.com the single ADMIN
-- Run AFTER (a) PROD_RESET.sql and (b) creating the auth user
-- bbuildforceprime@gmail.com in Supabase → Authentication → Users.
-- Safe to re-run.
-- ============================================================
DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users
  WHERE lower(email) = 'bbuildforceprime@gmail.com';

  IF _uid IS NULL THEN
    RAISE EXCEPTION 'auth user bbuildforceprime@gmail.com not found — create it first in Authentication → Users (auto-confirm), then re-run.';
  END IF;

  -- Profile (create if the signup trigger did not)
  INSERT INTO public.profiles (user_id, full_name, verification_status, is_verified)
  VALUES (_uid, 'מנהל מערכת BuildForce', 'approved', true)
  ON CONFLICT (user_id) DO UPDATE
    SET verification_status = 'approved', is_verified = true;

  -- Exactly one role: admin
  DELETE FROM public.user_roles WHERE user_id = _uid;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin');
END $$;

-- Verify
SELECT u.email, p.verification_status, r.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE lower(u.email) = 'bbuildforceprime@gmail.com';
