import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { GatherEvent, Rsvp } from '../types'
import { foodSum, formatWhen, peopleLabel, plain, trimCounts } from '../lib/format'
import { isEmail, notifyRsvp } from '../lib/mail'
import { guestReply, saveRsvp } from '../lib/storage'

export function RsvpForm({ event }: { event: GatherEvent }) {
  const [name, setName] = useState('')
  const [coming, setComing] = useState(true)
  const [partySize, setPartySize] = useState(1)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [email, setEmail] = useState('')
  const [existingId, setExistingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<Rsvp | null>(null)
  const attendanceLocked = useRef(false)

  async function loadMatch() {
    const guestName = plain(name)
    if (!guestName) return
    try {
      const match = await guestReply(event.id, guestName)
      if (plain(name) !== guestName) return
      if (!match) {
        setExistingId(null)
        return
      }
      setExistingId(match.id)
      if (!attendanceLocked.current) {
        setComing(match.coming)
        setPartySize(match.coming ? match.partySize : 1)
        setCounts(match.foodCounts)
      }
      setNote((current) => plain(current) || plain(match.note))
      setEmail((current) => plain(current) || plain(match.email))
      setError('')
    } catch {
      setError('Your earlier reply could not be loaded.')
    }
  }

  function choose(next: boolean) {
    attendanceLocked.current = true
    setError('')
    setComing(next)
  }

  function changeParty(next: number) {
    attendanceLocked.current = true
    setComing(true)
    setError('')
    const size = Math.min(30, Math.max(1, next))
    setPartySize(size)
    if (event.foods.length === 1) {
      setCounts({ [event.foods[0].id]: size })
      return
    }
    setCounts((current) => trimCounts(current, event.foods, size))
  }

  function changeFood(id: string, next: number) {
    attendanceLocked.current = true
    setComing(true)
    setError('')
    setCounts((current) => {
      const others = foodSum(current) - (current[id] ?? 0)
      const room = Math.max(0, partySize - others)
      return { ...current, [id]: Math.max(0, Math.min(next, room)) }
    })
  }

  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault()
    const guestName = plain(name)
    const guestEmail = plain(email)
    const guestNote = plain(note)
    if (!guestName) {
      setError('Add your name so the host knows who replied.')
      return
    }
    if (guestEmail && !isEmail(guestEmail)) {
      setError('That email does not look complete.')
      return
    }
    if (coming && event.foods.length > 1 && foodSum(counts) !== partySize) {
      const remaining = partySize - foodSum(counts)
      setError(remaining === 1 ? '1 person still needs a dish.' : `${remaining} people still need a dish.`)
      return
    }
    const foodCounts = coming
      ? event.foods.length === 1
        ? { [event.foods[0].id]: partySize }
        : Object.fromEntries(event.foods.map((food) => [food.id, counts[food.id] ?? 0]))
      : {}
    try {
      const rsvp = await saveRsvp({
        eventId: event.id,
        name: guestName,
        coming,
        partySize: coming ? partySize : 0,
        foodCounts,
        note: guestNote,
        email: guestEmail,
      })
      try {
        await notifyRsvp(event, rsvp)
      } catch {
        // The reply is already saved. A mail problem must not block it.
      }
      setSaved(rsvp)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The reply could not be saved.')
    }
  }

  if (saved) {
    const when = formatWhen(event.date, event.time)
    const place = [event.venueName, event.venueAddress].filter(Boolean).join(', ')
    return (
      <section className="panel stack" id="reply" aria-live="polite">
        <p className="film-kicker">Reply saved</p>
        <h2>{saved.coming ? `See you there, ${saved.name}.` : `We'll miss you, ${saved.name}.`}</h2>
        <p className="muted">
          {saved.coming
            ? `${peopleLabel(saved.partySize)} from you.`
            : 'The host has your no.'}
          {' '}The host has your reply.
        </p>
        <div className="facts">
          <p><span>When</span>{when.dateLine} · {when.timeLine}</p>
          <p><span>Where</span>{place || 'Place to come'}</p>
          <p><span>From</span>{event.hostName}</p>
        </div>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setSaved(null)}
        >
          Change reply
        </button>
      </section>
    )
  }

  const assigned = foodSum(counts)
  const singleFood = event.foods.length === 1

  return (
    <form className="panel stack" id="reply" onSubmit={submit}>
      <div>
        <p className="film-kicker">Your reply</p>
        <h2>Are you coming?</h2>
      </div>
      <label className="field">
        <span>Your name</span>
        <input
          value={name}
          onChange={(change) => {
            attendanceLocked.current = false
            setName(change.target.value)
          }}
          onBlur={loadMatch}
          maxLength={60}
          autoComplete="name"
          placeholder="Alex Rivera"
        />
      </label>
      {existingId && <p className="hint">This updates the reply already saved under that name.</p>}
      <div className="choices">
        <button type="button" className="choice" aria-pressed={coming} onClick={() => choose(true)}>
          <strong>I'm coming</strong>
          <small>Tell us how many, and what you'll eat</small>
        </button>
        <button type="button" className="choice" aria-pressed={!coming} onClick={() => choose(false)}>
          <strong>I can't come</strong>
          <small>The host will still see your name</small>
        </button>
      </div>
      {coming && (
        <div className="stack">
          <div className="party-row">
            <div>
              <strong>How many people, including you?</strong>
              <p className="muted">Everyone coming from your side.</p>
            </div>
            <div className="stepper">
              <button type="button" onClick={() => changeParty(partySize - 1)} aria-label="Fewer people">
                −
              </button>
              <span>{partySize}</span>
              <button type="button" onClick={() => changeParty(partySize + 1)} aria-label="More people">
                +
              </button>
            </div>
          </div>
          {singleFood ? (
            <p className="hint">Everyone is down for {event.foods[0].label}.</p>
          ) : (
            <div>
              <p className="hint">
                {assigned === partySize
                  ? 'Every plate is assigned.'
                  : partySize - assigned === 1
                    ? '1 person still needs a dish.'
                    : `${partySize - assigned} people still need a dish.`}
              </p>
              {event.foods.map((food) => (
                <div className="food-row" key={food.id}>
                  <span>{food.label}</span>
                  <div className="stepper">
                    <button
                      type="button"
                      onClick={() => changeFood(food.id, (counts[food.id] ?? 0) - 1)}
                      aria-label={`Fewer ${food.label}`}
                    >
                      −
                    </button>
                    <span>{counts[food.id] ?? 0}</span>
                    <button
                      type="button"
                      onClick={() => changeFood(food.id, (counts[food.id] ?? 0) + 1)}
                      aria-label={`More ${food.label}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <label className="field">
        <span>Email, if you want a confirmation</span>
        <input
          type="email"
          value={email}
          onChange={(change) => setEmail(change.target.value)}
          maxLength={120}
          autoComplete="email"
          placeholder="alex@example.com"
        />
      </label>
      <label className="field">
        <span>Note for the host, if you want</span>
        <textarea value={note} onChange={(change) => setNote(change.target.value)} maxLength={200} rows={3} />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn" type="submit">
        {existingId ? 'Update reply' : 'Send reply'}
      </button>
    </form>
  )
}
