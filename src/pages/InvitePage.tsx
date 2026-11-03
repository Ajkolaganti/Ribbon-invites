import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EventFacts } from '../components/EventFacts'
import { EventFilm } from '../components/Film'
import { Missing } from '../components/Missing'
import { RsvpForm } from '../components/RsvpForm'
import { attachLocalMedia, getEvent } from '../lib/storage'
import { useRevision } from '../lib/useRevision'
import type { GatherEvent } from '../types'

export function InvitePage() {
  const { id } = useParams()
  const revision = useRevision()
  const [event, setEvent] = useState<GatherEvent | null | undefined>(undefined)
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
    getEvent(id)
      .then((next) => {
        if (!cancel) setEvent(next)
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

  if (event === undefined) return <p className="muted">Opening the invite…</p>
  if (!event) {
    return (
      <Missing
        title="This invite isn't available."
        body="Ask the host for a new link. The invite may have been removed."
      />
    )
  }

  return (
    <div className="invite-layout">
      <div>
        <EventFilm event={event} autoPlay audience="guest" heading />
        <a className="btn secondary jump" href="#reply">
          Reply
        </a>
      </div>
      <div className="stack">
        <EventFacts event={event} />
        <RsvpForm event={event} />
      </div>
    </div>
  )
}
