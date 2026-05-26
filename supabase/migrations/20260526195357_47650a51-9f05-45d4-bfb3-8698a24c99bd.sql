
-- Price history log for the live reverse-auction panel
CREATE TABLE public.job_offer_price_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.job_offers(id) ON DELETE CASCADE,
  corporation_id uuid NOT NULL,
  price_per_hour numeric(10,2) NOT NULL,
  previous_price numeric(10,2),
  event_type text NOT NULL CHECK (event_type IN ('joined','drop','raise','update')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_offer_price_log_request ON public.job_offer_price_log(request_id, created_at);
CREATE INDEX idx_job_offer_price_log_offer ON public.job_offer_price_log(offer_id, created_at);

GRANT SELECT, INSERT ON public.job_offer_price_log TO authenticated;
GRANT ALL ON public.job_offer_price_log TO service_role;

ALTER TABLE public.job_offer_price_log ENABLE ROW LEVEL SECURITY;

-- Owner of the request, the bidding corp itself, and admins can read
CREATE POLICY "Parties read price log"
  ON public.job_offer_price_log FOR SELECT
  TO authenticated
  USING (
    corporation_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Trigger function: log on insert + on price change
CREATE OR REPLACE FUNCTION public.log_job_offer_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

-- Backfill existing offers as 'joined' events
INSERT INTO public.job_offer_price_log(request_id, offer_id, corporation_id, price_per_hour, previous_price, event_type, created_at)
SELECT request_id, id, corporation_id, price_per_hour, NULL, 'joined', created_at
FROM public.job_offers
WHERE NOT EXISTS (
  SELECT 1 FROM public.job_offer_price_log l WHERE l.offer_id = job_offers.id
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_offer_price_log;
