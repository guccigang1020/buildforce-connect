-- ============================================================
-- FIX: profiles & user_roles have RLS enabled but NO policies
--
-- A pg_policies dump showed zero policies on public.profiles and
-- public.user_roles. With RLS enabled and no permissive policy, Postgres
-- default-denies all access, so every user sees 0 of their OWN rows. This:
--   * breaks role detection app-wide (use-auth reads user_roles -> empty ->
--     hasRole() always false -> e.g. corp dashboard shows "not registered as
--     a corporation"),
--   * blocks offer submission (the job_offers `offers_insert` policy checks
--     EXISTS(profiles ... verification_status='approved') under the inserting
--     user's RLS, which returns false because the user can't see its profile).
--
-- Restore owner + admin SELECT (and owner UPDATE on profiles). has_role() is
-- SECURITY DEFINER and bypasses user_roles RLS, so the admin policies do not
-- recurse. Idempotent: drops each policy by name first.
-- ============================================================

-- ---------- user_roles ----------
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select_admin ON public.user_roles;

CREATE POLICY user_roles_select_own
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY user_roles_select_admin
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------- profiles ----------
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_select_own
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY profiles_select_admin
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY profiles_update_own
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
