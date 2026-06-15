-- Flip the approval model at the database (RLS) layer to match the app change:
--   * Corporations bid freely — no admin approval required to submit offers.
--   * Contractors must be admin-approved before publishing manpower requests.
--
-- Background: the previous `offers_insert` policy required the corporation's
-- profile to be verification_status='approved'. submitOffer() inserts with the
-- caller's RLS-bound client, so removing the app-level check alone was not
-- enough — the policy still blocked unapproved corporations. This migration
-- removes that requirement and instead gates contractor request creation.

-- 1) job_offers INSERT: corporations bid freely (drop the approval requirement).
DROP POLICY IF EXISTS "offers_insert" ON public.job_offers;
CREATE POLICY "offers_insert" ON public.job_offers
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    (corporation_id = auth.uid())
    AND has_role(auth.uid(), 'corporation'::app_role)
    AND (EXISTS (
      SELECT 1 FROM job_requests jr
      WHERE jr.id = job_offers.request_id
        AND jr.status = 'open'::text
    ))
  );

-- 2) job_requests INSERT: require the contractor to be admin-approved.
--    (Mirrors the app-level guard in createJobRequest as defense in depth.)
DROP POLICY IF EXISTS "req_insert_own" ON public.job_requests;
CREATE POLICY "req_insert_own" ON public.job_requests
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid())
    AND (EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.verification_status = 'approved'::verification_status
    ))
  );
