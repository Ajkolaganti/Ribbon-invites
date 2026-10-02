import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { emailInvite, isEmail } from '../lib/mail'
import { addGuest, guestAllowance, guestsFor, markGuestSent, removeGuest } from '../lib/storage'
import { useRevision } from '../lib/useRevision'
import type { Allowance, GatherEvent, InviteGuest } from '../types'

export function GuestList({ event }: { event: GatherEvent }) {
  const revision = useRevision()
  const [guests, setGuests] = useState<InviteGuest[]>([])
  const [allowance, setAllowance] = useState<Allowance | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancel = false
    guestsFor(event.id)
      .then((people) => {
        if (!cancel) setGuests(people)
      })
      .catch((cause) => {
        if (!cancel) setError(cause instanceof Error ? cause.message : 'The guest list could not be loaded.')
      })
    guestAllowance()
      .then((plan) => {
        if (!cancel) setAllowance(plan)
      })
      .catch((cause) => {
        if (!cancel) setError(cause instanceof Error ? cause.message : 'The plan could not be loaded.')
      })
    return () => {
      cancel = true
    }
  }, [event.id, revision])

  const used = allowance?.used ?? guests.length
  const limit = allowance?.limit ?? 20
  const full = used >= limit
  const waiting = guests.filter((guest) => !guest.sentAt)

  async function add(formEvent: FormEvent) {
    formEvent.preventDefault()
    if (!name.trim()) {
      setError('Add their name.')
      return
    }
    if (!isEmail(email)) {
      setError('That email does not look complete.')
      return
    }
    setPending(true)
    setError('')
    setNotice('')
    try {
      await addGuest(event.id, name.trim(), email.trim())
      setName('')
      setEmail('')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'That person could not be added.'
      setError(message.includes('PLAN_LIMIT') ? `The ${allowance?.plan === 'plus' ? 'Plus' : 'free'} plan is full.` : message)
    } finally {
      setPending(false)
    }
  }

  async function sendWaiting() {
    setPending(true)
    setError('')
    setNotice('')
    let sent = 0
    let failed = ''
    for (const guest of waiting) {
      const note = await emailInvite(event, guest)
      if (note.status === 'sent') {
        await markGuestSent(guest.id)
        sent += 1
      } else {
        failed = note.error || 'The email was not sent.'
      }
    }
    setNotice(failed ? `${sent} sent. ${failed}` : sent === 1 ? 'The invite was sent.' : `Sent to ${sent} people.`)
    setPending(false)
  }

  return (
    <section className="panel stack">
      <div className="split-head">
        <div>
          <h2>Send the invite</h2>
          <p className="muted">
            {allowance?.plan === 'plus' ? 'Plus' : 'Free'} · {used} of {limit} people
          </p>
        </div>
        {allowance?.plan !== 'plus' && (
          <Link className="btn secondary" to="/pricing">
            Upgrade
          </Link>
        )}
      </div>
      <div className="meter" aria-hidden>
        <span style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
      </div>
      <form className="guest-add" onSubmit={add}>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(change) => setName(change.target.value)} maxLength={80} placeholder="Alex Rivera" />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(change) => setEmail(change.target.value)}
            maxLength={120}
            placeholder="alex@example.com"
          />
        </label>
        <button className="btn" type="submit" disabled={pending || full}>
          {full ? 'Plan is full' : 'Add person'}
        </button>
      </form>
      {full && allowance?.plan !== 'plus' && (
        <p className="muted">
          Twenty people are included. <Link to="/pricing">Plus is $2.99</Link> and raises the list to 100.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error.includes('plan is full') ? (
            <>
              {error} <Link to="/pricing">See Plus</Link>
            </>
          ) : (
            error
          )}
        </p>
      )}
      {guests.length === 0 ? (
        <p className="muted">No one is on the list yet.</p>
      ) : (
        <div>
          {guests.map((guest) => (
            <div className="guest-row" key={guest.id}>
              <div>
                <strong>{guest.name}</strong>
                <p className="muted">
                  {guest.email} · {guest.sentAt ? 'Sent' : 'Not sent'}
                </p>
              </div>
              <button className="btn secondary" type="button" onClick={() => void removeGuest(guest.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="row">
        <button className="btn" type="button" onClick={sendWaiting} disabled={pending || waiting.length === 0}>
          {waiting.length === 0 ? 'Everyone has the invite' : `Send to ${waiting.length}`}
        </button>
      </div>
      {notice && <p className="muted">{notice}</p>}
    </section>
  )
}
