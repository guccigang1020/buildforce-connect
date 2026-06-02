ALTER TABLE public.job_offers
  ADD COLUMN IF NOT EXISTS requires_personal_guarantee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_security_check boolean NOT NULL DEFAULT false;