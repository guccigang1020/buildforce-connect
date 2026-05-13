import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

const uploadPhotoSchema = z.object({
  recordId: z.string().uuid(),
  kind: z.enum(['start', 'end']),
  base64: z.string().min(100).max(8_000_000),
})

async function uploadPhoto(recordId: string, kind: string, base64: string): Promise<string> {
  const { data: rec } = await supabaseAdmin
    .from('attendance_records')
    .select('project_id, team_id, work_date')
    .eq('id', recordId)
    .single()
  if (!rec) throw new Error('Record not found')
  const path = `${rec.project_id}/${rec.work_date}/${rec.team_id}/${kind}-${Date.now()}.jpg`
  const buf = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
  const { error } = await supabaseAdmin.storage
    .from('attendance-photos')
    .upload(path, buf, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(error.message)
  return path
}

export const startWorkday = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      teamId: z.string().uuid(),
      workersActual: z.number().int().min(1).max(500),
      gpsLat: z.number().min(-90).max(90),
      gpsLng: z.number().min(-180).max(180),
      photoBase64: z.string().min(100).max(8_000_000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const { data: team, error: tErr } = await supabase
      .from('project_teams')
      .select('id, project_id, team_leader_id, expected_workers, hourly_rate, projects:project_id(contractor_id, corporation_id)')
      .eq('id', data.teamId)
      .single()
    if (tErr || !team) throw new Error('צוות לא נמצא')
    if (team.team_leader_id !== userId) throw new Error('רק ראש הצוות יכול לפתוח יום עבודה')
    const proj = team.projects as { contractor_id: string; corporation_id: string }
    const today = new Date().toISOString().slice(0, 10)

    // upsert pending record
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('id, status, start_time')
      .eq('team_id', data.teamId)
      .eq('work_date', today)
      .maybeSingle()
    if (existing?.start_time) throw new Error('יום העבודה כבר נפתח היום')

    let recordId = existing?.id
    if (!recordId) {
      const { data: created, error } = await supabase
        .from('attendance_records')
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
          status: 'pending',
        })
        .select('id')
        .single()
      if (error || !created) throw new Error(error?.message || 'שגיאה ביצירת רשומה')
      recordId = created.id
    }

    const photoPath = await uploadPhoto(recordId!, 'start', data.photoBase64)
    const now = new Date().toISOString()
    await supabase
      .from('attendance_records')
      .update({
        start_time: now,
        start_photo_url: photoPath,
        start_gps_lat: data.gpsLat,
        start_gps_lng: data.gpsLng,
        workers_actual: data.workersActual,
      })
      .eq('id', recordId!)

    await supabase.from('attendance_events').insert({
      record_id: recordId!,
      kind: 'start',
      actor_id: userId,
      photo_url: photoPath,
      gps_lat: data.gpsLat,
      gps_lng: data.gpsLng,
      payload: { workers: data.workersActual },
    })

    return { recordId, photoPath }
  })

export const endWorkday = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      recordId: z.string().uuid(),
      gpsLat: z.number().min(-90).max(90),
      gpsLng: z.number().min(-180).max(180),
      photoBase64: z.string().min(100).max(8_000_000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const { data: rec } = await supabase
      .from('attendance_records')
      .select('id, team_leader_id, end_time, frozen_at')
      .eq('id', data.recordId)
      .single()
    if (!rec) throw new Error('רשומה לא נמצאה')
    if (rec.team_leader_id !== userId) throw new Error('Unauthorized')
    if (rec.frozen_at) throw new Error('הרשומה הוקפאה')
    if (rec.end_time) throw new Error('יום העבודה כבר נסגר')

    const photoPath = await uploadPhoto(data.recordId, 'end', data.photoBase64)
    const now = new Date().toISOString()
    await supabase
      .from('attendance_records')
      .update({
        end_time: now,
        end_photo_url: photoPath,
        end_gps_lat: data.gpsLat,
        end_gps_lng: data.gpsLng,
      })
      .eq('id', data.recordId)
    await supabase.from('attendance_events').insert({
      record_id: data.recordId,
      kind: 'end',
      actor_id: userId,
      photo_url: photoPath,
      gps_lat: data.gpsLat,
      gps_lng: data.gpsLng,
    })
    return { ok: true }
  })

