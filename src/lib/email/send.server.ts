import { getRequest } from '@tanstack/react-start/server'

interface ServerSendParams {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, unknown>
}

/**
 * Server-side helper to enqueue a transactional email.
 * Reuses the caller's Authorization header (any authenticated user is allowed
 * to enqueue — the send route validates auth, the queue handles delivery).
 */
export async function sendTransactionalEmailServer(params: ServerSendParams) {
  const req = getRequest()
  const authHeader = req?.headers.get('authorization') ?? ''
  const origin = req?.headers.get('origin') || req?.headers.get('host')
  const baseUrl = process.env.SITE_URL
    || (origin?.startsWith('http') ? origin : origin ? `https://${origin}` : 'https://buildforceprime.com')

  const res = await fetch(`${baseUrl}/lovable/email/transactional/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      templateName: params.templateName,
      recipientEmail: params.recipientEmail,
      idempotencyKey: params.idempotencyKey,
      templateData: params.templateData,
    }),
  }).catch(() => null)
  return res?.ok ?? false
}