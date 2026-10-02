import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pricing } from '../components/Pricing'
import { formatWhen, peopleLabel, summarize } from '../lib/format'
import { useStoredMedia } from '../lib/media'
import { accountName, useSession } from '../lib/session'
import { loadEvents, rsvpsFor } from '../lib/storage'
import { useRevision } from '../lib/useRevision'
import { themeById } from '../themes'
import type { GatherEvent } from '../types'

export function HomePage() {
  const session = useSession()
  if (session === undefined) return <p className="muted">Loading…</p>
  if (!session) return <Marketing />
  return <Dashboard hostId={session.user.id} name={accountName(session)} />
}

function Marketing() {
  return (
    <div className="product">
      <section className="hero">
        <p className="film-kicker">Ribbon</p>
        <h1>Invites that play like a short film.</h1>
        <p className="lede">
          Set one place, one time, and the menu. Guests open a link, say if they are coming, and choose what they will eat.
        </p>
        <div className="row">
          <Link className="btn" to="/join">
            Create a host account
          </Link>
          <Link className="btn secondary" to="/pricing">
            See pricing
          </Link>
        </div>
      </section>
      <section className="steps">
        <article className="panel stack">
          <p className="film-kicker">01</p>
          <h2>Plan it</h2>
          <p className="muted">Pick an occasion, write the details, and choose a film.</p>
        </article>
        <article className="panel stack">
          <p className="film-kicker">02</p>
          <h2>Send it</h2>
          <p className="muted">Email the invite to 20 people free, or 100 on Plus.</p>
        </article>
        <article className="panel stack">
          <p className="film-kicker">03</p>
          <h2>See replies</h2>
          <p className="muted">Headcount, dishes, and notes land in your account.</p>
        </article>
      </section>
      <Pricing />
    </div>
  )
}

function Dashboard({ hostId, name }: { hostId: string; name: string }) {
  const revision = useRevision()
  const [events, setEvents] = useState<{ event: GatherEvent; people: number; declined: number; replies: number }[] | undefined>(
    undefined,
  )

  useEffect(() => {
    let cancel = false
    loadEvents(hostId)
      .then(async (list) => {
        const cards = await Promise.all(
          list.map(async (event) => {
            const stats = summarize(await rsvpsFor(event.id))
            return { event, people: stats.people, declined: stats.declined, replies: stats.replies }
          }),
        )
        if (!cancel) {
          setEvents(cards.sort((a, b) => a.event.date.localeCompare(b.event.date) || b.event.createdAt.localeCompare(a.event.createdAt)))
        }
      })
      .catch(() => {
        if (!cancel) setEvents([])
      })
    return () => {
      cancel = true
    }
  }, [hostId, revision])

  return (
    <div className="stack loose">
      <section className="split-head">
        <div>
          <p className="film-kicker">Your invites</p>
          <h1>{name}</h1>
        </div>
        <Link className="btn" to="/new">
          New invite
        </Link>
      </section>
      {events === undefined ? (
        <p className="muted">Loading invites…</p>
      ) : events.length === 0 ? (
        <article className="panel">
          <p className="muted">No invites yet. Create one, then email it to your guests.</p>
        </article>
      ) : (
        <div className="event-list">
          {events.map(({ event, people, declined, replies }) => {
            const when = formatWhen(event.date, event.time)
            return (
              <Link className="event-card" key={event.id} to={`/event/${event.id}`}>
                <EventThumb event={event} />
                <span>
                  <strong>{event.title}</strong>
                  <span className="muted">
                    {when.dateLine} · {when.timeLine}
                  </span>
                  <span className="muted">
                    {replies === 0 ? 'No replies yet' : `${peopleLabel(people)} coming · ${declined} can't`}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EventThumb({ event }: { event: GatherEvent }) {
  const theme = themeById(event.artId)
  const stored = useStoredMedia(event.mediaKind === 'image' ? event.id : undefined)
  const image = stored?.url ?? theme.image
  return (
    <span
      className="event-thumb"
      style={{ backgroundImage: `url(${image})`, backgroundColor: event.accent }}
      aria-hidden
    />
  )
}
