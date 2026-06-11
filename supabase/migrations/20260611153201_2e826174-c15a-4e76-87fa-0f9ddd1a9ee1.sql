
-- =========================================================================
-- RESTORE TABLES MISSING AFTER PROD_RESET.sql
-- =========================================================================

-- ---------- project_members ----------
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('site_manager','team_leader','contractor','corporation')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_members_user ON public.project_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id AND (p.contractor_id = _user_id OR p.corporation_id = _user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.project_members m
    WHERE m.project_id = _project_id AND m.user_id = _user_id
  );
$$;

CREATE POLICY "Project parties read members" ON public.project_members FOR SELECT TO authenticated
  USING (public.is_project_member(project_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Project owner manages members" ON public.project_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_members.project_id AND (p.contractor_id = auth.uid() OR p.corporation_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_members.project_id AND (p.contractor_id = auth.uid() OR p.corporation_id = auth.uid())));

-- ---------- attendance_events ----------
CREATE TABLE IF NOT EXISTS public.attendance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('start','end','exception','approval','rejection','auto_approval','correction_request','correction_decision')),
  actor_id uuid,
  photo_url text,
  gps_lat numeric(9,6),
  gps_lng numeric(9,6),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_record ON public.attendance_events(record_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_events TO authenticated;
GRANT ALL ON public.attendance_events TO service_role;
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties read events" ON public.attendance_events FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_events.record_id AND
      (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid())
    ) OR public.has_role(auth.uid(),'admin'::public.app_role)
  );
CREATE POLICY "Parties insert events" ON public.attendance_events FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_events.record_id AND
      (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid())
    )
  );

-- ---------- attendance_corrections ----------
CREATE TABLE IF NOT EXISTS public.attendance_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  reason text NOT NULL,
  requested_change jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_corrections_record ON public.attendance_corrections(record_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_corrections TO authenticated;
GRANT ALL ON public.attendance_corrections TO service_role;
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties read corrections" ON public.attendance_corrections FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_corrections.record_id AND
      (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid())
    ) OR public.has_role(auth.uid(),'admin'::public.app_role)
  );
CREATE POLICY "Team leader requests correction" ON public.attendance_corrections FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_corrections.record_id AND r.team_leader_id = auth.uid())
  );
CREATE POLICY "Contractor or admin decides correction" ON public.attendance_corrections FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_corrections.record_id AND r.contractor_id = auth.uid())
    OR public.has_role(auth.uid(),'admin'::public.app_role)
  );

-- ---------- attendance_notifications ----------
CREATE TABLE IF NOT EXISTS public.attendance_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  kind text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  recipient_phone text NOT NULL,
  recipient_role text NOT NULL,
  payload jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.attendance_notifications TO authenticated;
GRANT ALL ON public.attendance_notifications TO service_role;
ALTER TABLE public.attendance_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties read notifications" ON public.attendance_notifications
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.attendance_records r
    WHERE r.id = attendance_notifications.record_id
      AND (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid())
  ) OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admin manages notifications" ON public.attendance_notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------- sms_notifications ----------
CREATE TABLE IF NOT EXISTS public.sms_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  kind text NOT NULL,
  channel text NOT NULL,
  recipient_phone text NOT NULL,
  recipient_role text NOT NULL,
  body text NOT NULL,
  provider text,
  provider_message_id text,
  status text NOT NULL DEFAULT 'queued',
  error text,
  payload jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sms_notifications TO authenticated;
