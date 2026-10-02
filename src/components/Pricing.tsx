import { useState } from 'react'
import { Link } from 'react-router-dom'
import { startCheckout } from '../lib/billing'
import { useSession } from '../lib/session'

export function Pricing() {
  const session = useSession()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function upgrade() {
    setPending(true)
    setError('')
    try {
      await startCheckout()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Checkout could not start.')
      setPending(false)
    }
  }

  return (
    <section className="stack" id="pricing">
      <div>
        <p className="film-kicker">Pricing</p>
        <h2>Twenty people free. A hundred for $2.99.</h2>
        <p className="lede">Each email address counts once, across every invite on the account. Replies on a shared link do not use a seat.</p>
      </div>
      <div className="price-grid">
        <article className="price-card">
          <p className="film-kicker">Free</p>
          <p className="price">$0</p>
          <p>Email the invite to 20 people.</p>
          <ul>
            <li>Host account and unlimited invites</li>
            <li>Animated films and RSVP</li>
            <li>Reply emails through Resend</li>
          </ul>
          {session ? (
            <Link className="btn secondary" to="/new">
              Create an invite
            </Link>
          ) : (
            <Link className="btn secondary" to="/join">
              Create a free account
            </Link>
          )}
        </article>
        <article className="price-card featured">
          <p className="film-kicker">Plus</p>
          <p className="price">$2.99</p>
          <p>One payment. The account can email 100 people.</p>
          <ul>
            <li>Everything in Free</li>
            <li>80 more people on your list</li>
            <li>Paid once in Stripe Checkout</li>
          </ul>
          {session ? (
            <button className="btn" type="button" onClick={upgrade} disabled={pending}>
              {pending ? 'Opening Stripe…' : 'Upgrade for $2.99'}
            </button>
          ) : (
            <Link className="btn" to="/join?next=%2Fpricing">
              Create an account to upgrade
            </Link>
          )}
        </article>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
