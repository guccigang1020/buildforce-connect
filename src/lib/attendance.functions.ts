import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function cleanPhone(p?: string | null): string | null {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  if (d.length < 8) return null;
  // assume IL local 0XXXXXXXXX → 972XXXXXXXXX
  if (d.startsWith("0")) return "972" + d.slice(1);
  return d;
}

function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

async function logNotification(
  recordId: string,
  kind: string,
  recipientPhone: string,
  recipientRole: string,
  payload: Record<string, unknown>,
) {
  await supabaseAdmin.from("attendance_notifications").insert({
    record_id: recordId,
    kind,
    channel: "whatsapp",
    recipient_phone: recipientPhone,
    recipient_role: recipientRole,
    payload: payload as never,
  });
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function assertWithinSite(
  project: { site_lat: number | null; site_lng: number | null; site_radius_meters: number | null },
  lat: number,
  lng: number,
) {
  if (project.site_lat == null || project.site_lng == null) {
    throw new Error("הקבלן עדיין לא הגדיר את מיקום האתר. לא ניתן לפתוח/לסגור יום עבודה.");
  }
  const radius = project.site_radius_meters ?? 200;
  const dist = haversineMeters(Number(project.site_lat), Number(project.site_lng), lat, lng);
  if (dist > radius) {
    throw new Error(
      `אתה ${Math.round(dist)} מטר מהאתר. נדרש להיות בתוך ${radius} מטר מהאתר כדי לרשום נוכחות.`,
    );
  }
}

async function uploadPhoto(recordId: string, kind: string, base64: string): Promise<string> {
  const { data: rec } = await supabaseAdmin
    .from("attendance_records")
    .select("project_id, team_id, work_date")
    .eq("id", recordId)
    .single();
  if (!rec) throw new Error("Record not found");
  const path = `${rec.project_id}/${rec.work_date}/${rec.team_id}/${kind}-${Date.now()}.jpg`;
  const buf = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  const { error } = await supabaseAdmin.storage
    .from("attendance-photos")
    .upload(path, buf, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

export const startWorkday = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        teamId: z.string().uuid(),
        workersActual: z.number().int().min(1).max(500),
        gpsLat: z.number().min(-90).max(90),
        gpsLng: z.number().min(-180).max(180),
        photoBase64: z.string().min(100).max(8_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: team, error: tErr } = await supabase
      .from("project_teams")
      .select(
        "id, project_id, team_leader_id, expected_workers, hourly_rate, projects:project_id(contractor_id, corporation_id, site_lat, site_lng, site_radius_meters)",
      )
      .eq("id", data.teamId)
      .single();
    if (tErr || !team) throw new Error("צוות לא נמצא");
    if (team.team_leader_id !== userId) throw new Error("רק ראש הצוות יכול לפתוח יום עבודה");
    const proj = team.projects as {
      contractor_id: string;
      corporation_id: string;
      site_lat: number | null;
      site_lng: number | null;
      site_radius_meters: number | null;
    };
    await assertWithinSite(proj, data.gpsLat, data.gpsLng);
    const today = new Date().toISOString().slice(0, 10);

    // upsert pending record
    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id, status, start_time")
      .eq("team_id", data.teamId)
      .eq("work_date", today)
      .maybeSingle();
    if (existing?.start_time) throw new Error("יום העבודה כבר נפתח היום");

    let recordId = existing?.id;
    if (!recordId) {
      const { data: created, error } = await supabase
        .from("attendance_records")
        .insert({
          project_id: team.project_id,
          team_id: team.id,
          team_leader_id: userId,
          contractor_id: proj.contractor_id,
          corporation_id: proj.corporation_id,
          work_date: today,
          workers_expected: team.expected_workers,
          workers_actual: data.workersActual,
          hourly_rate: team.hourly_rate,
          status: "pending",
        })
        .select("id")
        .single();
      if (error || !created) throw new Error(error?.message || "שגיאה ביצירת רשומה");
      recordId = created.id;
    }

    const photoPath = await uploadPhoto(recordId!, "start", data.photoBase64);
    const now = new Date().toISOString();
    await supabase
      .from("attendance_records")
      .update({
        start_time: now,
        start_photo_url: photoPath,
        start_gps_lat: data.gpsLat,
        start_gps_lng: data.gpsLng,
        workers_actual: data.workersActual,
      })
      .eq("id", recordId!);

    await supabase.from("attendance_events").insert({
      record_id: recordId!,
      kind: "start",
      actor_id: userId,
      photo_url: photoPath,
      gps_lat: data.gpsLat,
      gps_lng: data.gpsLng,
      payload: { workers: data.workersActual },
    });

    // Notify site manager
    const { data: pj } = await supabaseAdmin
      .from("projects")
      .select("name, site_manager_phone, site_manager_name")
      .eq("id", team.project_id)
      .single();
    let waUrl: string | null = null;
    const phone = cleanPhone(pj?.site_manager_phone);
    if (phone) {
      const text = `🟢 פתיחת יום עבודה — ${pj?.name ?? ""}\nצוות: ${(team as { name?: string }).name ?? ""}\nעובדים שהגיעו: ${data.workersActual}/${team.expected_workers}\nשעה: ${new Date().toLocaleString("he-IL")}\n\nכנס לאשר: ${process.env.SITE_URL ?? "https://buildforce.app"}/contractor/attendance`;
      waUrl = waLink(phone, text);
      await logNotification(recordId!, "start", phone, "site_manager", {
        workers: data.workersActual,
      });
    }
    return { recordId, photoPath, notify: waUrl };
  });

export const endWorkday = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        recordId: z.string().uuid(),
        gpsLat: z.number().min(-90).max(90),
        gpsLng: z.number().min(-180).max(180),
        photoBase64: z.string().min(100).max(8_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rec } = await supabase
      .from("attendance_records")
      .select(
        "id, team_leader_id, end_time, frozen_at, project_id, projects:project_id(site_lat, site_lng, site_radius_meters)",
      )
      .eq("id", data.recordId)
      .single();
    if (!rec) throw new Error("רשומה לא נמצאה");
    if (rec.team_leader_id !== userId) throw new Error("Unauthorized");
    if (rec.frozen_at) throw new Error("הרשומה הוקפאה");
    if (rec.end_time) throw new Error("יום העבודה כבר נסגר");
    await assertWithinSite(
      rec.projects as {
        site_lat: number | null;
        site_lng: number | null;
        site_radius_meters: number | null;
      },
      data.gpsLat,
      data.gpsLng,
    );

    const photoPath = await uploadPhoto(data.recordId, "end", data.photoBase64);
    const now = new Date().toISOString();
    await supabase
      .from("attendance_records")
      .update({
        end_time: now,
        end_photo_url: photoPath,
        end_gps_lat: data.gpsLat,
        end_gps_lng: data.gpsLng,
      })
      .eq("id", data.recordId);
    await supabase.from("attendance_events").insert({
      record_id: data.recordId,
      kind: "end",
      actor_id: userId,
      photo_url: photoPath,
      gps_lat: data.gpsLat,
      gps_lng: data.gpsLng,
    });
    // notify site manager to approve
    const { data: full } = await supabaseAdmin
      .from("attendance_records")
      .select("id, project_id, projects:project_id(name, site_manager_phone)")
      .eq("id", data.recordId)
      .single();
    let waUrl: string | null = null;
    const proj = (full?.projects ?? null) as {
      name?: string;
      site_manager_phone?: string | null;
    } | null;
    const phone = cleanPhone(proj?.site_manager_phone);
    if (phone) {
      const text = `🔴 סיום יום עבודה — ${proj?.name ?? ""}\nשעה: ${new Date().toLocaleString("he-IL")}\n\nכנס לאשר: ${process.env.SITE_URL ?? "https://buildforce.app"}/contractor/attendance`;
      waUrl = waLink(phone, text);
      await logNotification(data.recordId, "end", phone, "site_manager", {});
    }
    return { ok: true, notify: waUrl };
  });

