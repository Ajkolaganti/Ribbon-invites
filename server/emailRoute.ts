import type { IncomingMessage, ServerResponse } from 'node:http'
import { readBody, sendJson } from './http.ts'

const FROM_FALLBACK = 'Ribbon <onboarding@resend.dev>'

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export async function handleEmail(req: IncomingMessage, res: ServerResponse) {
  const path = req.url?.split('?')[0]
  if (path !== '/api/email') return false
  if (req.method !== 'POST') {
    sendJson(res, 405, { message: 'Use POST.' })
    return true
  }

  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    sendJson(res, 503, { message: 'Add RESEND_API_KEY to a .env file in the project.' })
    return true
  }

  let payload: { to?: unknown; subject?: unknown; text?: unknown; html?: unknown; idempotencyKey?: unknown }
  try {
    payload = JSON.parse(await readBody(req, 100_000)) as typeof payload
  } catch {
    sendJson(res, 400, { message: 'The email could not be read.' })
    return true
  }

  if (!isEmail(payload.to) || typeof payload.subject !== 'string' || typeof payload.text !== 'string') {
    sendJson(res, 400, { message: 'The email is missing a recipient, subject, or message.' })
    return true
  }

  const from = process.env.RESEND_FROM?.trim() || FROM_FALLBACK
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
  if (typeof payload.idempotencyKey === 'string' && payload.idempotencyKey.length > 0 && payload.idempotencyKey.length <= 256) {
    headers['Idempotency-Key'] = payload.idempotencyKey
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from,
        to: [payload.to.trim()],
        subject: payload.subject.slice(0, 200),
        text: payload.text.slice(0, 8000),
        ...(typeof payload.html === 'string' && payload.html.trim() ? { html: payload.html.slice(0, 80_000) } : {}),
      }),
    })
    const result = (await response.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!response.ok) {
      sendJson(res, response.status, { message: result.message || 'Resend did not send the email.' })
      return true
    }
    sendJson(res, 200, { id: result.id ?? '' })
  } catch {
    sendJson(res, 502, { message: 'Resend could not be reached.' })
  }
  return true
}