export const reportException = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      recordId: z.string().uuid(),
      reason: z.enum(['left_early', 'partial_left', 'absent', 'half_day', 'late', 'other']),
      note: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const { data: rec } = await supabase
      .from('attendance_records')
      .select('id, team_leader_id, frozen_at')
      .eq('id', data.recordId)
      .single()
    if (!rec) throw new Error('רשומה לא נמצאה')
    if (rec.team_leader_id !== userId) throw new Error('Unauthorized')
    if (rec.frozen_at) throw new Error('הרשומה הוקפאה')
    await supabase
      .from('attendance_records')
      .update({ status: 'exception', exception_reason: data.reason })
      .eq('id', data.recordId)
    await supabase.from('attendance_events').insert({
      record_id: data.recordId,
      kind: 'exception',
      actor_id: userId,
      payload: { reason: data.reason, note: data.note ?? null },
    })
    return { ok: true }
  })

export const approveAttendance = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ recordId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const { data: rec } = await supabase
      .from('attendance_records')
      .select('id, contractor_id, frozen_at, end_time')
      .eq('id', data.recordId)
      .single()
    if (!rec) throw new Error('רשומה לא נמצאה')
    if (rec.contractor_id !== userId) throw new Error('רק הקבלן יכול לאשר')
    if (rec.frozen_at) throw new Error('הרשומה כבר אושרה')
    await supabase
      .from('attendance_records')
      .update({ status: 'approved', approved_by: userId })
      .eq('id', data.recordId)
    await supabase.from('attendance_events').insert({
      record_id: data.recordId,
      kind: 'approval',
      actor_id: userId,
    })
    return { ok: true }
  })

export const approveAllPending = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    let q = supabase
      .from('attendance_records')
      .select('id')
      .eq('contractor_id', userId)
      .in('status', ['pending', 'exception'])
      .is('frozen_at', null)
      .not('end_time', 'is', null)
    if (data.projectId) q = q.eq('project_id', data.projectId)
    const { data: rows } = await q
    const ids = (rows ?? []).map((r) => r.id)
    if (ids.length === 0) return { count: 0 }
    await supabase
      .from('attendance_records')
      .update({ status: 'approved', approved_by: userId })
      .in('id', ids)
    await supabase.from('attendance_events').insert(
      ids.map((id) => ({ record_id: id, kind: 'approval' as const, actor_id: userId })),
    )
    return { count: ids.length }
  })

export const rejectAttendance = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ recordId: z.string().uuid(), reason: z.string().min(3).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const { data: rec } = await supabase
      .from('attendance_records')
      .select('contractor_id, frozen_at')
      .eq('id', data.recordId)
      .single()
    if (!rec || rec.contractor_id !== userId) throw new Error('Unauthorized')
    if (rec.frozen_at) throw new Error('הרשומה הוקפאה')
    await supabase
      .from('attendance_records')
      .update({ status: 'rejected', rejection_reason: data.reason, approved_by: userId })
      .eq('id', data.recordId)
    await supabase.from('attendance_events').insert({
      record_id: data.recordId,
      kind: 'rejection',
      actor_id: userId,
      payload: { reason: data.reason },
    })
    return { ok: true }
  })

export const requestCorrection = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      recordId: z.string().uuid(),
      reason: z.string().min(3).max(1000),
      requestedChange: z.record(z.string(), z.unknown()),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const { error } = await supabase.from('attendance_corrections').insert({
      record_id: data.recordId,
      requested_by: userId,
      reason: data.reason,
      requested_change: data.requestedChange,
    })
    if (error) throw new Error(error.message)
    await supabase.from('attendance_events').insert({
      record_id: data.recordId,
      kind: 'correction_request',
      actor_id: userId,
      payload: { reason: data.reason, change: data.requestedChange },
    })
    return { ok: true }
  })

