
-- 1) Move sensitive contact info out of job_requests
CREATE TABLE IF NOT EXISTS public.job_request_contacts (
  request_id uuid PRIMARY KEY,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.job_request_contacts (request_id, contact_name, contact_phone)
SELECT id, contact_name, contact_phone FROM public.job_requests
ON CONFLICT (request_id) DO NOTHING;

ALTER TABLE public.job_requests ALTER COLUMN contact_name DROP NOT NULL;
ALTER TABLE public.job_requests ALTER COLUMN contact_phone DROP NOT NULL;
-- Wipe sensitive columns; new code reads from job_request_contacts
UPDATE public.job_requests SET contact_name = NULL, contact_phone = NULL;

ALTER TABLE public.job_request_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own contact"
  ON public.job_request_contacts FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_requests jr
                 WHERE jr.id = job_request_contacts.request_id
                   AND jr.user_id = auth.uid()));

CREATE POLICY "Winning corp reads contact"
  ON public.job_request_contacts FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_awards a
                 WHERE a.request_id = job_request_contacts.request_id
                   AND a.corporation_id = auth.uid()));

CREATE POLICY "Admin reads all contacts"
  ON public.job_request_contacts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Owner inserts own contact"
  ON public.job_request_contacts FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.job_requests jr
                      WHERE jr.id = job_request_contacts.request_id
                        AND jr.user_id = auth.uid()));

CREATE POLICY "Owner updates own contact"
  ON public.job_request_contacts FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_requests jr
                 WHERE jr.id = job_request_contacts.request_id
                   AND jr.user_id = auth.uid()));

-- 2) Fix broken storage policies for attendance-photos
DROP POLICY IF EXISTS "Parties read attendance photos" ON storage.objects;
DROP POLICY IF EXISTS "Team leader uploads attendance photos" ON storage.objects;

-- Path layout: {project_id}/{date}/{team_id}/{kind}-{ts}.jpg
CREATE POLICY "Parties read attendance photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'attendance-photos'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(storage.objects.name))[1]
        AND (p.contractor_id = auth.uid()
          OR p.corporation_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.project_members m
                     WHERE m.project_id = p.id AND m.user_id = auth.uid()))
    )
  );

CREATE POLICY "Team leader uploads attendance photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'attendance-photos'
    AND EXISTS (
      SELECT 1 FROM public.project_teams t
      WHERE t.id::text = (storage.foldername(storage.objects.name))[3]
        AND t.team_leader_id = auth.uid()
    )
  );

-- 3) Remove attendance tables from realtime publication (app doesn't use realtime here)
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.attendance_records';
EXCEPTION WHEN undefined_object THEN NULL; WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.attendance_events';
EXCEPTION WHEN undefined_object THEN NULL; WHEN others THEN NULL;
END $$;
