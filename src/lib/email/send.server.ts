import { getRequest } from '@tanstack/react-start/server'

// Hardcoded allowlist of trusted base URLs for the internal email endpoint.
// SSRF-safe: never derived from request headers (Origin/Host could be spoofed
// to exfiltrate the caller's Authorization JWT).
const ALLOWED_BASE_URLS = [
  'https://buildforceprime.com',
  'https://www.buildforceprime.com',
  'https://project--2bcb68ec-eafd-47db-806c-3c3a3144f33e.lovable.app',
  'https://id-preview--2bcb68ec-eafd-47db-806c-3c3a3144f33e.lovable.app',
]

function resolveBaseUrl(): string {
  const fromEnv = process.env.SITE_URL
  if (fromEnv && ALLOWED_BASE_URLS.includes(fromEnv)) return fromEnv
  return ALLOWED_BASE_URLS[0]
}

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
  const baseUrl = resolveBaseUrl()

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