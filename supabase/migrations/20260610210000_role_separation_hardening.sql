-- ============================================================
-- ROLE SEPARATION HARDENING
--
-- BuildForce roles are EXCLUSIVE: contractor XOR corporation XOR admin
-- (team_leader is an on-site sub-actor). The V1 app allowed mixes
-- (contractor+admin etc.) via client-side role inserts and an admin
-- "toggle role" UI — both removed from the app. This migration closes
-- the database-side holes and cleans existing data. Idempotent.
-- ============================================================

-- 1) Clients must NEVER write roles directly.
--    (A 2026-06-07 migration granted INSERT/DELETE to authenticated to work
--    around an RLS bug — that bug is fixed; revoke the workaround.)
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;

-- 2) ensure_user_bootstrap: self-heal for users whose handle_new_user trigger
--    failed (e.g. Google OAuth edge cases). Creates the missing profile and,
--    ONLY when the user has zero roles, assigns the role they CHOSE at signup
--    (from auth metadata). It never defaults to contractor and never stacks a
--    second role — the V1 dual-role bug came from exactly that.
CREATE OR REPLACE FUNCTION public.ensure_user_bootstrap()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _meta jsonb;
  _role text;
BEGIN
  IF _uid IS NULL THEN
    RETURN;
  END IF;

  SELECT raw_user_meta_data INTO _meta FROM auth.users WHERE id = _uid;

  INSERT INTO public.profiles (user_id, full_name, phone, company_name, city)
  SELECT
    _uid,
    COALESCE(_meta->>'full_name', ''),
    _meta->>'phone',
    _meta->>'company_name',
    _meta->>'city'
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid);

  _role := _meta->>'role';
  IF _role IN ('contractor', 'corporation')
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, _role::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_user_bootstrap() TO authenticated;

-- 3) Enforce single role per user going forward (data invariant).
--    Partial unique index allows at most ONE row per user in user_roles.
--    (Run section 4 first if this index fails due to existing duplicates.)

-- 4) Clean existing mixed-role data. Priority: admin accounts keep ONLY admin
--    if they are in the designated list below; otherwise admin is stripped.
--    Marketplace users: corporation > contractor > team_leader.
DO $$
DECLARE
  -- >>> EDIT THIS LIST: emails allowed to hold the admin role <<<
  _admin_emails text[] := ARRAY['admin@buildforce.dev'];
  r record;
  _keep public.app_role;
  _email text;
BEGIN
  FOR r IN
    SELECT user_id, array_agg(role ORDER BY role) AS roles
    FROM public.user_roles
    GROUP BY user_id
    HAVING count(*) > 1 OR bool_or(role = 'admin')
  LOOP
    SELECT email INTO _email FROM auth.users WHERE id = r.user_id;

    IF 'admin' = ANY(r.roles::text[]) AND _email = ANY(_admin_emails) THEN
      _keep := 'admin';
    ELSIF 'corporation' = ANY(r.roles::text[]) THEN
      _keep := 'corporation';
    ELSIF 'contractor' = ANY(r.roles::text[]) THEN
      _keep := 'contractor';
    ELSIF 'team_leader' = ANY(r.roles::text[]) THEN
      _keep := 'team_leader';
    ELSE
      _keep := r.roles[1];
    END IF;

    DELETE FROM public.user_roles
    WHERE user_id = r.user_id AND role <> _keep;
  END LOOP;
END $$;

-- Now that duplicates are gone, enforce the invariant.
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_one_role_per_user
ON public.user_roles (user_id);
