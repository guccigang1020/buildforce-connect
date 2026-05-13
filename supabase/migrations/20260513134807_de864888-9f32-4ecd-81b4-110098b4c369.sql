-- Site manager + team leader phone fields for notifications
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS site_manager_name text,
  ADD COLUMN IF NOT EXISTS site_manager_phone text;

ALTER TABLE public.project_teams
  ADD COLUMN IF NOT EXISTS team_leader_phone text,
  ADD COLUMN IF NOT EXISTS team_leader_name text;

-- Track notifications sent (so we don't spam)
CREATE TABLE IF NOT EXISTS public.attendance_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  kind text NOT NULL, -- 'start' | 'end' | 'exception' | 'approval' | 'rejection'
  channel text NOT NULL DEFAULT 'whatsapp',
  recipient_phone text NOT NULL,
  recipient_role text NOT NULL, -- 'site_manager' | 'team_leader' | 'contractor'
  payload jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties read notifications" ON public.attendance_notifications
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.attendance_records r
    WHERE r.id = attendance_notifications.record_id
      AND (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid())
  ) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin manages notifications" ON public.attendance_notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow site manager (matched by phone) and team leader to also report exceptions
-- (handled in code; DB-level we already allow team_leader & contractor updates).
-- Add a partial-day exception reporter column for clarity:
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS exception_reported_by uuid,
  ADD COLUMN IF NOT EXISTS exception_note text,
  ADD COLUMN IF NOT EXISTS exception_at timestamptz;