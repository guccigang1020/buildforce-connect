-- 1) Stop broadcasting bid prices via Realtime (RLS on the table is correct,
--    but realtime.messages defaults let any authenticated user subscribe to
--    any channel, which leaks competitor bid prices)
ALTER PUBLICATION supabase_realtime DROP TABLE public.job_offer_price_log;

-- 2) Allow admins to update/delete attendance photos (correction workflow)
CREATE POLICY "Admins update attendance photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'attendance-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'attendance-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete attendance photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'attendance-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));