export const reportException = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        recordId: z.string().uuid(),
        reason: z.enum(["left_early", "partial_left", "absent", "half_day", "late", "other"]),
        note: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rec } = await supabase
      .from("attendance_records")
      .select("id, team_leader_id, contractor_id, frozen_at, project_id")
      .eq("id", data.recordId)
      .single();
    if (!rec) throw new Error("רשומה לא נמצאה");
    // Both team leader AND site manager (contractor) can report mid-day exceptions
    if (rec.team_leader_id !== userId && rec.contractor_id !== userId) {
      throw new Error("רק ראש הצוות או מנהל האתר יכולים לדווח חריגה");
    }
    if (rec.frozen_at) throw new Error("הרשומה הוקפאה");
    await supabase
      .from("attendance_records")
      .update({
        status: "exception",
        exception_reason: data.reason,
        exception_reported_by: userId,
        exception_note: data.note ?? null,
        exception_at: new Date().toISOString(),
      })
      .eq("id", data.recordId);
    await supabase.from("attendance_events").insert({
      record_id: data.recordId,
      kind: "exception",
      actor_id: userId,
      payload: { reason: data.reason, note: data.note ?? null },
    });
    // Notify the OTHER party
    const { data: pj } = await supabaseAdmin
      .from("projects")
      .select("name, site_manager_phone")
      .eq("id", rec.project_id)
      .single();
    const { data: tm } = await supabaseAdmin
      .from("project_teams")
      .select("team_leader_phone, name")
      .eq(
        "id",
        (
          await supabaseAdmin
            .from("attendance_records")
            .select("team_id")
            .eq("id", data.recordId)
            .single()
        ).data?.team_id ?? "",
      )
      .maybeSingle();
    let waUrl: string | null = null;
    // If site manager reported → notify team leader; else notify site manager
    const targetPhone =
      userId === rec.contractor_id
        ? cleanPhone(tm?.team_leader_phone)
        : cleanPhone(pj?.site_manager_phone);
    const targetRole = userId === rec.contractor_id ? "team_leader" : "site_manager";
    if (targetPhone) {
      const text = `⚠️ חריגה דווחה — ${pj?.name ?? ""}${tm?.name ? ` · ${tm.name}` : ""}\nסיבה: ${data.reason}${data.note ? `\nהערה: ${data.note}` : ""}\nשעה: ${new Date().toLocaleString("he-IL")}\n\nנדרש אישור: ${process.env.SITE_URL ?? "https://buildforce.app"}/contractor/attendance`;
      waUrl = waLink(targetPhone, text);
      await logNotification(data.recordId, "exception", targetPhone, targetRole, {
        reason: data.reason,
      });
    }
    return { ok: true, notify: waUrl };
  });

