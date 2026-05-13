-- 1. New approval fields
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS entry_approved_at  timestamptz,
  ADD COLUMN IF NOT EXISTS entry_approved_by  uuid,
  ADD COLUMN IF NOT EXISTS entry_rejection_reason text,
  ADD COLUMN IF NOT EXISTS exit_approved_at   timestamptz,
  ADD COLUMN IF NOT EXISTS exit_approved_by   uuid,
  ADD COLUMN IF NOT EXISTS exit_rejection_reason text;

-- 2. SMS / messaging audit table
CREATE TABLE IF NOT EXISTS public.sms_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  kind text NOT NULL,            -- 'entry_pending' | 'exit_pending' | 'entry_approved' | 'exit_approved' | 'reminder' | 'exception'
  channel text NOT NULL,         -- 'sms' | 'whatsapp' | 'in_app'
  recipient_phone text NOT NULL,
  recipient_role text NOT NULL,  -- 'site_manager' | 'team_leader' | 'corporation' | 'contractor'
  body text NOT NULL,
  provider text,                 -- e.g. 'inforu', '019', 'wa_link'
  provider_message_id text,
  status text NOT NULL DEFAULT 'queued', -- queued | sent | failed
  error text,
  payload jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties read sms" ON public.sms_notifications
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.attendance_records r
    WHERE r.id = sms_notifications.record_id
      AND (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid())
  ) OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin manages sms" ON public.sms_notifications
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Updated freeze trigger:
-- record freezes only after BOTH entry and exit are approved, OR when status becomes auto_approved/rejected
CREATE OR REPLACE FUNCTION public.attendance_freeze_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.frozen_at IS NOT NULL AND auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Attendance record is frozen. Open a correction request to change it.';
  END IF;

  -- terminal states freeze immediately
  IF NEW.status IN ('auto_approved','rejected') AND NEW.frozen_at IS NULL THEN
    NEW.frozen_at := now();
    IF NEW.approved_at IS NULL AND NEW.status = 'auto_approved' THEN
      NEW.approved_at := now();
    END IF;
  END IF;

  -- approved status now requires BOTH entry + exit approvals
  IF NEW.status = 'approved' AND NEW.frozen_at IS NULL THEN
    IF NEW.entry_approved_at IS NOT NULL AND NEW.exit_approved_at IS NOT NULL THEN
      NEW.frozen_at := now();
      IF NEW.approved_at IS NULL THEN NEW.approved_at := now(); END IF;
    END IF;
  END IF;

  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.total_hours := ROUND(EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::numeric / 3600, 2);
    IF NEW.hourly_rate IS NOT NULL AND NEW.workers_actual IS NOT NULL THEN
      NEW.total_cost := ROUND(NEW.total_hours * NEW.hourly_rate * NEW.workers_actual, 2);
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS attendance_freeze ON public.attendance_records;
CREATE TRIGGER attendance_freeze
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.attendance_freeze_check();