-- 1. job_requests INSERT: restrict to contractor role
DROP POLICY IF EXISTS "Authenticated users can create job requests" ON public.job_requests;
CREATE POLICY "Contractors can create job requests"
  ON public.job_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'contractor'::public.app_role));

-- 2. job_request_messages: owner-side INSERT must be a contractor
DROP POLICY IF EXISTS "Owner sends message" ON public.job_request_messages;
CREATE POLICY "Owner sends message"
  ON public.job_request_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.has_role(auth.uid(), 'contractor'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.job_requests jr
      WHERE jr.id = job_request_messages.request_id AND jr.user_id = auth.uid()
    )
  );

-- 3. attendance-photos: admins can SELECT
DROP POLICY IF EXISTS "Admins read attendance photos" ON storage.objects;
CREATE POLICY "Admins read attendance photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'attendance-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. realtime.messages: enable RLS and require authentication for channel subscriptions.
-- Per-row data RLS on underlying public tables still gates postgres_changes payload delivery.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can use realtime" ON realtime.messages;
CREATE POLICY "Authenticated can use realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can publish realtime" ON realtime.messages;
CREATE POLICY "Authenticated can publish realtime"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);