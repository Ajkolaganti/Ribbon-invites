import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EventFilm } from '../components/Film'
import { GuestList } from '../components/GuestList'
import { Missing } from '../components/Missing'
import { foodPhrase, foodTotals, formatWhen, peopleLabel, replyList, summarize } from '../lib/format'
import { mailLink } from '../lib/mail'
import { useSession } from '../lib/session'
import { deleteEvent, deleteRsvp, getEvent, mailsFor, rsvpsFor } from '../lib/storage'
import { useRevision } from '../lib/useRevision'
import type { GatherEvent, MailNote, Rsvp } from '../types'

export function HostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const session = useSession()
  const revision = useRevision()
  const [event, setEvent] = useState<GatherEvent | null | undefined>(undefined)
  const [rsvps, setRsvps] = useState<Rsvp[]>([])
  const [mails, setMails] = useState<MailNote[]>([])
  const [copied, setCopied] = useState<'link' | 'list' | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancel = false
    Promise.all([getEvent(id), rsvpsFor(id), mailsFor(id)])
      .then(([next, replies, notes]) => {
        if (cancel) return
        setEvent(next)
        setRsvps(replies)
        setMails(notes)
      })
      .catch(() => {
        if (!cancel) setEvent(null)
      })
    return () => {
      cancel = true
    }
  }, [id, revision])

  useEffect(() => {
    if (event) document.title = `${event.title} · Ribbon`
  }, [event])

  if (session === undefined || event === undefined) return <p className="muted">Opening the invite…</p>
  if (!event || !session || event.hostId !== session.user.id) {
    return (
      <Missing
        title="This invite isn't in your account."
        body="It may have been deleted, or it belongs to another host."
      />
    )
  }

  const when = formatWhen(event.date, event.time)
  const stats = summarize(rsvps)
  const totals = foodTotals(rsvps, event.foods)
  const maxFood = Math.max(1, ...event.foods.map((food) => totals.get(food.id) ?? 0))
  const url = `${window.location.origin}/i/${event.id}`

  async function copy(value: string, kind: 'link' | 'list') {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div className="host-layout">
      <div className="sticky">
        <EventFilm event={event} audience="host" />
      </div>
      <div className="stack loose">
        <div>
          <p className="film-kicker">{when.dateLine}</p>
          <h1>{event.title}</h1>
          <p className="muted">
            {when.timeLine} · {event.venueName}
            {event.venueAddress ? ` · ${event.venueAddress}` : ''}
          </p>
        </div>
        <section className="panel stack">
          <h2>Share</h2>
          <p className="muted">
            Anyone with this link can watch the film and reply. Emailing people from the list below counts toward your plan.
          </p>
          <input readOnly value={url} aria-label="Invite link" onFocus={(focus) => focus.currentTarget.select()} />
          <div className="row">
            <button type="button" className="btn" onClick={() => copy(url, 'link')}>
              {copied === 'link' ? 'Copied' : 'Copy link'}
            </button>
            <button type="button" className="btn secondary" onClick={() => copy(replyList(event, rsvps), 'list')}>
              {copied === 'list' ? 'List copied' : 'Copy guest list'}
            </button>
            <Link className="btn secondary" to={`/event/${event.id}/edit`}>
              Edit
            </Link>
          </div>
        </section>
        <GuestList event={event} />
        <section className="stack">
          <h2>Reply mail</h2>
          <p className="muted">
            {event.hostEmail
              ? `Each reply is emailed to ${event.hostEmail} through Resend.`
              : 'Add your email on the invite to get a note each time someone replies.'}
          </p>
          {mails.length === 0 ? (
            <p className="muted">No emails yet.</p>
          ) : (
            mails.map((mail) => (
              <article className="reply" key={mail.id}>
                <div>
                  <strong>{mail.subject}</strong>
                  <p className="muted">To {mail.to}</p>
                  <p>{mail.body}</p>
                  <p className="muted">{mail.status === 'sent' ? 'Sent' : mail.error || 'Not sent.'}</p>
                </div>
                {mail.status !== 'sent' && (
                  <a className="btn secondary" href={mailLink(mail)}>
                    Open in mail
                  </a>
                )}
              </article>
            ))
          )}
        </section>
        <section className="stack">
          <h2>Who's coming</h2>
          <div className="stats">
            <div>
              <strong>{stats.people}</strong>
              <span>people</span>
            </div>
            <div>
              <strong>{stats.coming}</strong>
              <span>coming</span>
            </div>
            <div>
              <strong>{stats.declined}</strong>
              <span>can't</span>
            </div>
            <div>
              <strong>{stats.replies}</strong>
              <span>replies</span>
            </div>
          </div>
          <div className="stack">
            {event.foods.map((food) => {
              const count = totals.get(food.id) ?? 0
              return (
                <div key={food.id}>
                  <div className="food-total-top">
                    <span>{food.label}</span>
                    <span>{count}</span>
                  </div>
                  <div className="bar" aria-hidden>
                    <span style={{ width: `${(count / maxFood) * 100}%`, background: event.accent }} />
                  </div>
                </div>
              )
            })}
          </div>
          {rsvps.length === 0 ? (
            <p className="muted">Replies show up here after someone opens the invite.</p>
          ) : (
            <div className="stack">
              {rsvps.map((rsvp) => (
                <article className="reply" key={rsvp.id}>
                  <div>
                    <strong>{rsvp.name}</strong>
                    <p className="muted">
                      {rsvp.coming ? peopleLabel(rsvp.partySize) : "Can't come"}
                      {rsvp.coming && foodPhrase(event.foods, rsvp.foodCounts)
                        ? ` · ${foodPhrase(event.foods, rsvp.foodCounts)}`
                        : ''}
                    </p>
                    {rsvp.note && <p>{rsvp.note}</p>}
                  </div>
                  <button type="button" className="btn secondary" onClick={() => void deleteRsvp(rsvp.id)}>
                    Remove
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
        {confirming ? (
          <div className="row">
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                void deleteEvent(event.id).then(() => navigate('/'))
              }}
            >
              Delete invite
            </button>
            <button type="button" className="btn secondary" onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </div>
        ) : (
          <button type="button" className="btn danger" onClick={() => setConfirming(true)}>
            Delete this invite
          </button>
        )}
      </div>
    </div>
  )
}
