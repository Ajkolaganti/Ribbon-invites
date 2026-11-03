import { apiUrl } from './api'
import { emailHtml } from './emailHtml'
import { foodPhrase, formatWhen, peopleLabel, plain } from './format'
import { replaceMailForRsvp } from './storage'
import { themeById } from '../themes'
import type { GatherEvent, MailNote, Rsvp } from '../types'

function filmPoster(event: GatherEvent, href: string) {
  const theme = themeById(event.artId)
  return {
    src: new URL(theme.image, window.location.origin).href,
    alt: `${event.title} film`,
    href,
    accent: event.accent || theme.accent,
  }
}

export function isEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(plain(value))
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
    const poster = filmPoster(event, hostUrl)
    notes.push({
      id: `${rsvp.id}:host`,
      eventId: event.id,
      rsvpId: rsvp.id,
      kind: 'host',
      to: plain(event.hostEmail),
      subject: `${rsvp.name} replied to ${event.title}`,
      body: `${facts}\n\nSee every reply: ${hostUrl}`,
      html: emailHtml({
        kicker: 'New reply',
        title: event.title,
        intro: replyLine(event, rsvp),
        accent: poster.accent,
        poster,
        rows: [
          { label: 'When', value: `${when.dateLine} · ${when.timeLine}` },
          { label: 'Where', value: place },
        ],
        note: rsvp.note,
        action: { href: hostUrl, label: 'See every reply' },
        footer: 'Ribbon sent this because someone replied to your invite.',
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
    const poster = filmPoster(event, inviteUrl)
    notes.push({
      id: `${rsvp.id}:guest`,
      eventId: event.id,
      rsvpId: rsvp.id,
      kind: 'guest',
      to: plain(rsvp.email),
      subject: `Your reply to ${event.title}`,
      body: `${event.hostName} has your reply to ${event.title}.\n${coming}${note}\n${when.dateLine} · ${when.timeLine}\n${place}\n\nOpen the invite:\n${inviteUrl}`,
      html: emailHtml({
        kicker: 'Reply saved',
        title: event.title,
        intro: `${event.hostName} has your reply. ${coming}`,
        accent: poster.accent,
        poster,
        rows: [
          { label: 'When', value: `${when.dateLine} · ${when.timeLine}` },
          { label: 'Where', value: place },
        ],
        note: rsvp.note,
        action: { href: inviteUrl, label: 'Play the film' },
        footer: 'Ribbon sent this to confirm your reply.',
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
  const poster = filmPoster(event, url)
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
      accent: poster.accent,
      poster,
      rows: [
        { label: 'When', value: `${when.dateLine} · ${when.timeLine}` },
        { label: 'Where', value: place },
      ],
      note: event.message,
      action: { href: url, label: 'Play the film' },
      footer: 'Ribbon sent this because a host added you to an invite.',
    }),
    status: 'failed',
    error: '',
    createdAt: new Date().toISOString(),
  })
}

export async function sendWelcome(name: string, email: string, userId: string) {
  const start = `${window.location.origin}/new`
  return deliver({
    id: `welcome:${userId}`,
    eventId: userId,
    rsvpId: userId,
    kind: 'host',
    to: email,
    subject: 'Welcome to Ribbon',
    body: `${name}, your host account is ready.\n\nYou can email an invite to 20 people free. Plus is $2.99 and raises that to 100.\n\nCreate an invite: ${start}`,
    html: emailHtml({
      kicker: 'Welcome',
      title: `You're in, ${name}.`,
      intro: 'Your host account is ready. Plan a gathering, make the film, and email it to your guests.',
      rows: [
        { label: 'Free', value: 'Email the invite to 20 people' },
        { label: 'Plus', value: '$2.99 once, for 100 people' },
      ],
      action: { href: start, label: 'Create an invite' },
      footer: 'Ribbon sent this because you created a host account.',
    }),
    status: 'failed',
    error: '',
    createdAt: 'welcome',
  })
}

export async function sendInviteCreated(event: GatherEvent) {
  const filmUrl = `${window.location.origin}/i/${event.id}`
  const hostUrl = `${window.location.origin}/event/${event.id}`
  const when = formatWhen(event.date, event.time)
  const place = [event.venueName, event.venueAddress].filter(Boolean).join(', ')
  const poster = filmPoster(event, filmUrl)
  return deliver({
    id: `created:${event.id}`,
    eventId: event.id,
    rsvpId: event.id,
    kind: 'host',
    to: plain(event.hostEmail),
    subject: `Your film for ${event.title} is ready`,
    body: `${event.hostName}, ${event.title} is saved.\n${when.dateLine} · ${when.timeLine}\n${place}\n\nPlay the film: ${filmUrl}\nManage replies: ${hostUrl}`,
    html: emailHtml({
      kicker: 'Invite created',
      title: event.title,
      intro: `${event.hostName}, the film is ready. The picture below is the still. Open it to play the invite.`,
      accent: poster.accent,
      poster,
      rows: [
        { label: 'When', value: `${when.dateLine} · ${when.timeLine}` },
        { label: 'Where', value: place },
      ],
      note: event.message,
      action: { href: filmUrl, label: 'Play the film' },
      secondary: { href: hostUrl, label: 'Manage replies' },
      footer: 'Ribbon sent this because you created an invite.',
    }),
    status: 'failed',
    error: '',
    createdAt: event.createdAt,
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