GRANT ALL ON public.sms_notifications TO service_role;
ALTER TABLE public.sms_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties read sms" ON public.sms_notifications FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = sms_notifications.record_id
      AND (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid()))
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
CREATE POLICY "Admin manages sms" ON public.sms_notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------- corporation_workforce ----------
CREATE TABLE IF NOT EXISTS public.corporation_workforce (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  corporation_id UUID NOT NULL,
  role TEXT NOT NULL,
  nationality TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (corporation_id, role, nationality)
);
CREATE INDEX IF NOT EXISTS idx_corporation_workforce_corp ON public.corporation_workforce(corporation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corporation_workforce TO authenticated;
GRANT ALL ON public.corporation_workforce TO service_role;
ALTER TABLE public.corporation_workforce ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view workforce" ON public.corporation_workforce FOR SELECT TO authenticated USING (true);
CREATE POLICY "Corporation manages own workforce insert" ON public.corporation_workforce FOR INSERT TO authenticated
  WITH CHECK (corporation_id = auth.uid() AND public.has_role(auth.uid(), 'corporation'::public.app_role));
CREATE POLICY "Corporation manages own workforce update" ON public.corporation_workforce FOR UPDATE TO authenticated
  USING (corporation_id = auth.uid()) WITH CHECK (corporation_id = auth.uid());
CREATE POLICY "Corporation manages own workforce delete" ON public.corporation_workforce FOR DELETE TO authenticated
  USING (corporation_id = auth.uid());
CREATE POLICY "Admins manage all workforce" ON public.corporation_workforce FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER update_corporation_workforce_updated_at
  BEFORE UPDATE ON public.corporation_workforce
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- rate_limits ----------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  bucket timestamptz NOT NULL,
  count int NOT NULL DEFAULT 1,
  UNIQUE(key, bucket)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key, bucket DESC);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(_key text, _max int, _window_seconds int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bucket timestamptz; v_count int;
BEGIN
  v_bucket := date_trunc('second', now()) - (extract(epoch from now())::int % _window_seconds) * interval '1 second';
  INSERT INTO public.rate_limits(key, bucket, count) VALUES (_key, v_bucket, 1)
  ON CONFLICT (key, bucket) DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;
  DELETE FROM public.rate_limits WHERE bucket < now() - interval '1 day';
  RETURN v_count <= _max;
END $$;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text,int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text,int,int) TO authenticated;

-- ---------- reminder_log ----------
CREATE TABLE IF NOT EXISTS public.reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  kind text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, kind)
);
GRANT SELECT, INSERT ON public.reminder_log TO authenticated;
GRANT ALL ON public.reminder_log TO service_role;
ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read reminder log" ON public.reminder_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------- job_ratings ----------
CREATE TABLE IF NOT EXISTS public.job_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  rater_id uuid NOT NULL,
  ratee_id uuid NOT NULL,
  direction text NOT NULL CHECK (direction IN ('client_to_corp','corp_to_client')),
  score int NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, rater_id, ratee_id)
);
CREATE INDEX IF NOT EXISTS idx_ratings_ratee ON public.job_ratings(ratee_id);
GRANT SELECT, INSERT ON public.job_ratings TO authenticated;
GRANT ALL ON public.job_ratings TO service_role;
ALTER TABLE public.job_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed reads ratings" ON public.job_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Rater inserts own rating" ON public.job_ratings FOR INSERT TO authenticated
  WITH CHECK (
    rater_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.job_awards a
      WHERE a.request_id = job_ratings.request_id
      AND (
        (direction = 'client_to_corp' AND a.awarded_by = auth.uid() AND a.corporation_id = ratee_id)
        OR (direction = 'corp_to_client' AND a.corporation_id = auth.uid() AND a.awarded_by = ratee_id)
      )
    )
  );

-- ---------- audit_log helper fn (table itself already exists from PROD_RESET) ----------
CREATE OR REPLACE FUNCTION public.log_audit(_action text, _entity_type text, _entity_id uuid, _metadata jsonb DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, _metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_audit(text,text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit(text,text,uuid,jsonb) TO authenticated;

-- ---------- job_request_messages ----------
CREATE TABLE IF NOT EXISTS public.job_request_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  corporation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_msgs_thread ON public.job_request_messages(request_id, corporation_id, created_at);
GRANT SELECT, INSERT ON public.job_request_messages TO authenticated;
GRANT ALL ON public.job_request_messages TO service_role;
ALTER TABLE public.job_request_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads thread" ON public.job_request_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()));
CREATE POLICY "Corporation reads own thread" ON public.job_request_messages FOR SELECT TO authenticated
  USING (corporation_id = auth.uid());
CREATE POLICY "Admin reads messages" ON public.job_request_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Owner sends message" ON public.job_request_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid())
  );
CREATE POLICY "Corporation sends message" ON public.job_request_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND corporation_id = auth.uid()
    AND public.has_role(auth.uid(), 'corporation'::public.app_role)
  );

