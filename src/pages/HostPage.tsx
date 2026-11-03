import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EventFacts } from '../components/EventFacts'
import { EventFilm } from '../components/Film'
import { GuestList } from '../components/GuestList'
import { HostReplies } from '../components/HostReplies'
import { Missing } from '../components/Missing'
import { mailLink } from '../lib/mail'
import { useSession } from '../lib/session'
import { attachLocalMedia, deleteEvent, deleteRsvp, getEvent, guestsFor, mailsFor, rsvpsFor } from '../lib/storage'
import { replyList } from '../lib/format'
import { useRevision } from '../lib/useRevision'
import type { GatherEvent, InviteGuest, MailNote, Rsvp } from '../types'

export function HostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const session = useSession()
  const revision = useRevision()
  const [event, setEvent] = useState<GatherEvent | null | undefined>(undefined)
  const [rsvps, setRsvps] = useState<Rsvp[]>([])
  const [guests, setGuests] = useState<InviteGuest[]>([])
  const [mails, setMails] = useState<MailNote[]>([])
  const [copied, setCopied] = useState<'link' | 'list' | null>(null)
  const [confirming, setConfirming] = useState(false)
  const published = useRef('')

  useEffect(() => {
    if (!event?.mediaKind || event.mediaUrl || published.current === event.id) return
    published.current = event.id
    attachLocalMedia(event)
      .then((next) => {
        if (next.mediaUrl) setEvent(next)
      })
      .catch(() => undefined)
  }, [event])

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
    guestsFor(id)
      .then((invited) => {
        if (!cancel) setGuests(invited)
      })
      .catch(() => {
        if (!cancel) setGuests([])
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
        <EventFacts event={event} />
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
        <HostReplies event={event} rsvps={rsvps} guests={guests} onRemove={(replyId) => void deleteRsvp(replyId)} />
        <section className="panel stack">
          <h2>Reply mail</h2>
          <p className="muted">
            {event.hostEmail
              ? `Each reply is emailed to ${event.hostEmail}.`
              : 'Add your email on the invite to get a note each time someone replies.'}
          </p>
          {mails.length === 0 ? (
            <p className="muted">No emails yet.</p>
          ) : (
            mails.map((mail) => (
              <article className="guest-card" key={mail.id}>
                <header>
                  <strong>{mail.subject}</strong>
                  <span>{mail.status === 'sent' ? 'Sent' : 'Not sent'}</span>
                </header>
                <p className="muted">To {mail.to}</p>
                {mail.status !== 'sent' && mail.error ? <p className="muted">{mail.error}</p> : null}
                {mail.status !== 'sent' && (
                  <a className="btn secondary" href={mailLink(mail)}>
                    Open in mail
                  </a>
                )}
              </article>
            ))
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
