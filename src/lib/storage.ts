import type { Allowance, FoodOption, GatherEvent, InviteGuest, MailNote, MediaKind, Motion, Occasion, Rsvp } from '../types'
import { deleteMedia } from './media'
import { supabase } from './supabase'

type EventRow = {
  id: string
  host_id: string
  occasion: Occasion
  title: string
  host_name: string
  message: string
  line: string
  event_date: string
  event_time: string
  venue_name: string
  venue_address: string
  foods: FoodOption[]
  art_id: string
  motion: Motion
  accent: string
  custom: boolean
  host_email: string
  media_kind: MediaKind | null
  media_name: string
  created_at: string
  updated_at: string
}

type RsvpRow = {
  id: string
  event_id: string
  name: string
  coming: boolean
  party_size: number
  food_counts: Record<string, number>
  note: string
  email: string
  created_at: string
  updated_at: string
}

type MailRow = {
  id: string
  event_id: string
  rsvp_id: string
  kind: 'host' | 'guest'
  recipient: string
  subject: string
  body: string
  status: 'sent' | 'failed'
  error: string
  created_at: string
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function clock(value: string) {
  return value.length >= 5 ? value.slice(0, 5) : value
}

function eventFrom(row: EventRow): GatherEvent {
  return {
    id: row.id,
    hostId: row.host_id,
    occasion: row.occasion,
    title: row.title,
    hostName: row.host_name,
    message: row.message,
    line: row.line,
    date: row.event_date,
    time: clock(row.event_time),
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    foods: row.foods ?? [],
    artId: row.art_id,
    motion: row.motion,
    accent: row.accent,
    custom: row.custom,
    hostEmail: row.host_email,
    mediaKind: row.media_kind,
    mediaName: row.media_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function eventTo(event: GatherEvent, hostId: string) {
  return {
    id: event.id,
    host_id: hostId,
    occasion: event.occasion,
    title: event.title,
    host_name: event.hostName,
    message: event.message,
    line: event.line,
    event_date: event.date,
    event_time: event.time,
    venue_name: event.venueName,
    venue_address: event.venueAddress,
    foods: event.foods,
    art_id: event.artId,
    motion: event.motion,
    accent: event.accent,
    custom: event.custom,
    host_email: event.hostEmail,
    media_kind: event.mediaKind,
    media_name: event.mediaName,
    created_at: event.createdAt,
    updated_at: event.updatedAt,
  }
}

function rsvpFrom(row: RsvpRow): Rsvp {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    coming: row.coming,
    partySize: row.party_size,
    foodCounts: row.food_counts ?? {},
    note: row.note,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mailFrom(row: MailRow): MailNote {
  return {
    id: row.id,
    eventId: row.event_id,
    rsvpId: row.rsvp_id,
    kind: row.kind,
    to: row.recipient,
    subject: row.subject,
    body: row.body,
    status: row.status === 'sent' ? 'sent' : 'failed',
    error: row.error,
    createdAt: row.created_at,
  }
}

function changed() {
  window.dispatchEvent(new Event('ribbon:changed'))
}

export async function loadEvents(hostId: string) {
  const result = await supabase
    .from('ribbon_events')
    .select('*')
    .eq('host_id', hostId)
    .order('event_date', { ascending: true })
  fail(result.error)
  return ((result.data ?? []) as EventRow[]).map(eventFrom)
}

export async function getEvent(id: string) {
  const result = await supabase.from('ribbon_events').select('*').eq('id', id).maybeSingle()
  fail(result.error)
  return result.data ? eventFrom(result.data as EventRow) : null
}

export async function saveEvent(event: GatherEvent) {
  const session = await supabase.auth.getSession()
  const hostId = session.data.session?.user.id
  if (!hostId) throw new Error('Sign in before saving an invite.')
  const result = await supabase.from('ribbon_events').upsert(eventTo(event, hostId))
  fail(result.error)
  changed()
}

export async function deleteEvent(id: string) {
  const result = await supabase.from('ribbon_events').delete().eq('id', id)
  fail(result.error)
  changed()
  void deleteMedia(id)
}

export async function rsvpsFor(eventId: string) {
  const result = await supabase
    .from('ribbon_rsvps')
    .select('*')
    .eq('event_id', eventId)
    .order('updated_at', { ascending: false })
  fail(result.error)
  return ((result.data ?? []) as RsvpRow[]).map(rsvpFrom)
}

export async function guestReply(eventId: string, name: string) {
  const result = await supabase.rpc('ribbon_guest_reply', { p_event_id: eventId, p_name: name })
  fail(result.error)
  return result.data ? rsvpFrom(result.data as RsvpRow) : null
}

export async function saveRsvp(rsvp: Omit<Rsvp, 'id' | 'createdAt' | 'updatedAt'>) {
  const result = await supabase.rpc('save_ribbon_rsvp', {
    p_event_id: rsvp.eventId,
    p_name: rsvp.name,
    p_coming: rsvp.coming,
    p_party_size: rsvp.partySize,
    p_food_counts: rsvp.foodCounts,
    p_note: rsvp.note,
    p_email: rsvp.email,
  })
  fail(result.error)
  if (!result.data) throw new Error('The reply could not be saved.')
  changed()
  return rsvpFrom(result.data as RsvpRow)
}

export async function deleteRsvp(id: string) {
  const result = await supabase.from('ribbon_rsvps').delete().eq('id', id)
  fail(result.error)
  changed()
}

export async function mailsFor(eventId: string) {
  const result = await supabase
    .from('ribbon_mails')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  fail(result.error)
  return ((result.data ?? []) as MailRow[]).map(mailFrom)
}

type GuestRow = {
  id: string
  event_id: string
  name: string
  email: string
  sent_at: string | null
}

function guestFrom(row: GuestRow): InviteGuest {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    email: row.email,
    sentAt: row.sent_at,
  }
}

export async function guestAllowance(): Promise<Allowance> {
  const result = await supabase.rpc('ribbon_guest_allowance')
  fail(result.error)
  const data = result.data as { plan?: string; used?: number; limit?: number }
  return {
    plan: data.plan === 'plus' ? 'plus' : 'free',
    used: Number(data.used ?? 0),
    limit: Number(data.limit ?? 20),
  }
}

export async function guestsFor(eventId: string) {
  const result = await supabase
    .from('ribbon_guests')
    .select('id, event_id, name, email, sent_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
  fail(result.error)
  return ((result.data ?? []) as GuestRow[]).map(guestFrom)
}

export async function addGuest(eventId: string, name: string, email: string) {
  const result = await supabase.rpc('add_ribbon_guest', {
    p_event_id: eventId,
    p_name: name,
    p_email: email,
  })
  fail(result.error)
  if (!result.data) throw new Error('That person could not be added.')
  changed()
  return guestFrom(result.data as GuestRow)
}

export async function removeGuest(id: string) {
  const result = await supabase.from('ribbon_guests').delete().eq('id', id)
  fail(result.error)
  changed()
}

export async function markGuestSent(id: string) {
  const result = await supabase.from('ribbon_guests').update({ sent_at: new Date().toISOString() }).eq('id', id)
  fail(result.error)
  changed()
}

export async function replaceMailForRsvp(rsvpId: string, notes: MailNote[]) {
  for (const note of notes) {
    const result = await supabase.rpc('record_ribbon_mail', {
      p_id: note.id,
      p_event_id: note.eventId,
      p_rsvp_id: rsvpId,
      p_kind: note.kind,
      p_recipient: note.to,
      p_subject: note.subject,
      p_body: note.body,
      p_status: note.status,
      p_error: note.error,
    })
    fail(result.error)
  }
  changed()
}
