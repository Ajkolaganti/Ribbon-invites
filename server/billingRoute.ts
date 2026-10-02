import type { IncomingMessage, ServerResponse } from 'node:http'
import { frontendOrigin, readBody, sendJson } from './http.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function authedUser(req: IncomingMessage, url: string, anon: string) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: header, apikey: anon },
  })
  if (!response.ok) return null
  const user = (await response.json()) as { id?: string; email?: string }
  if (!user.id || !UUID.test(user.id)) return null
  return { id: user.id, email: typeof user.email === 'string' ? user.email : '' }
}

async function currentPlan(url: string, service: string, userId: string) {
  const response = await fetch(`${url}/rest/v1/profiles?id=eq.${userId}&select=plan`, {
    headers: { apikey: service, Authorization: `Bearer ${service}` },
  })
  if (!response.ok) return 'free'
  const rows = (await response.json()) as { plan?: string }[]
  return rows[0]?.plan === 'plus' ? 'plus' : 'free'
}

async function markPlus(url: string, service: string, userId: string) {
  const headers = {
    apikey: service,
    Authorization: `Bearer ${service}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
  const patched = await fetch(`${url}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ plan: 'plus' }),
  })
  const rows = patched.ok ? ((await patched.json()) as unknown[]) : []
  if (Array.isArray(rows) && rows.length > 0) return
  const created = await fetch(`${url}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: userId, plan: 'plus' }),
  })
  if (!created.ok) throw new Error('The plan could not be saved.')
}

export async function handleBilling(req: IncomingMessage, res: ServerResponse) {
  const path = req.url?.split('?')[0]
  if (path !== '/api/checkout' && path !== '/api/checkout/confirm') return false
  if (req.method !== 'POST') {
    sendJson(res, 405, { message: 'Use POST.' })
    return true
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim()
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim()
  const anon = process.env.VITE_SUPABASE_ANON_KEY?.trim()
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!stripeKey) {
    sendJson(res, 503, { message: 'Add STRIPE_SECRET_KEY to the .env file to turn on checkout.' })
    return true
  }
  if (!supabaseUrl || !anon || !service) {
    sendJson(res, 503, { message: 'The account service is not configured.' })
    return true
  }

  const user = await authedUser(req, supabaseUrl, anon)
  if (!user) {
    sendJson(res, 401, { message: 'Sign in before upgrading.' })
    return true
  }

  if (path === '/api/checkout') {
    if ((await currentPlan(supabaseUrl, service, user.id)) === 'plus') {
      sendJson(res, 409, { message: 'This account already includes 100 people.' })
      return true
    }
    const origin = frontendOrigin(req)
    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`)
    params.set('cancel_url', `${origin}/pricing`)
    params.set('client_reference_id', user.id)
    params.set('metadata[user_id]', user.id)
    if (user.email) params.set('customer_email', user.email)
    params.set('line_items[0][quantity]', '1')
    params.set('line_items[0][price_data][currency]', 'usd')
    params.set('line_items[0][price_data][unit_amount]', '299')
    params.set('line_items[0][price_data][product_data][name]', 'Ribbon Plus')
    params.set('line_items[0][price_data][product_data][description]', 'Email the invite to 100 people')
    try {
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      })
      const session = (await response.json()) as { url?: string; error?: { message?: string } }
      if (!response.ok || !session.url) {
        sendJson(res, 502, { message: session.error?.message || 'Stripe could not start checkout.' })
        return true
      }
      sendJson(res, 200, { url: session.url })
    } catch {
      sendJson(res, 502, { message: 'Stripe could not be reached.' })
    }
    return true
  }

  let payload: { sessionId?: unknown }
  try {
    payload = JSON.parse(await readBody(req, 8_000)) as typeof payload
  } catch {
    sendJson(res, 400, { message: 'The payment could not be read.' })
    return true
  }
  if (typeof payload.sessionId !== 'string' || !/^cs_[A-Za-z0-9_]+$/.test(payload.sessionId)) {
    sendJson(res, 400, { message: 'That payment session is not valid.' })
    return true
  }

  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${payload.sessionId}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    })
    const session = (await response.json()) as {
      payment_status?: string
      client_reference_id?: string
      metadata?: { user_id?: string }
      error?: { message?: string }
    }
    if (!response.ok) {
      sendJson(res, 502, { message: session.error?.message || 'Stripe could not confirm the payment.' })
      return true
    }
    const owner = session.metadata?.user_id || session.client_reference_id
    if (owner !== user.id || session.payment_status !== 'paid') {
      sendJson(res, 402, { message: 'That payment is not complete for this account.' })
      return true
    }
    await markPlus(supabaseUrl, service, user.id)
    sendJson(res, 200, { plan: 'plus' })
  } catch {
    sendJson(res, 502, { message: 'The upgrade could not be saved.' })
  }
  return true
}
