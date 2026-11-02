export type Occasion = 'family' | 'birthday' | 'wedding' | 'baby' | 'dinner' | 'general'

export type Motion = 'drift' | 'rise' | 'bloom' | 'flicker'

export type MediaKind = 'image' | 'video'

export type FoodOption = {
  id: string
  label: string
}

export type FilmModel = {
  occasion: Occasion
  title: string
  hostName: string
  message: string
  line: string
  date: string
  time: string
  venueName: string
  venueAddress: string
  artId: string
  motion: Motion
  accent: string
}

export type Plan = 'free' | 'plus'

export type Allowance = {
  plan: Plan
  used: number
  limit: number
}

export type InviteGuest = {
  id: string
  eventId: string
  name: string
  email: string
  sentAt: string | null
}

export type GatherEvent = FilmModel & {
  id: string
  hostId: string
  foods: FoodOption[]
  custom: boolean
  hostEmail: string
  mediaKind: MediaKind | null
  mediaName: string
  mediaUrl: string
  createdAt: string
  updatedAt: string
}

export type Rsvp = {
  id: string
  eventId: string
  name: string
  coming: boolean
  partySize: number
  foodCounts: Record<string, number>
  note: string
  email: string
  createdAt: string
  updatedAt: string
}

export type MailNote = {
  id: string
  eventId: string
  rsvpId: string
  kind: 'host' | 'guest'
  to: string
  subject: string
  body: string
  status: 'sent' | 'failed'
  error: string
  createdAt: string
}
