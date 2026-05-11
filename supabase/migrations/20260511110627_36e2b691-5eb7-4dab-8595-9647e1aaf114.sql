-- 1. job_requests: status check + deadline
ALTER TABLE public.job_requests
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ DEFAULT (now() + interval '48 hours'),
  ADD CONSTRAINT job_requests_status_chk CHECK (status IN ('open','awarded','closed','cancelled'));

-- 2. job_offers
CREATE TABLE public.job_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  corporation_id UUID NOT NULL,
  price_per_hour NUMERIC(10,2) NOT NULL CHECK (price_per_hour > 0),
  available_workers INTEGER NOT NULL CHECK (available_workers > 0),
  start_date TEXT NOT NULL,
  response_time_hours INTEGER NOT NULL DEFAULT 24,
  warranty_days INTEGER NOT NULL DEFAULT 30,
  insurance BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','withdrawn','awarded','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, corporation_id)
);
CREATE INDEX idx_job_offers_request ON public.job_offers(request_id);
CREATE INDEX idx_job_offers_corp ON public.job_offers(corporation_id);

ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner sees offers on own request" ON public.job_offers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()));
CREATE POLICY "Corporation sees own offers" ON public.job_offers FOR SELECT TO authenticated
  USING (corporation_id = auth.uid());
CREATE POLICY "Admin sees all offers" ON public.job_offers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Verified corporation can submit offer" ON public.job_offers FOR INSERT TO authenticated
  WITH CHECK (
    corporation_id = auth.uid()
    AND public.has_role(auth.uid(), 'corporation')
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.verification_status = 'approved')
    AND EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.status = 'open')
  );
CREATE POLICY "Corporation updates own offer" ON public.job_offers FOR UPDATE TO authenticated
  USING (corporation_id = auth.uid() AND status = 'submitted')
  WITH CHECK (corporation_id = auth.uid());

CREATE TRIGGER update_job_offers_updated_at BEFORE UPDATE ON public.job_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. job_awards
CREATE TABLE public.job_awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL UNIQUE REFERENCES public.job_requests(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.job_offers(id) ON DELETE CASCADE,
  corporation_id UUID NOT NULL,
  awarded_by UUID NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_awards_corp ON public.job_awards(corporation_id);

ALTER TABLE public.job_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner sees own awards" ON public.job_awards FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()));
CREATE POLICY "Winning corp sees award" ON public.job_awards FOR SELECT TO authenticated
  USING (corporation_id = auth.uid());
CREATE POLICY "Admin sees awards" ON public.job_awards FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner creates award" ON public.job_awards FOR INSERT TO authenticated
  WITH CHECK (
    awarded_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid() AND jr.status = 'open')
    AND EXISTS (SELECT 1 FROM public.job_offers o WHERE o.id = offer_id AND o.request_id = request_id AND o.corporation_id = job_awards.corporation_id AND o.status = 'submitted')
  );

-- Trigger: when award row is inserted, update offer + request statuses
CREATE OR REPLACE FUNCTION public.handle_job_award()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.job_offers SET status = 'rejected'
    WHERE request_id = NEW.request_id AND id <> NEW.offer_id AND status = 'submitted';
  UPDATE public.job_offers SET status = 'awarded' WHERE id = NEW.offer_id;
  UPDATE public.job_requests SET status = 'awarded' WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_job_award AFTER INSERT ON public.job_awards
  FOR EACH ROW EXECUTE FUNCTION public.handle_job_award();

-- 4. job_request_messages
CREATE TABLE public.job_request_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  corporation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_msgs_thread ON public.job_request_messages(request_id, corporation_id, created_at);

ALTER TABLE public.job_request_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads thread" ON public.job_request_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()));
CREATE POLICY "Corporation reads own thread" ON public.job_request_messages FOR SELECT TO authenticated
  USING (corporation_id = auth.uid());
CREATE POLICY "Admin reads messages" ON public.job_request_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner sends message" ON public.job_request_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid())
  );
CREATE POLICY "Corporation sends message" ON public.job_request_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND corporation_id = auth.uid()
    AND public.has_role(auth.uid(), 'corporation')
  );