import { apiUrl } from './api'
import { emailHtml } from './emailHtml'
import { foodPhrase, formatWhen, peopleLabel } from './format'
import { replaceMailForRsvp } from './storage'
import type { GatherEvent, MailNote, Rsvp } from '../types'

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function mailLink(note: MailNote) {
  return `mailto:${encodeURIComponent(note.to)}?subject=${encodeURIComponent(note.subject)}&body=${encodeURIComponent(note.body)}`
}

function replyLine(event: GatherEvent, rsvp: Rsvp) {
  if (!rsvp.coming) return `${rsvp.name} can't come.`
  const foods = foodPhrase(event.foods, rsvp.foodCounts)
  const plates = foods ? ` ${foods}.` : ''
  return `${rsvp.name} is coming with ${peopleLabel(rsvp.partySize)}.${plates}`
}

export async function notifyRsvp(event: GatherEvent, rsvp: Rsvp) {
  const when = formatWhen(event.date, event.time)
  const place = [event.venueName, event.venueAddress].filter(Boolean).join(', ')
  const note = rsvp.note ? `\n${rsvp.note}` : ''
  const facts = `${replyLine(event, rsvp)}${note}\n${when.dateLine} · ${when.timeLine}\n${place}`
  const now = new Date().toISOString()
  const notes: Array<MailNote & { html: string }> = []

  if (isEmail(event.hostEmail)) {
    const hostUrl = `${window.location.origin}/event/${event.id}`
    notes.push({
      id: `${rsvp.id}:host`,
      eventId: event.id,
      rsvpId: rsvp.id,
      kind: 'host',
      to: event.hostEmail.trim(),
      subject: `${rsvp.name} replied to ${event.title}`,
      body: `${facts}\n\nSee every reply: ${hostUrl}`,
      html: emailHtml({
        kicker: 'New reply',
        title: event.title,
        intro: replyLine(event, rsvp),
        rows: [
          { label: 'When', value: `${when.dateLine} · ${when.timeLine}` },
          { label: 'Where', value: place },
        ],
        note: rsvp.note,
        action: { href: hostUrl, label: 'See every reply' },
      }),
      status: 'failed',
      error: '',
      createdAt: now,
    })
  }

  if (isEmail(rsvp.email)) {
    const coming = rsvp.coming
      ? `You're coming with ${peopleLabel(rsvp.partySize)}.`
      : "You're marked as unable to come."
    const inviteUrl = `${window.location.origin}/i/${event.id}`
    notes.push({
      id: `${rsvp.id}:guest`,
      eventId: event.id,
      rsvpId: rsvp.id,
      kind: 'guest',
      to: rsvp.email.trim(),
      subject: `Your reply to ${event.title}`,
      body: `${event.hostName} has your reply to ${event.title}.\n${coming}${note}\n${when.dateLine} · ${when.timeLine}\n${place}\n\nOpen the invite:\n${inviteUrl}`,
      html: emailHtml({
        kicker: 'Reply saved',
        title: event.title,
        intro: `${event.hostName} has your reply. ${coming}`,
        rows: [
          { label: 'When', value: `${when.dateLine} · ${when.timeLine}` },
          { label: 'Where', value: place },
        ],
        note: rsvp.note,
        action: { href: inviteUrl, label: 'Open the invite' },
      }),
      status: 'failed',
      error: '',
      createdAt: now,
    })
  }

  const sent = await Promise.all(notes.map(deliver))
  await replaceMailForRsvp(rsvp.id, sent)
  return sent
}

export async function emailInvite(event: GatherEvent, guest: { id: string; name: string; email: string }) {
  const when = formatWhen(event.date, event.time)
  const place = [event.venueName, event.venueAddress].filter(Boolean).join(', ')
  const url = `${window.location.origin}/i/${event.id}`
  return deliver({
    id: `${guest.id}:invite`,
    eventId: event.id,
    rsvpId: guest.id,
    kind: 'guest',
    to: guest.email,
    subject: `${event.hostName} invited you to ${event.title}`,
    body: `${guest.name},\n\n${event.hostName} invited you to ${event.title}.\n${when.dateLine} · ${when.timeLine}\n${place}\n\nOpen your invite and reply:\n${url}`,
    html: emailHtml({
      kicker: "You're invited",
      title: event.title,
      intro: `${event.hostName} invited you, ${guest.name}.`,
      rows: [
        { label: 'When', value: `${when.dateLine} · ${when.timeLine}` },
        { label: 'Where', value: place },
      ],
      note: event.message,
      action: { href: url, label: 'Open the invite' },
    }),
    status: 'failed',
    error: '',
    createdAt: new Date().toISOString(),
  })
}

async function deliver(note: MailNote & { html?: string }): Promise<MailNote> {
  try {
    const response = await fetch(apiUrl('/api/email'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        to: note.to,
        subject: note.subject,
        text: note.body,
        html: note.html,
        idempotencyKey: `${note.id}:${note.createdAt}`,
      }),
    })
    const result = (await response.json().catch(() => ({}))) as { message?: string }
    if (!response.ok) {
      return { ...note, status: 'failed', error: result.message || 'Resend did not send the email.' }
    }
    return { ...note, status: 'sent', error: '' }
  } catch {
    return { ...note, status: 'failed', error: 'Resend could not be reached.' }
  }
}