-- ---------- job_offer_price_log ----------
CREATE TABLE IF NOT EXISTS public.job_offer_price_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.job_offers(id) ON DELETE CASCADE,
  corporation_id uuid NOT NULL,
  price_per_hour numeric(10,2) NOT NULL,
  previous_price numeric(10,2),
  event_type text NOT NULL CHECK (event_type IN ('joined','drop','raise','update')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_offer_price_log_request ON public.job_offer_price_log(request_id, created_at);
CREATE INDEX IF NOT EXISTS idx_job_offer_price_log_offer ON public.job_offer_price_log(offer_id, created_at);
GRANT SELECT, INSERT ON public.job_offer_price_log TO authenticated;
GRANT ALL ON public.job_offer_price_log TO service_role;
ALTER TABLE public.job_offer_price_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties read price log" ON public.job_offer_price_log FOR SELECT TO authenticated
  USING (
    corporation_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE OR REPLACE FUNCTION public.log_job_offer_price()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.job_offer_price_log(request_id, offer_id, corporation_id, price_per_hour, previous_price, event_type)
    VALUES (NEW.request_id, NEW.id, NEW.corporation_id, NEW.price_per_hour, NULL, 'joined');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.price_per_hour IS DISTINCT FROM OLD.price_per_hour THEN
    INSERT INTO public.job_offer_price_log(request_id, offer_id, corporation_id, price_per_hour, previous_price, event_type)
    VALUES (
      NEW.request_id, NEW.id, NEW.corporation_id, NEW.price_per_hour, OLD.price_per_hour,
      CASE WHEN NEW.price_per_hour < OLD.price_per_hour THEN 'drop'
           WHEN NEW.price_per_hour > OLD.price_per_hour THEN 'raise'
           ELSE 'update' END
    );
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_log_job_offer_price ON public.job_offers;
CREATE TRIGGER trg_log_job_offer_price
AFTER INSERT OR UPDATE OF price_per_hour ON public.job_offers
FOR EACH ROW EXECUTE FUNCTION public.log_job_offer_price();

-- ---------- attendance_records: extra columns used by app ----------
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS exception_reported_by uuid,
  ADD COLUMN IF NOT EXISTS exception_note text,
  ADD COLUMN IF NOT EXISTS exception_at timestamptz,
  ADD COLUMN IF NOT EXISTS entry_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS entry_approved_by uuid,
  ADD COLUMN IF NOT EXISTS entry_rejection_reason text,
  ADD COLUMN IF NOT EXISTS exit_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS exit_approved_by uuid,
  ADD COLUMN IF NOT EXISTS exit_rejection_reason text;

-- ---------- attendance freeze trigger ----------
CREATE OR REPLACE FUNCTION public.attendance_freeze_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.frozen_at IS NOT NULL AND auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Attendance record is frozen. Open a correction request to change it.';
  END IF;
  IF NEW.status IN ('auto_approved','rejected') AND NEW.frozen_at IS NULL THEN
    NEW.frozen_at := now();
    IF NEW.approved_at IS NULL AND NEW.status = 'auto_approved' THEN
      NEW.approved_at := now();
    END IF;
  END IF;
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
END $$;
DROP TRIGGER IF EXISTS attendance_freeze ON public.attendance_records;
CREATE TRIGGER attendance_freeze
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.attendance_freeze_check();

-- ---------- Email infrastructure tables ----------
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','sent','suppressed','failed','bounced','complained','dlq')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log(message_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique
  ON public.email_send_log(message_id) WHERE status = 'sent';
GRANT ALL ON public.email_send_log TO service_role;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can read send log" ON public.email_send_log FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Service role can insert send log" ON public.email_send_log FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can update send log" ON public.email_send_log FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.email_send_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until TIMESTAMPTZ,
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT ALL ON public.email_send_state TO service_role;
ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage send state" ON public.email_send_state FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe','bounce','complaint')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);
CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);
GRANT ALL ON public.suppressed_emails TO service_role;
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);
GRANT ALL ON public.email_unsubscribe_tokens TO service_role;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
