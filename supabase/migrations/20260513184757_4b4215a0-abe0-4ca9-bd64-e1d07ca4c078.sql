
-- 1) Drop redundant contact columns from job_requests (data lives in job_request_contacts)
ALTER TABLE public.job_requests DROP COLUMN IF EXISTS contact_name;
ALTER TABLE public.job_requests DROP COLUMN IF EXISTS contact_phone;

-- 2) Restrict corporation_workforce reads to owner + admin
DROP POLICY IF EXISTS "Authenticated can view workforce" ON public.corporation_workforce;
CREATE POLICY "Owner reads workforce" ON public.corporation_workforce
  FOR SELECT TO authenticated
  USING (corporation_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) Restrict job_request_items reads to request owner / bidding corp / admin
DROP POLICY IF EXISTS "Authenticated users can view job request items" ON public.job_request_items;
CREATE POLICY "Parties read job request items" ON public.job_request_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = job_request_items.request_id AND jr.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.job_offers o WHERE o.request_id = job_request_items.request_id AND o.corporation_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 4) Restrict sms_notifications and attendance_notifications phone exposure: admin-only reads
DROP POLICY IF EXISTS "Parties read sms" ON public.sms_notifications;
DROP POLICY IF EXISTS "Parties read notifications" ON public.attendance_notifications;

-- 5) Drop cross-party profile SELECT policies (full-row exposure). Counterparty info served via server fns.
DROP POLICY IF EXISTS "Bidding corp can view request owner profile" ON public.profiles;
DROP POLICY IF EXISTS "Request owner can view bidding corp profile" ON public.profiles;

-- 6) Public-safe profile view for marketplace counterparty display
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT
  user_id,
  full_name,
  company_name,
  business_name,
  city,
  avatar_url,
  contractor_classification,
  is_verified,
  verification_status
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;

-- 7) Tighten attendance-photos storage: validate project ownership in path
DROP POLICY IF EXISTS "Team leader uploads attendance photos" ON storage.objects;
CREATE POLICY "Team leader uploads attendance photos"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'attendance-photos'
  AND EXISTS (
    SELECT 1 FROM public.project_teams t
    WHERE t.team_leader_id = auth.uid()
      AND t.id::text = (string_to_array(name, '/'))[3]
      AND t.project_id::text = (string_to_array(name, '/'))[1]
  )
);
