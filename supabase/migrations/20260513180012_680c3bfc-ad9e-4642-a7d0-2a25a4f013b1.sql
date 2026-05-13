
-- attendance_records: hottest table
CREATE INDEX IF NOT EXISTS idx_attendance_records_project_date ON public.attendance_records (project_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_team_date ON public.attendance_records (team_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_contractor ON public.attendance_records (contractor_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_corporation ON public.attendance_records (corporation_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_team_leader ON public.attendance_records (team_leader_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records (status) WHERE frozen_at IS NULL;

-- attendance_events
CREATE INDEX IF NOT EXISTS idx_attendance_events_record ON public.attendance_events (record_id, created_at DESC);

-- notifications
CREATE INDEX IF NOT EXISTS idx_attendance_notifications_record ON public.attendance_notifications (record_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_record ON public.sms_notifications (record_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON public.sms_notifications (status) WHERE status IN ('queued','failed');

-- corrections
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_record ON public.attendance_corrections (record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_status ON public.attendance_corrections (status) WHERE status = 'pending';

-- job marketplace
CREATE INDEX IF NOT EXISTS idx_job_offers_request ON public.job_offers (request_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_corporation ON public.job_offers (corporation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_offers_status ON public.job_offers (status);
CREATE INDEX IF NOT EXISTS idx_job_awards_request ON public.job_awards (request_id);
CREATE INDEX IF NOT EXISTS idx_job_awards_corporation ON public.job_awards (corporation_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_user ON public.job_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_requests_status ON public.job_requests (status, deadline_at);
CREATE INDEX IF NOT EXISTS idx_job_request_items_request ON public.job_request_items (request_id);
CREATE INDEX IF NOT EXISTS idx_job_request_messages_request ON public.job_request_messages (request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_ratings_ratee ON public.job_ratings (ratee_id);
CREATE INDEX IF NOT EXISTS idx_job_ratings_request ON public.job_ratings (request_id);

-- projects / teams / members
CREATE INDEX IF NOT EXISTS idx_projects_contractor ON public.projects (contractor_id);
CREATE INDEX IF NOT EXISTS idx_projects_corporation ON public.projects (corporation_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members (project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members (user_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_project ON public.project_teams (project_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_leader ON public.project_teams (team_leader_id);

-- user_roles: critical, used by has_role() in every RLS check
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles (user_id, role);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_verification ON public.profiles (verification_status);

-- audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log (entity_type, entity_id);

-- corporation_workforce
CREATE INDEX IF NOT EXISTS idx_corporation_workforce_corp ON public.corporation_workforce (corporation_id);
