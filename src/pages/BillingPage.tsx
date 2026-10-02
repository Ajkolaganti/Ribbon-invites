import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmCheckout } from '../lib/billing'
import { useSession } from '../lib/session'

export function BillingPage() {
  const session = useSession()
  const [params] = useSearchParams()
  const sessionId = params.get('session_id') ?? ''
  const [status, setStatus] = useState<'working' | 'done' | 'failed'>('working')
  const [error, setError] = useState('')

  useEffect(() => {
    if (session === undefined) return
    if (!session) {
      setStatus('failed')
      setError('Sign in to finish the upgrade.')
      return
    }
    if (!sessionId) {
      setStatus('failed')
      setError('Stripe did not return a payment.')
      return
    }
    let cancel = false
    confirmCheckout(sessionId)
      .then((plus) => {
        if (cancel) return
        setStatus(plus ? 'done' : 'failed')
        if (!plus) setError('The payment was not applied.')
      })
      .catch((cause) => {
        if (cancel) return
        setStatus('failed')
        setError(cause instanceof Error ? cause.message : 'The upgrade could not be confirmed.')
      })
    return () => {
      cancel = true
    }
  }, [session, sessionId])

  return (
    <section className="panel stack account-card">
      <p className="film-kicker">Plus</p>
      <h1>{status === 'done' ? 'You can invite 100 people.' : status === 'working' ? 'Confirming payment…' : 'The upgrade did not finish.'}</h1>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Link className="btn" to="/">
        Back to invites
      </Link>
    </section>
  )
}
