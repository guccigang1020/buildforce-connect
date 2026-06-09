
DROP POLICY IF EXISTS "Parties read attendance photos" ON storage.objects;
CREATE POLICY "Parties read attendance photos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'attendance-photos'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(objects.name))[1]
      AND (
        p.contractor_id = auth.uid()
        OR p.corporation_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.project_members m WHERE m.project_id = p.id AND m.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.project_teams t WHERE t.project_id = p.id AND t.team_leader_id = auth.uid())
      )
  )
);

CREATE POLICY "Service role manages rate limits" ON public.rate_limits
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role writes reminder log" ON public.reminder_log
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages sms" ON public.sms_notifications
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Parties read own sms" ON public.sms_notifications
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.attendance_records ar
    WHERE ar.id = sms_notifications.record_id
      AND (ar.contractor_id = auth.uid() OR ar.corporation_id = auth.uid() OR ar.team_leader_id = auth.uid())
  )
);