export const approveAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ recordId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rec } = await supabase
      .from("attendance_records")
      .select("id, contractor_id, frozen_at, end_time")
      .eq("id", data.recordId)
      .single();
    if (!rec) throw new Error("רשומה לא נמצאה");
    if (rec.contractor_id !== userId) throw new Error("רק הקבלן יכול לאשר");
    if (rec.frozen_at) throw new Error("הרשומה כבר אושרה");
    await supabase
      .from("attendance_records")
      .update({ status: "approved", approved_by: userId })
      .eq("id", data.recordId);
    await supabase.from("attendance_events").insert({
      record_id: data.recordId,
      kind: "approval",
      actor_id: userId,
    });
    return { ok: true };
  });

export const approveAllPending = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("attendance_records")
      .select("id")
      .eq("contractor_id", userId)
      .in("status", ["pending", "exception"])
      .is("frozen_at", null)
      .not("end_time", "is", null);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows } = await q;
    const ids = (rows ?? []).map((r) => r.id);
    if (ids.length === 0) return { count: 0 };
    await supabase
      .from("attendance_records")
      .update({ status: "approved", approved_by: userId })
      .in("id", ids);
    await supabase
      .from("attendance_events")
      .insert(ids.map((id) => ({ record_id: id, kind: "approval" as const, actor_id: userId })));
    return { count: ids.length };
  });

export const rejectAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ recordId: z.string().uuid(), reason: z.string().min(3).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rec } = await supabase
      .from("attendance_records")
      .select("contractor_id, frozen_at")
      .eq("id", data.recordId)
      .single();
    if (!rec || rec.contractor_id !== userId) throw new Error("Unauthorized");
    if (rec.frozen_at) throw new Error("הרשומה הוקפאה");
    await supabase
      .from("attendance_records")
      .update({ status: "rejected", rejection_reason: data.reason, approved_by: userId })
      .eq("id", data.recordId);
    await supabase.from("attendance_events").insert({
      record_id: data.recordId,
      kind: "rejection",
      actor_id: userId,
      payload: { reason: data.reason },
    });
    return { ok: true };
  });

