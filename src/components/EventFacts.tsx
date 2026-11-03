import type { GatherEvent } from '../types'
import { formatWhen } from '../lib/format'
import { eyebrowFor } from '../themes'

export function EventFacts({ event }: { event: GatherEvent }) {
  const when = formatWhen(event.date, event.time)
  const place = [event.venueName, event.venueAddress].filter(Boolean).join(', ')
  return (
    <section className="panel stack" aria-label="Event details">
      <p className="film-kicker">{eyebrowFor(event.occasion)}</p>
      <h2>{event.title}</h2>
      <div className="facts">
        <p><span>When</span>{when.dateLine} · {when.timeLine}</p>
        <p><span>Where</span>{place || 'Place to come'}</p>
        <p><span>From</span>{event.hostName}</p>
      </div>
      {event.message.trim() ? <p>{event.message}</p> : null}
    </section>
  )
}
