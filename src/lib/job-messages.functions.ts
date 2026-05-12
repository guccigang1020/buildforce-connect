import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

/**
 * Anti-circumvention filter — blocks contact details in pre-award messages.
 * Detects: phone numbers (Israeli + international), emails, common social handles.
 * Returns a reason string when blocked, or null when clean.
 */
function detectContactInfo(text: string): string | null {
  const normalized = text.replace(/[\s\-_.()]/g, '')
  // Email
  if (/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/.test(text)) {
    return 'נראה שההודעה כוללת כתובת אימייל. אסור לשתף פרטי קשר ישירים לפני בחירת הזוכה.'
  }
  // Phone — 9 to 15 digits in a row after stripping separators
  if (/(?:\+?\d{9,15})/.test(normalized)) {
    return 'נראה שההודעה כוללת מספר טלפון. אסור לשתף פרטי קשר ישירים לפני בחירת הזוכה.'
  }
  // Common platform handles & URLs
  if (/(whatsapp|wa\.me|telegram|t\.me|instagram|facebook|messenger|signal|viber|@[a-z0-9_]{3,}|https?:\/\/)/i.test(text)) {
    return 'נראה שההודעה כוללת קישור או שם משתמש חיצוני. תקשורת לפני זכייה חייבת להישאר בפלטפורמה.'
  }
  return null
}

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

    // Block contact details until an award exists for this request.
    const { data: award } = await supabase
      .from('job_awards')
      .select('id')
      .eq('request_id', data.requestId)
      .maybeSingle()
    if (!award) {
      const violation = detectContactInfo(data.body)
      if (violation) {
        throw new Error(violation + ' פעולה זו מתועדת ועלולה להוביל להשעיה ולקנס לפי תנאי השימוש.')
      }
    }

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