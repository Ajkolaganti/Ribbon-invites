import { foodTotals, peopleLabel, repliedWhen, summarize } from '../lib/format'
import type { GatherEvent, InviteGuest, Rsvp } from '../types'

function samePerson(guest: InviteGuest, rsvp: Rsvp) {
  const email = guest.email.trim().toLowerCase()
  const name = guest.name.trim().toLowerCase()
  return (email !== '' && rsvp.email.trim().toLowerCase() === email) || rsvp.name.trim().toLowerCase() === name
}

export function HostReplies({
  event,
  rsvps,
  guests,
  onRemove,
}: {
  event: GatherEvent
  rsvps: Rsvp[]
  guests: InviteGuest[]
  onRemove: (id: string) => void
}) {
  const stats = summarize(rsvps)
  const totals = foodTotals(rsvps, event.foods)
  const plates = event.foods.reduce((sum, food) => sum + (totals.get(food.id) ?? 0), 0)
  const coming = rsvps.filter((rsvp) => rsvp.coming)
  const declined = rsvps.filter((rsvp) => !rsvp.coming)
  const waiting = guests.filter((guest) => !rsvps.some((rsvp) => samePerson(guest, rsvp)))
  const notes = rsvps.filter((rsvp) => rsvp.note.trim()).length

  return (
    <>
      <section className="panel stack">
        <div>
          <h2>The count</h2>
          <p className="muted">
            {stats.people === 0
              ? 'No one has said yes yet.'
              : `${peopleLabel(stats.people)} across ${stats.coming} ${stats.coming === 1 ? 'party' : 'parties'}.`}
            {notes > 0 ? ` ${notes} ${notes === 1 ? 'note' : 'notes'}.` : ''}
          </p>
        </div>
        <div className="stats">
          <div>
            <strong>{stats.people}</strong>
            <span>people coming</span>
          </div>
          <div>
            <strong>{stats.coming}</strong>
            <span>parties</span>
          </div>
          <div>
            <strong>{stats.declined}</strong>
            <span>can't come</span>
          </div>
          <div>
            <strong>{guests.length > 0 ? waiting.length : stats.replies}</strong>
            <span>{guests.length > 0 ? 'no reply yet' : 'replies'}</span>
          </div>
        </div>
        <div className="stack">
          <p className="film-kicker">Food</p>
          {event.foods.length === 0 ? (
            <p className="muted">No dishes on this invite.</p>
          ) : (
            event.foods.map((food) => {
              const count = totals.get(food.id) ?? 0
              return (
                <div key={food.id}>
                  <div className="food-total-top">
                    <span>{food.label}</span>
                    <strong>{peopleLabel(count)}</strong>
                  </div>
                  <div className="bar" aria-hidden>
                    <span style={{ width: `${Math.min(100, stats.people === 0 ? 0 : (count / stats.people) * 100)}%`, background: event.accent }} />
                  </div>
                </div>
              )
            })
          )}
          {stats.people > 0 && (
            <p className="muted">
              {plates === stats.people
                ? `${plates} ${plates === 1 ? 'plate is' : 'plates are'} assigned.`
                : `${plates} of ${stats.people} plates assigned.`}
            </p>
          )}
        </div>
      </section>

      <section className="panel stack">
        <h2>Coming</h2>
        {coming.length === 0 ? (
          <p className="muted">No yeses yet.</p>
        ) : (
          coming.map((rsvp) => <ReplyCard key={rsvp.id} event={event} rsvp={rsvp} onRemove={onRemove} />)
        )}
      </section>

      <section className="panel stack">
        <h2>Can't come</h2>
        {declined.length === 0 ? (
          <p className="muted">No one has declined.</p>
        ) : (
          declined.map((rsvp) => <ReplyCard key={rsvp.id} event={event} rsvp={rsvp} onRemove={onRemove} />)
        )}
      </section>

      {guests.length > 0 && (
        <section className="panel stack">
          <h2>Still waiting</h2>
          {waiting.length === 0 ? (
            <p className="muted">Everyone you emailed has replied.</p>
          ) : (
            waiting.map((guest) => (
              <article className="guest-card" key={guest.id}>
                <header>
                  <strong>{guest.name}</strong>
                  <span className="muted">{guest.sentAt ? 'Invite sent' : 'Not sent yet'}</span>
                </header>
                <p className="muted">{guest.email}</p>
              </article>
            ))
          )}
        </section>
      )}
    </>
  )
}

function ReplyCard({
  event,
  rsvp,
  onRemove,
}: {
  event: GatherEvent
  rsvp: Rsvp
  onRemove: (id: string) => void
}) {
  const dishes = event.foods
    .map((food) => ({ label: food.label, count: rsvp.foodCounts[food.id] ?? 0 }))
    .filter((dish) => dish.count > 0)
  const when = repliedWhen(rsvp.updatedAt)

  return (
    <article className="guest-card">
      <header>
        <strong>{rsvp.name}</strong>
        <span>{rsvp.coming ? peopleLabel(rsvp.partySize) : "Can't come"}</span>
      </header>
      {rsvp.coming && (
        dishes.length > 0 ? (
          <ul className="plate-list">
            {dishes.map((dish) => (
              <li key={dish.label}>
                {dish.label} {dish.count}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No dishes chosen.</p>
        )
      )}
      {rsvp.note.trim() ? <p>{rsvp.note}</p> : null}
      <p className="muted">
        {[rsvp.email.trim(), when && `Replied ${when}`].filter(Boolean).join(' · ') || 'No email'}
      </p>
      <button type="button" className="btn secondary" onClick={() => onRemove(rsvp.id)}>
        Remove
      </button>
    </article>
  )
}
