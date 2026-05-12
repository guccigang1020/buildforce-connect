
-- ============================================================
-- 1. profiles: tighten SELECT to own + admin + counterparty
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Owner of a job request can see profile of any corp that submitted an offer
CREATE POLICY "Request owner can view bidding corp profile"
ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.job_offers o
  JOIN public.job_requests r ON r.id = o.request_id
  WHERE o.corporation_id = profiles.user_id AND r.user_id = auth.uid()
));

-- Corp can see profile of owner whose request the corp has submitted an offer on
CREATE POLICY "Bidding corp can view request owner profile"
ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.job_requests r
  JOIN public.job_offers o ON o.request_id = r.id
  WHERE r.user_id = profiles.user_id AND o.corporation_id = auth.uid()
));

-- Public-safe view for marketplace: only non-sensitive columns
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = off) AS
SELECT
  user_id,
  full_name,
  business_name,
  company_name,
  city,
  contractor_classification,
  avatar_url,
  is_verified,
  verification_status
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;
REVOKE ALL ON public.public_profiles FROM anon, public;

-- ============================================================
-- 2. job_requests: hide contact info from non-owners
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view all job requests" ON public.job_requests;

CREATE POLICY "Owners can view own job requests"
ON public.job_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all job requests"
ON public.job_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Corps that have submitted an offer can view the request
CREATE POLICY "Bidding corps can view requests they bid on"
ON public.job_requests FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.job_offers o
  WHERE o.request_id = job_requests.id AND o.corporation_id = auth.uid()
));

-- Public marketplace view: open requests without contact info
DROP VIEW IF EXISTS public.public_job_requests;
CREATE VIEW public.public_job_requests
WITH (security_invoker = off) AS
SELECT
  id, user_id, location, start_date, duration, commitment_months,
  budget, description, status, created_at, updated_at, deadline_at
FROM public.job_requests
WHERE status = 'open';

GRANT SELECT ON public.public_job_requests TO authenticated;
REVOKE ALL ON public.public_job_requests FROM anon, public;

-- ============================================================
-- 3. Fix tautology in job_awards INSERT policy
-- ============================================================
DROP POLICY IF EXISTS "Owner creates award" ON public.job_awards;

CREATE POLICY "Owner creates award"
ON public.job_awards FOR INSERT TO authenticated
WITH CHECK (
  awarded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.job_requests jr
    WHERE jr.id = job_awards.request_id
      AND jr.user_id = auth.uid()
      AND jr.status = 'open'
  )
  AND EXISTS (
    SELECT 1 FROM public.job_offers o
    WHERE o.id = job_awards.offer_id
      AND o.request_id = job_awards.request_id
      AND o.corporation_id = job_awards.corporation_id
      AND o.status = 'submitted'
  )
);

-- ============================================================
-- 4. job_request_messages: corp must have offer on the request
-- ============================================================
DROP POLICY IF EXISTS "Corporation sends message" ON public.job_request_messages;

CREATE POLICY "Corporation sends message"
ON public.job_request_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND corporation_id = auth.uid()
  AND public.has_role(auth.uid(), 'corporation'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.job_offers o
    WHERE o.request_id = job_request_messages.request_id
      AND o.corporation_id = auth.uid()
  )
);

-- ============================================================
-- 5. Add search_path to remaining SECURITY DEFINER functions
-- ============================================================
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

-- ============================================================
-- 6. Revoke EXECUTE on internal SECURITY DEFINER functions
--    (trigger functions and email-queue helpers should not be
--    callable by anon or authenticated users via the API)
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_job_award() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- has_role must remain executable by authenticated (used inside RLS policies
-- via the policy owner, but also by app code via .rpc); revoke from anon only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
