import { supabaseAdmin } from '@/integrations/supabase/client.server'

export async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Forbidden: admin role required')
}

export async function fetchAdminDashboardData() {
  const [profilesResult, rolesResult, auditResult, activeAuctionsResult, completedDealsResult] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select(
        'id, user_id, full_name, phone, business_name, business_id, company_name, city, contractor_license_number, contractor_classification, verification_status, is_verified, license_doc_url, insurance_doc_url, books_cert_url, admin_notes, created_at, email',
      )
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('user_roles').select('user_id, role'),
    supabaseAdmin
      .from('audit_log')
      .select('id, action, entity_type, entity_id, actor_id, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin
      .from('job_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabaseAdmin
      .from('job_awards')
      .select('id', { count: 'exact', head: true }),
  ])

  if (profilesResult.error) throw new Error(profilesResult.error.message)
  if (rolesResult.error) throw new Error(rolesResult.error.message)
  if (auditResult.error) throw new Error(auditResult.error.message)
  if (activeAuctionsResult.error) throw new Error(activeAuctionsResult.error.message)
  if (completedDealsResult.error) throw new Error(completedDealsResult.error.message)

  return {
    profiles: profilesResult.data ?? [],
    roles: rolesResult.data ?? [],
    auditLog: auditResult.data ?? [],
    activeAuctions: activeAuctionsResult.count ?? 0,
    completedDeals: completedDealsResult.count ?? 0,
  }
}