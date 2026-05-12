
-- 1. AUDIT LOG
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id, created_at DESC);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Users read own audit" ON public.audit_log FOR SELECT TO authenticated
  USING (actor_id = auth.uid());
-- inserts only via SECURITY DEFINER fn
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

-- 2. RATE LIMITS
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  bucket timestamptz NOT NULL,
  count int NOT NULL DEFAULT 1,
  UNIQUE(key, bucket)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key, bucket DESC);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- no policies; service role only

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

-- 3. RATINGS (two-sided)
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

-- 4. REMINDER LOG (so we don't double-send)
CREATE TABLE IF NOT EXISTS public.reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  kind text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, kind)
);
ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read reminder log" ON public.reminder_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
