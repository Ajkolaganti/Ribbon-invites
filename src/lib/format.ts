import type { FoodOption, GatherEvent, Rsvp } from '../types'

export function plain(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function plusDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function formatWhen(date: string, time: string) {
  if (!date) {
    return { dateLine: 'Date to come', timeLine: time ? formatTime(time) : 'Time to come' }
  }
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = (time || '00:00').split(':').map(Number)
  const value = new Date(year, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0)
  if (Number.isNaN(value.getTime())) {
    return { dateLine: date, timeLine: time }
  }
  return {
    dateLine: value.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    timeLine: value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  }
}

function formatTime(time: string) {
  const [hour, minute] = time.split(':').map(Number)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time
  const value = new Date()
  value.setHours(hour, minute, 0, 0)
  return value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function peopleLabel(count: number) {
  return `${count} ${count === 1 ? 'person' : 'people'}`
}

export function foodSum(counts: Record<string, number>) {
  return Object.values(counts).reduce((total, count) => total + count, 0)
}

export function summarize(rsvps: Rsvp[]) {
  const coming = rsvps.filter((rsvp) => rsvp.coming)
  const declined = rsvps.filter((rsvp) => !rsvp.coming)
  const people = coming.reduce((total, rsvp) => total + rsvp.partySize, 0)
  return { replies: rsvps.length, coming: coming.length, declined: declined.length, people }
}

export function foodTotals(rsvps: Rsvp[], foods: FoodOption[]) {
  const totals = new Map<string, number>()
  for (const food of foods) totals.set(food.id, 0)
  for (const rsvp of rsvps) {
    if (!rsvp.coming) continue
    for (const [id, count] of Object.entries(rsvp.foodCounts)) {
      totals.set(id, (totals.get(id) ?? 0) + count)
    }
  }
  return totals
}

export function foodPhrase(foods: FoodOption[], counts: Record<string, number>) {
  return foods
    .map((food) => {
      const count = counts[food.id] ?? 0
      return count > 0 ? `${food.label} ${count}` : ''
    })
    .filter(Boolean)
    .join(', ')
}

export function replyList(event: GatherEvent, rsvps: Rsvp[]) {
  const when = formatWhen(event.date, event.time)
  const coming = rsvps.filter((rsvp) => rsvp.coming)
  const declined = rsvps.filter((rsvp) => !rsvp.coming)
  const lines = [event.title, `${when.dateLine} · ${when.timeLine}`, event.venueName]
  if (event.venueAddress) lines.push(event.venueAddress)
  lines.push('', 'Coming')
  if (coming.length === 0) lines.push('—')
  for (const rsvp of coming) {
    const foods = foodPhrase(event.foods, rsvp.foodCounts)
    const note = rsvp.note ? ` — ${rsvp.note}` : ''
    lines.push(`- ${rsvp.name} — ${peopleLabel(rsvp.partySize)}${foods ? ` — ${foods}` : ''}${note}`)
  }
  lines.push('', "Can't come")
  if (declined.length === 0) lines.push('—')
  for (const rsvp of declined) {
    lines.push(`- ${rsvp.name}${rsvp.note ? ` — ${rsvp.note}` : ''}`)
  }
  const totals = foodTotals(rsvps, event.foods)
  const people = coming.reduce((total, rsvp) => total + rsvp.partySize, 0)
  lines.push('', `${peopleLabel(people)} coming`)
  for (const food of event.foods) {
    lines.push(`${food.label}: ${totals.get(food.id) ?? 0}`)
  }
  return lines.filter((line) => line !== undefined).join('\n')
}

export function trimCounts(counts: Record<string, number>, foods: FoodOption[], size: number) {
  const next = { ...counts }
  let total = foodSum(next)
  for (let index = foods.length - 1; index >= 0 && total > size; index -= 1) {
    const id = foods[index].id
    const count = next[id] ?? 0
    const cut = Math.min(count, total - size)
    next[id] = count - cut
    total -= cut
  }
  return next
}