export const requestCorrection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        recordId: z.string().uuid(),
        reason: z.string().min(3).max(1000),
        requestedChange: z.record(z.string(), z.unknown()),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify caller is associated with this attendance record.
    const { data: rec } = await supabase
      .from("attendance_records")
      .select("contractor_id, corporation_id, team_leader_id")
      .eq("id", data.recordId)
      .maybeSingle();
    if (!rec) throw new Error("רשומה לא נמצאה");
    if (
      rec.contractor_id !== userId &&
      rec.corporation_id !== userId &&
      rec.team_leader_id !== userId
    ) {
      throw new Error("אין לך הרשאה לבקש תיקון לרשומה זו");
    }
    const { error } = await supabase.from("attendance_corrections").insert({
      record_id: data.recordId,
      requested_by: userId,
      reason: data.reason,
      requested_change: data.requestedChange as never,
    });
    if (error) throw new Error(error.message);
    await supabase.from("attendance_events").insert({
      record_id: data.recordId,
      kind: "correction_request",
      actor_id: userId,
      payload: { reason: data.reason, change: data.requestedChange } as never,
    });
    return { ok: true };
  });

// Listings
export const listMyTeamLeaderProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: teams } = await supabase
      .from("project_teams")
      .select(
        "id, name, expected_workers, hourly_rate, project_id, projects:project_id(id, name, address, status)",
      )
      .eq("team_leader_id", userId);
    const today = new Date().toISOString().slice(0, 10);
    const teamIds = (teams ?? []).map((t) => t.id);
    let todayMap = new Map<
      string,
      { id: string; status: string; start_time: string | null; end_time: string | null }
    >();
    if (teamIds.length) {
      const { data: recs } = await supabase
        .from("attendance_records")
        .select("id, team_id, status, start_time, end_time")
        .in("team_id", teamIds)
        .eq("work_date", today);
      todayMap = new Map((recs ?? []).map((r) => [r.team_id, r]));
    }
    return {
      teams: (teams ?? []).map((t) => ({
        ...t,
        today: todayMap.get(t.id) ?? null,
      })),
    };
  });

export const getLastWorkersCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ teamId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: r } = await supabase
      .from("attendance_records")
      .select("workers_actual, work_date")
      .eq("team_id", data.teamId)
      .not("workers_actual", "is", null)
      .order("work_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { workers: r?.workers_actual ?? null, date: r?.work_date ?? null };
  });

export const listContractorAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ date: z.string().optional(), projectId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const date = data.date ?? new Date().toISOString().slice(0, 10);
    let q = supabase
      .from("attendance_records")
      .select("*, project_teams:team_id(name), projects:project_id(name)")
      .eq("contractor_id", userId)
      .eq("work_date", date)
      .order("created_at", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: records, error } = await q;
    if (error) throw new Error(error.message);
    return { records: records ?? [] };
  });

export const listCorporationAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ date: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const date = data.date ?? new Date().toISOString().slice(0, 10);
    const { data: records, error } = await supabase
      .from("attendance_records")
      .select("*, project_teams:team_id(name), projects:project_id(name, address)")
      .eq("corporation_id", userId)
      .eq("work_date", date)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { records: records ?? [] };
  });

export const getAttendanceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ recordId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rec } = await supabase
      .from("attendance_records")
      .select("*, project_teams:team_id(name), projects:project_id(name, address)")
      .eq("id", data.recordId)
      .single();
    if (!rec) throw new Error("רשומה לא נמצאה");
    if (
      rec.contractor_id !== userId &&
      rec.corporation_id !== userId &&
      rec.team_leader_id !== userId
    ) {
      throw new Error("אין לך הרשאה לצפות ברשומה זו");
    }
    const { data: events } = await supabase
      .from("attendance_events")
      .select("*")
      .eq("record_id", data.recordId)
      .order("created_at", { ascending: true });
    // signed photo URLs
    const signedUrls: Record<string, string> = {};
    const paths = [
      rec.start_photo_url,
      rec.end_photo_url,
      ...(events ?? []).map((e) => e.photo_url),
    ].filter(Boolean) as string[];
    if (paths.length) {
      const { data: signed } = await supabaseAdmin.storage
        .from("attendance-photos")
        .createSignedUrls(paths, 3600);
      (signed ?? []).forEach((s) => {
        if (s.path && s.signedUrl) signedUrls[s.path] = s.signedUrl;
      });
    }
    return { record: rec, events: events ?? [], signedUrls };
  });

