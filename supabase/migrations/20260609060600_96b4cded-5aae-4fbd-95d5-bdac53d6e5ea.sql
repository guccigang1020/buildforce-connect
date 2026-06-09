DROP POLICY IF EXISTS "Owner sends message" ON public.job_request_messages;
CREATE POLICY "Owner sends message"
  ON public.job_request_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.has_role(auth.uid(), 'contractor'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.job_requests jr
      WHERE jr.id = job_request_messages.request_id
        AND jr.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.job_offers o
      WHERE o.request_id = job_request_messages.request_id
        AND o.corporation_id = job_request_messages.corporation_id
    )
  );

ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can use realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can publish realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Service role can use realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Service role can publish realtime" ON realtime.messages;
CREATE POLICY "Service role can use realtime"
  ON realtime.messages
  FOR SELECT
  TO service_role
  USING (true);
CREATE POLICY "Service role can publish realtime"
  ON realtime.messages
  FOR INSERT
  TO service_role
  WITH CHECK (true);