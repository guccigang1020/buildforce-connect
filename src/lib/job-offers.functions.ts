import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { sendTransactionalEmailServer } from '@/lib/email/send.server'

const submitSchema = z.object({
  requestId: z.string().uuid(),
  pricePerHour: z.number().positive().max(10000),
  availableWorkers: z.number().int().positive().max(10000),
  startDate: z.string().min(1).max(50),
  responseTimeHours: z.number().int().min(1).max(168).default(24),
  warrantyDays: z.number().int().min(0).max(365).default(30),
  insurance: z.boolean().default(true),
  note: z.string().max(2000).optional(),
})

export const submitOffer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const { data: offer, error } = await supabase
      .from('job_offers')
      .insert({
        request_id: data.requestId,
        corporation_id: userId,
        price_per_hour: data.pricePerHour,
        available_workers: data.availableWorkers,
        start_date: data.startDate,
        response_time_hours: data.responseTimeHours,
        warranty_days: data.warrantyDays,
        insurance: data.insurance,
        note: data.note ?? null,
      })
      .select('id, request_id')
      .single()
    if (error || !offer) throw new Error(error?.message || 'Failed to submit offer')

    // Notify request owner
    const { data: req } = await supabaseAdmin
      .from('job_requests')
      .select('id, user_id')
      .eq('id', data.requestId)
      .single()
    if (req) {
      const { data: ownerProfile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('user_id', req.user_id)
        .maybeSingle()
      if (ownerProfile?.email) {
        await sendTransactionalEmailServer({
          templateName: 'offer-submitted',
          recipientEmail: ownerProfile.email,
          idempotencyKey: `offer-submitted-${offer.id}`,
          templateData: {
            pricePerHour: data.pricePerHour,
            workersCount: data.availableWorkers,
            startDate: data.startDate,
            requestId: req.id,
          },
        })
      }
    }
    return { id: offer.id }
  })

export const withdrawOffer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ offerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const { error } = await supabase
      .from('job_offers')
      .update({ status: 'withdrawn' })
      .eq('id', data.offerId)
      .eq('corporation_id', userId)
      .eq('status', 'submitted')
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const listOffersForRequest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ requestId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context
    const { data: offers, error } = await supabase
      .from('job_offers')
      .select('*')
      .eq('request_id', data.requestId)
      .order('price_per_hour', { ascending: true })
    if (error) throw new Error(error.message)
    return { offers: offers ?? [] }
  })

export const listMyOffers = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context
    const { data: offers, error } = await supabase
      .from('job_offers')
      .select('id, request_id, price_per_hour, available_workers, start_date, status, created_at, updated_at')
      .eq('corporation_id', userId)
      .order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    const reqIds = Array.from(new Set((offers ?? []).map((o) => o.request_id)))
    let requestsById = new Map<string, { location: string; start_date: string; duration: string }>()
    if (reqIds.length > 0) {
      const { data: reqs } = await supabase
        .from('job_requests')
        .select('id, location, start_date, duration')
        .in('id', reqIds)
      requestsById = new Map((reqs ?? []).map((r) => [r.id, { location: r.location, start_date: r.start_date, duration: r.duration }]))
    }
    return {
      offers: (offers ?? []).map((o) => ({ ...o, request: requestsById.get(o.request_id) ?? null })),
    }
  })

export const awardOffer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ offerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context

    // Fetch offer + ensure ownership
    const { data: offer, error: oErr } = await supabase
      .from('job_offers')
      .select('id, request_id, corporation_id, status')
      .eq('id', data.offerId)
      .single()
    if (oErr || !offer) throw new Error('הצעה לא נמצאה')
    if (offer.status !== 'submitted') throw new Error('ההצעה אינה זמינה לבחירה')

    const { data: req, error: rErr } = await supabase
      .from('job_requests')
      .select('id, user_id, location, start_date, contact_name, contact_phone, status')
      .eq('id', offer.request_id)
      .single()
    if (rErr || !req) throw new Error('בקשה לא נמצאה')
    if (req.user_id !== userId) throw new Error('Unauthorized')
    if (req.status !== 'open') throw new Error('הבקשה כבר נסגרה')

    // Insert award (trigger updates statuses)
    const { error: awErr } = await supabase
      .from('job_awards')
      .insert({
        request_id: offer.request_id,
        offer_id: offer.id,
        corporation_id: offer.corporation_id,
        awarded_by: userId,
      })
    if (awErr) throw new Error(awErr.message)

    // Get all corp emails (winner + losers)
    const { data: allOffers } = await supabaseAdmin
      .from('job_offers')
      .select('id, corporation_id, status')
      .eq('request_id', offer.request_id)
    const corpIds = (allOffers ?? []).map((o) => o.corporation_id)
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email')
      .in('user_id', corpIds)
    const emailByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.email] as const))

    await Promise.allSettled(
      (allOffers ?? []).map((o) => {
        const email = emailByUser.get(o.corporation_id)
        if (!email) return null
        if (o.id === offer.id) {
          return sendTransactionalEmailServer({
            templateName: 'offer-awarded',
            recipientEmail: email,
            idempotencyKey: `offer-awarded-${o.id}`,
            templateData: {
              contactName: req.contact_name,
              contactPhone: req.contact_phone,
              location: req.location,
              startDate: req.start_date,
              requestId: req.id,
            },
          })
        }
        return sendTransactionalEmailServer({
          templateName: 'offer-rejected',
          recipientEmail: email,
          idempotencyKey: `offer-rejected-${o.id}`,
        })
      }),
    )

    return { ok: true }
  })