import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { assertAdmin, fetchAdminDashboardData } from '@/lib/admin.server'

export const adminGetDashboardData = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId)
    return fetchAdminDashboardData()
  })

export const adminSetVerificationStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        profileId: z.string().uuid(),
        status: z.enum(['approved', 'rejected']),
        notes: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId)
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        verification_status: data.status,
        is_verified: data.status === 'approved',
        admin_notes: data.notes || null,
      })
      .eq('id', data.profileId)
    if (error) throw new Error(error.message)

    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      actor_id: context.userId,
      action: `admin.verification_${data.status}`,
      entity_type: 'profile',
      entity_id: data.profileId,
      metadata: { notes: data.notes ?? null },
    })
    if (auditError) throw new Error(auditError.message)

    return { ok: true }
  })

export const adminToggleRole = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        role: z.enum(['corporation', 'admin']),
        action: z.enum(['add', 'remove']),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId)
    if (data.action === 'remove') {
      const { error } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', data.targetUserId)
        .eq('role', data.role)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: data.targetUserId, role: data.role })
      if (error && !/duplicate/i.test(error.message)) throw new Error(error.message)
    }

    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      actor_id: context.userId,
      action: `admin.role_${data.action}`,
      entity_type: 'user_role',
      entity_id: data.targetUserId,
      metadata: { role: data.role },
    })
    if (auditError) throw new Error(auditError.message)

    return { ok: true }
  })

export const adminGetDocumentUrl = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ path: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId)
    const { data: signed, error } = await supabaseAdmin.storage
      .from('contractor-docs')
      .createSignedUrl(data.path, 60 * 60)
    if (error) throw new Error(error.message)
    return { url: signed?.signedUrl ?? null }
  })