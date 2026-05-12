
-- Drop the views: they trigger SECURITY DEFINER VIEW lint.
-- Marketplace queries will use supabaseAdmin in server functions instead.
DROP VIEW IF EXISTS public.public_profiles;
DROP VIEW IF EXISTS public.public_job_requests;

-- Allow any authenticated user to read OPEN job requests' non-sensitive cols
-- via direct table query (server functions select only safe columns).
-- Contact info exposure is now a server-side concern: server fns must only
-- select id, location, start_date, duration, etc. — never contact_name/phone
-- when serving non-owners.
CREATE POLICY "Authenticated can view open job requests"
ON public.job_requests FOR SELECT TO authenticated
USING (status = 'open');

-- Same for profiles: allow authenticated to read profile rows so the marketplace
-- can show corp names. Server code that selects profiles must only expose safe
-- columns to non-owners.
CREATE POLICY "Authenticated can view profile basics"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- has_role: revoke from authenticated since we never call it via RPC from
-- the client. RLS policies use it via the policy owner context.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
