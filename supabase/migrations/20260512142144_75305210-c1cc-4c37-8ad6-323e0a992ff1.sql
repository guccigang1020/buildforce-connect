CREATE TABLE public.corporation_workforce (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  corporation_id UUID NOT NULL,
  role TEXT NOT NULL,
  nationality TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (corporation_id, role, nationality)
);

CREATE INDEX idx_corporation_workforce_corp ON public.corporation_workforce (corporation_id);

ALTER TABLE public.corporation_workforce ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view workforce"
  ON public.corporation_workforce FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Corporation manages own workforce insert"
  ON public.corporation_workforce FOR INSERT
  TO authenticated
  WITH CHECK (corporation_id = auth.uid() AND has_role(auth.uid(), 'corporation'::app_role));

CREATE POLICY "Corporation manages own workforce update"
  ON public.corporation_workforce FOR UPDATE
  TO authenticated
  USING (corporation_id = auth.uid())
  WITH CHECK (corporation_id = auth.uid());

CREATE POLICY "Corporation manages own workforce delete"
  ON public.corporation_workforce FOR DELETE
  TO authenticated
  USING (corporation_id = auth.uid());

CREATE POLICY "Admins manage all workforce"
  ON public.corporation_workforce FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_corporation_workforce_updated_at
  BEFORE UPDATE ON public.corporation_workforce
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();