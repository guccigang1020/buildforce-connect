import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Contractor triggers "Close Day" for a specific date.
// Finds all approved/auto_approved attendance_records for that contractor on that date,
// creates daily_approved_accounts rows (immutable snapshots), and sets frozen_at on
// each source record so no further edits are possible.
export const generateDailyAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: records, error } = await supabaseAdmin
      .from("attendance_records")
      .select("id, work_date, project_id, contractor_id, corporation_id, team_id, team_leader_id, status, approved_at, workers_actual, workers_expected, start_time, end_time, total_hours, total_cost, hourly_rate, exception_reason, start_photo_url, end_photo_url, start_gps_lat, start_gps_lng, end_gps_lat, end_gps_lng, projects:project_id(name, site_manager_name), project_teams:team_id(name, team_leader_name)")
      .eq("contractor_id", userId)
      .eq("work_date", data.date)
      .in("status", ["approved", "auto_approved"])
      .is("frozen_at", null);

    if (error) throw new Error(error.message);
    if (!records || records.length === 0) return { created: 0, totalCost: 0, totalHours: 0 };

    // Contractor name snapshot (same for all records — caller is the contractor)
    const { data: contractorProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, company_name")
      .eq("id", userId)
      .single();
    const contractorName =
      contractorProfile?.company_name ?? contractorProfile?.full_name ?? null;

    // Corporation name snapshots (batch by unique IDs)
    const uniqueCorpIds = [...new Set(records.map((r) => r.corporation_id))];
    const { data: corpProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, company_name")
      .in("id", uniqueCorpIds);
    const corpNameMap = new Map(
      (corpProfiles ?? []).map((p) => [p.id, p.company_name ?? p.full_name ?? null]),
    );

    const now = new Date().toISOString();

    const accountRows = records.map((rec) => {
      const proj = rec.projects as { name: string; site_manager_name: string | null } | null;
      const team = rec.project_teams as {
        name: string | null;
        team_leader_name: string | null;
      } | null;
      const totalWorkerHours =
        rec.total_hours != null && rec.workers_actual != null
          ? Math.round(Number(rec.total_hours) * rec.workers_actual * 10000) / 10000
          : null;

      return {
        attendance_record_id: rec.id,
        work_date: rec.work_date,
        project_id: rec.project_id,
        contractor_id: rec.contractor_id,
        corporation_id: rec.corporation_id,
        team_id: rec.team_id,
        team_leader_id: rec.team_leader_id,
        project_name: proj?.name ?? "",
        contractor_name: contractorName,
        corporation_name: corpNameMap.get(rec.corporation_id) ?? null,
        site_manager_name: proj?.site_manager_name ?? null,
        team_name: team?.name ?? null,
        team_leader_name: team?.team_leader_name ?? null,
        workers_actual: rec.workers_actual,
        workers_expected: rec.workers_expected,
        start_time: rec.start_time,
        end_time: rec.end_time,
        total_hours: rec.total_hours,
        total_worker_hours: totalWorkerHours,
        hourly_rate: rec.hourly_rate,
        total_cost: rec.total_cost,
        approval_method: rec.status === "auto_approved" ? "auto" : "manual",
        approved_at: rec.approved_at,
        has_exception: rec.exception_reason != null,
        exception_reason: rec.exception_reason,
        start_photo_url: rec.start_photo_url,
        end_photo_url: rec.end_photo_url,
        start_gps_lat: rec.start_gps_lat,
        start_gps_lng: rec.start_gps_lng,
        end_gps_lat: rec.end_gps_lat,
        end_gps_lng: rec.end_gps_lng,
        generated_by: userId,
        generated_at: now,
      };
    });

    // Upsert — ignoreDuplicates makes re-runs safe (idempotent)
    const { error: insertError } = await supabaseAdmin
      .from("daily_approved_accounts")
      .upsert(accountRows, { onConflict: "attendance_record_id", ignoreDuplicates: true });

    if (insertError) throw new Error(insertError.message);

    // Freeze source records — blocks any subsequent edits
    const recordIds = records.map((r) => r.id);
    await supabaseAdmin
      .from("attendance_records")
      .update({ frozen_at: now })
      .in("id", recordIds);

    const totalCost = records.reduce((s, r) => s + Number(r.total_cost ?? 0), 0);
    const totalHours = records.reduce((s, r) => s + Number(r.total_hours ?? 0), 0);

    return {
      created: records.length,
      totalCost: Math.round(totalCost * 100) / 100,
      totalHours: Math.round(totalHours * 10000) / 10000,
    };
  });

// Returns approved/auto_approved records that have not yet been closed into a daily account.
// The UI groups these by work_date to show per-day closure candidates.
export const getPendingClosureRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: records, error } = await supabase
      .from("attendance_records")
      .select("id, work_date, status, total_cost, total_hours, workers_actual, projects:project_id(name), project_teams:team_id(name)")
      .eq("contractor_id", userId)
      .in("status", ["approved", "auto_approved"])
      .is("frozen_at", null)
      .order("work_date", { ascending: false });
    if (error) throw new Error(error.message);
    return { records: records ?? [] };
  });

export const listContractorDailyAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ month: z.string().optional(), projectId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const month = data.month ?? new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split("-").map(Number);
    const start = `${month}-01`;
    const end = new Date(year, mon, 0).toISOString().slice(0, 10);

    let q = supabase
      .from("daily_approved_accounts")
      .select("*")
      .eq("contractor_id", userId)
      .gte("work_date", start)
      .lte("work_date", end)
      .order("work_date", { ascending: false });

    if (data.projectId) q = q.eq("project_id", data.projectId);

    const { data: accounts, error } = await q;
    if (error) throw new Error(error.message);
    return { accounts: accounts ?? [] };
  });

export const listCorporationDailyAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ month: z.string().optional(), projectId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const month = data.month ?? new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split("-").map(Number);
    const start = `${month}-01`;
    const end = new Date(year, mon, 0).toISOString().slice(0, 10);

    let q = supabase
      .from("daily_approved_accounts")
      .select("*")
      .eq("corporation_id", userId)
      .gte("work_date", start)
      .lte("work_date", end)
      .order("work_date", { ascending: false });

    if (data.projectId) q = q.eq("project_id", data.projectId);

    const { data: accounts, error } = await q;
    if (error) throw new Error(error.message);
    return { accounts: accounts ?? [] };
  });
