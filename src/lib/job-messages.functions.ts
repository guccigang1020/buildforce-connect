import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export const sendJobMessage = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      requestId: z.string().uuid(),
      corporationId: z.string().uuid(),
      body: z.string().min(1).max(4000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const { data: msg, error } = await supabase
      .from('job_request_messages')
      .insert({
        request_id: data.requestId,
        corporation_id: data.corporationId,
        sender_id: userId,
        body: data.body,
      })
      .select('id, created_at')
      .single()
    if (error || !msg) throw new Error(error?.message || 'Failed to send message')
    return { id: msg.id, createdAt: msg.created_at }
  })

export const listJobMessages = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      requestId: z.string().uuid(),
      corporationId: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context
    const { data: messages, error } = await supabase
      .from('job_request_messages')
      .select('*')
      .eq('request_id', data.requestId)
      .eq('corporation_id', data.corporationId)
      .order('created_at', { ascending: true })
      .limit(500)
    if (error) throw new Error(error.message)
    return { messages: messages ?? [] }
  })