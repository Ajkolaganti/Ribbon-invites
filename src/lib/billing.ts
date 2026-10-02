import { apiUrl } from './api'
import { supabase } from './supabase'

async function authorized(path: string, body?: unknown) {
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token
  if (!token) throw new Error('Sign in before upgrading.')
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = (await response.json().catch(() => ({}))) as { url?: string; message?: string; plan?: string }
  if (!response.ok) throw new Error(result.message || 'Checkout could not start.')
  return result
}

export async function startCheckout() {
  const result = await authorized(apiUrl('/api/checkout'))
  if (!result.url) throw new Error('Stripe did not return a checkout page.')
  window.location.assign(result.url)
}

export async function confirmCheckout(sessionId: string) {
  const result = await authorized(apiUrl('/api/checkout/confirm'), { sessionId })
  return result.plan === 'plus'
}
