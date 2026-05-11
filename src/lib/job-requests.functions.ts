import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getRequest } from '@tanstack/react-start/server'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

const itemSchema = z.object({
  role: z.string().min(1),
  nationality: z.string().min(1),
  count: z.number().int().positive(),
})

const inputSchema = z.object({
  location: z.string().min(1),
  startDate: z.string().min(1),
  duration: z.string().min(1),
  commitmentMonths: z.string().min(1),
  budget: z.string().optional().default(''),
  description: z.string().optional().default(''),
  contactName: z.string().min(1),
  contactPhone: z.string().min(1),
  items: z.array(itemSchema).min(1),
})

export const createJobRequest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context

    const { data: req, error: reqErr } = await supabase
      .from('job_requests')
      .insert({
        user_id: userId,
        location: data.location,
        start_date: data.startDate,
        duration: data.duration,
        commitment_months: data.commitmentMonths,
        budget: data.budget || null,
        description: data.description || null,
        contact_name: data.contactName,
        contact_phone: data.contactPhone,
      })
      .select('id')
      .single()
    if (reqErr || !req) throw new Error(reqErr?.message || 'Failed to create request')

    const itemsPayload = data.items.map((it) => ({
      request_id: req.id,
      role: it.role,
      nationality: it.nationality,
      count: it.count,
    }))
    const { error: itemsErr } = await supabase.from('job_request_items').insert(itemsPayload)
    if (itemsErr) throw new Error(itemsErr.message)

    // Notify all approved corporations (admin client to bypass RLS for cross-user lookup)
    const { data: corps } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, full_name, company_name')
      .eq('verification_status', 'approved')

    let corpUserIds: string[] = []
    if (corps && corps.length > 0) {
      const ids = corps.map((c) => c.user_id)
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'corporation')
        .in('user_id', ids)
      corpUserIds = (roles || []).map((r) => r.user_id)
    }

    const recipients = (corps || []).filter(
      (c) => c.email && corpUserIds.includes(c.user_id),
    )

    const totalWorkers = data.items.reduce((s, it) => s + it.count, 0)
    const categories = Array.from(new Set(data.items.map((i) => i.role))).join(', ')

    const req2 = getRequest()
    const authHeader = req2?.headers.get('authorization') ?? ''
    const origin = req2?.headers.get('origin') || req2?.headers.get('host')
    const baseUrl = process.env.SITE_URL
      || (origin?.startsWith('http') ? origin : origin ? `https://${origin}` : 'https://buildforceprime.com')

    await Promise.allSettled(
      recipients.map((r) =>
        fetch(`${baseUrl}/lovable/email/transactional/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            templateName: 'new-job-request',
            recipientEmail: r.email,
            idempotencyKey: `new-job-request-${req.id}-${r.user_id}`,
            templateData: {
              category: categories,
              workersCount: totalWorkers,
              city: data.location,
              startDate: data.startDate,
              requestId: req.id,
            },
          }),
        }).catch(() => null),
      ),
    )

    return { id: req.id, notified: recipients.length }
  })