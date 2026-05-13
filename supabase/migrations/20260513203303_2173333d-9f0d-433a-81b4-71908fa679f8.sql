CREATE OR REPLACE FUNCTION public.has_bid_on_request(_request_id uuid, _corporation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.job_offers
    WHERE request_id = _request_id
      AND corporation_id = _corporation_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_bid_on_request(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_bid_on_request(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Bidding corps can view requests they bid on" ON public.job_requests;

CREATE POLICY "Bidding corps can view requests they bid on"
ON public.job_requests
FOR SELECT
TO authenticated
USING (public.has_bid_on_request(id, auth.uid()));