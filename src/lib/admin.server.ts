import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export async function fetchAdminDashboardData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [
    profilesResult,
    rolesResult,
    auditResult,
    activeAuctionsResult,
    completedDealsResult,
    recentAwardsResult,
    monthlyAttendanceResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select(
        "id, user_id, full_name, phone, business_name, business_id, company_name, city, contractor_license_number, contractor_classification, verification_status, is_verified, license_doc_url, insurance_doc_url, books_cert_url, admin_notes, created_at, email",
      )
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("user_roles").select("user_id, role"),
    supabaseAdmin
      .from("audit_log")
      .select("id, action, entity_type, entity_id, actor_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("job_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabaseAdmin.from("job_awards").select("id", { count: "exact", head: true }),
    // Deal velocity: awards in last 30 days
    supabaseAdmin
      .from("job_awards")
      .select("id", { count: "exact", head: true })
      .gte("awarded_at", thirtyDaysAgo),
    // Monthly attendance value (workforce in motion)
    supabaseAdmin
      .from("attendance_records")
      .select("total_cost, total_hours, workers_actual")
      .gte("work_date", monthStart),
  ]);

  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (rolesResult.error) throw new Error(rolesResult.error.message);
  if (auditResult.error) throw new Error(auditResult.error.message);
  if (activeAuctionsResult.error) throw new Error(activeAuctionsResult.error.message);
  if (completedDealsResult.error) throw new Error(completedDealsResult.error.message);

  const allRoles = rolesResult.data ?? [];
  // Admins are internal platform operators, not marketplace participants —
  // exclude them from the verification queue (an admin should never see
  // their own account, or a fellow admin's, sitting in "pending approval").
  const adminUserIds = new Set(allRoles.filter((r) => r.role === "admin").map((r) => r.user_id));
  const profiles = (profilesResult.data ?? []).filter((p) => !adminUserIds.has(p.user_id));
  const totalCorporations = allRoles.filter(
    (r) => r.role === "corporation" && !adminUserIds.has(r.user_id),
  ).length;

  const attendanceRecs = monthlyAttendanceResult.data ?? [];
  const monthlyWorkforceValue = attendanceRecs.reduce(
    (s, r) => s + Number(r.total_cost ?? 0),
    0,
  );
  const monthlyWorkerHours = attendanceRecs.reduce(
    (s, r) => s + Number(r.total_hours ?? 0),
    0,
  );

  return {
    profiles,
    roles: allRoles,
    auditLog: auditResult.data ?? [],
    activeAuctions: activeAuctionsResult.count ?? 0,
    completedDeals: completedDealsResult.count ?? 0,
    recentAwards: recentAwardsResult.count ?? 0,
    monthlyWorkforceValue,
    monthlyWorkerHours,
    totalCorporations,
  };
}
