import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EventFilm } from '../components/Film'
import { Missing } from '../components/Missing'
import { RsvpForm } from '../components/RsvpForm'
import { getEvent } from '../lib/storage'
import { useRevision } from '../lib/useRevision'
import type { GatherEvent } from '../types'

export function InvitePage() {
  const { id } = useParams()
  const revision = useRevision()
  const [event, setEvent] = useState<GatherEvent | null | undefined>(undefined)

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
      <RsvpForm event={event} />
    </div>
  )
}