// Monthly summary
export const getMonthlySummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        role: z.enum(["contractor", "corporation"]),
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(1).max(12),
        projectId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const start = `${data.year}-${String(data.month).padStart(2, "0")}-01`;
    const endDate = new Date(data.year, data.month, 0).toISOString().slice(0, 10);
    let q = supabase
      .from("attendance_records")
      .select("*, project_teams:team_id(name), projects:project_id(name)")
      .gte("work_date", start)
      .lte("work_date", endDate)
      .order("work_date", { ascending: true });
    q = data.role === "contractor" ? q.eq("contractor_id", userId) : q.eq("corporation_id", userId);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: records, error } = await q;
    if (error) throw new Error(error.message);
    const recs = records ?? [];
    const summary = {
      total: recs.length,
      approved: recs.filter((r) => r.status === "approved" || r.status === "auto_approved").length,
      exceptions: recs.filter((r) => r.status === "exception").length,
      rejected: recs.filter((r) => r.status === "rejected").length,
      pending: recs.filter((r) => r.status === "pending" || r.status === "correction_requested")
        .length,
      totalCost: recs.reduce((s, r) => s + Number(r.total_cost || 0), 0),
      totalHours: recs.reduce((s, r) => s + Number(r.total_hours || 0), 0),
    };
    return { records: recs, summary };
  });

// Contractor sets the project site location & geofence radius
export const setProjectSiteLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        siteLat: z.number().min(-90).max(90),
        siteLng: z.number().min(-180).max(180),
        radiusMeters: z.number().int().min(50).max(2000).default(200),
        address: z.string().max(500).optional(),
        siteManagerName: z.string().min(2).max(120).optional(),
        siteManagerPhone: z.string().min(8).max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: proj, error: pErr } = await supabase
      .from("projects")
      .select("id, contractor_id")
      .eq("id", data.projectId)
      .single();
    if (pErr || !proj) throw new Error("פרויקט לא נמצא");
    if (proj.contractor_id !== userId) throw new Error("רק הקבלן יכול להגדיר את מיקום האתר");
    const { error } = await supabase
      .from("projects")
      .update({
        site_lat: data.siteLat,
        site_lng: data.siteLng,
        site_radius_meters: data.radiusMeters,
        ...(data.address ? { address: data.address } : {}),
        ...(data.siteManagerName ? { site_manager_name: data.siteManagerName } : {}),
        ...(data.siteManagerPhone ? { site_manager_phone: data.siteManagerPhone } : {}),
      })
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Contractor lists own projects (for setup screen)
export const listContractorProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, name, address, status, site_lat, site_lng, site_radius_meters, site_manager_name, site_manager_phone, start_date",
      )
      .eq("contractor_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { projects: data ?? [] };
  });

// Contractor adds/updates a team with team-leader phone
export const upsertProjectTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        teamId: z.string().uuid().optional(),
        projectId: z.string().uuid(),
        name: z.string().min(2).max(120),
        teamLeaderName: z.string().min(2).max(120),
        teamLeaderPhone: z.string().min(8).max(20),
        teamLeaderUserId: z.string().uuid(),
        expectedWorkers: z.number().int().min(1).max(500),
        hourlyRate: z.number().min(0).max(10000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: proj } = await supabase
      .from("projects")
      .select("id, contractor_id")
      .eq("id", data.projectId)
      .single();
    if (!proj || proj.contractor_id !== userId) throw new Error("Unauthorized");
    const payload = {
      project_id: data.projectId,
      name: data.name,
      team_leader_id: data.teamLeaderUserId,
      team_leader_name: data.teamLeaderName,
      team_leader_phone: data.teamLeaderPhone,
      expected_workers: data.expectedWorkers,
      hourly_rate: data.hourlyRate,
    };
    if (data.teamId) {
      const { error } = await supabase.from("project_teams").update(payload).eq("id", data.teamId);
      if (error) throw new Error(error.message);
      return { id: data.teamId };
    }
    const { data: created, error } = await supabase
      .from("project_teams")
      .insert(payload)
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message || "שגיאה");
    return { id: created.id };
  });

// Contractor lists teams for a project
export const listProjectTeams = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: proj } = await supabase
      .from("projects")
      .select("contractor_id, corporation_id")
      .eq("id", data.projectId)
      .maybeSingle();
    const isAdmin = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const allowed =
      !!proj &&
      (proj.contractor_id === userId || proj.corporation_id === userId || isAdmin.data === true);
    if (!allowed) throw new Error("Unauthorized");
    const { data: teams, error } = await supabase
      .from("project_teams")
      .select(
        "id, name, expected_workers, hourly_rate, team_leader_id, team_leader_name, team_leader_phone",
      )
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { teams: teams ?? [] };
  });