// Listings
export const listMyTeamLeaderProjects = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context
    const { data: teams } = await supabase
      .from('project_teams')
      .select('id, name, expected_workers, hourly_rate, project_id, projects:project_id(id, name, address, status)')
      .eq('team_leader_id', userId)
    const today = new Date().toISOString().slice(0, 10)
    const teamIds = (teams ?? []).map((t) => t.id)
    let todayMap = new Map<string, { id: string; status: string; start_time: string | null; end_time: string | null }>()
    if (teamIds.length) {
      const { data: recs } = await supabase
        .from('attendance_records')
        .select('id, team_id, status, start_time, end_time')
        .in('team_id', teamIds)
        .eq('work_date', today)
      todayMap = new Map((recs ?? []).map((r) => [r.team_id, r]))
    }
    return {
      teams: (teams ?? []).map((t) => ({
        ...t,
        today: todayMap.get(t.id) ?? null,
      })),
    }
  })

export const listContractorAttendance = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ date: z.string().optional(), projectId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const date = data.date ?? new Date().toISOString().slice(0, 10)
    let q = supabase
      .from('attendance_records')
      .select('*, project_teams:team_id(name), projects:project_id(name)')
      .eq('contractor_id', userId)
      .eq('work_date', date)
      .order('created_at', { ascending: false })
    if (data.projectId) q = q.eq('project_id', data.projectId)
    const { data: records, error } = await q
    if (error) throw new Error(error.message)
    return { records: records ?? [] }
  })

export const listCorporationAttendance = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ date: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const date = data.date ?? new Date().toISOString().slice(0, 10)
    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('*, project_teams:team_id(name), projects:project_id(name, address)')
      .eq('corporation_id', userId)
      .eq('work_date', date)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return { records: records ?? [] }
  })

export const getAttendanceRecord = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ recordId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context
    const { data: rec } = await supabase
      .from('attendance_records')
      .select('*, project_teams:team_id(name), projects:project_id(name, address)')
      .eq('id', data.recordId)
      .single()
    if (!rec) throw new Error('רשומה לא נמצאה')
    const { data: events } = await supabase
      .from('attendance_events')
      .select('*')
      .eq('record_id', data.recordId)
      .order('created_at', { ascending: true })
    // signed photo URLs
    const signedUrls: Record<string, string> = {}
    const paths = [rec.start_photo_url, rec.end_photo_url, ...(events ?? []).map((e) => e.photo_url)].filter(Boolean) as string[]
    if (paths.length) {
      const { data: signed } = await supabaseAdmin.storage
        .from('attendance-photos')
        .createSignedUrls(paths, 3600)
      ;(signed ?? []).forEach((s) => {
        if (s.path && s.signedUrl) signedUrls[s.path] = s.signedUrl
      })
    }
    return { record: rec, events: events ?? [], signedUrls }
  })

// Monthly summary
export const getMonthlySummary = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      role: z.enum(['contractor', 'corporation']),
      year: z.number().int().min(2020).max(2100),
      month: z.number().int().min(1).max(12),
      projectId: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const start = `${data.year}-${String(data.month).padStart(2, '0')}-01`
    const endDate = new Date(data.year, data.month, 0).toISOString().slice(0, 10)
    let q = supabase
      .from('attendance_records')
      .select('*, project_teams:team_id(name), projects:project_id(name)')
      .gte('work_date', start)
      .lte('work_date', endDate)
      .order('work_date', { ascending: true })
    q = data.role === 'contractor' ? q.eq('contractor_id', userId) : q.eq('corporation_id', userId)
    if (data.projectId) q = q.eq('project_id', data.projectId)
    const { data: records, error } = await q
    if (error) throw new Error(error.message)
    const recs = records ?? []
    const summary = {
      total: recs.length,
      approved: recs.filter((r) => r.status === 'approved' || r.status === 'auto_approved').length,
      exceptions: recs.filter((r) => r.status === 'exception').length,
      rejected: recs.filter((r) => r.status === 'rejected').length,
      pending: recs.filter((r) => r.status === 'pending' || r.status === 'correction_requested').length,
      totalCost: recs.reduce((s, r) => s + Number(r.total_cost || 0), 0),
      totalHours: recs.reduce((s, r) => s + Number(r.total_hours || 0), 0),
    }
    return { records: recs, summary }
  })
