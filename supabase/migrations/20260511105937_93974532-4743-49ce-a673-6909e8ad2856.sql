CREATE TABLE public.job_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  location TEXT NOT NULL,
  start_date TEXT NOT NULL,
  duration TEXT NOT NULL,
  commitment_months TEXT NOT NULL,
  budget TEXT,
  description TEXT,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.job_request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  nationality TEXT NOT NULL,
  count INTEGER NOT NULL CHECK (count > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_request_items_request_id ON public.job_request_items(request_id);
CREATE INDEX idx_job_requests_user_id ON public.job_requests(user_id);
CREATE INDEX idx_job_requests_created_at ON public.job_requests(created_at DESC);

ALTER TABLE public.job_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all job requests"
  ON public.job_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create job requests"
  ON public.job_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update own job requests"
  ON public.job_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any job request"
  ON public.job_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can delete own job requests"
  ON public.job_requests FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view job request items"
  ON public.job_request_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners can insert items to own requests"
  ON public.job_request_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()));

CREATE POLICY "Owners can update items on own requests"
  ON public.job_request_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()));

CREATE POLICY "Owners can delete items on own requests"
  ON public.job_request_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()));

CREATE TRIGGER update_job_requests_updated_at
  BEFORE UPDATE ON public.job_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();