import type { Motion, Occasion } from './types'

export type Look = 'editorial' | 'canopy' | 'deco' | 'disco' | 'folk' | 'mobile'

export type Theme = {
  id: string
  name: string
  occasion: Occasion
  image: string
  accent: string
  motion: Motion
  tone: 'light' | 'dark'
  align: 'left' | 'center'
  display: string
  look: Look
}

export const occasions: { id: Occasion; label: string; eyebrow: string }[] = [
  { id: 'family', label: 'Family', eyebrow: 'Family gathering' },
  { id: 'birthday', label: 'Birthday', eyebrow: 'A birthday' },
  { id: 'wedding', label: 'Wedding', eyebrow: 'Wedding' },
  { id: 'baby', label: 'Baby shower', eyebrow: 'Baby shower' },
  { id: 'dinner', label: 'Dinner', eyebrow: 'Dinner' },
  { id: 'general', label: 'Anything', eyebrow: "You're invited" },
]

export const motions: { id: Motion; label: string; detail: string }[] = [
  { id: 'drift', label: 'Drift', detail: 'The picture glides' },
  { id: 'rise', label: 'Rise', detail: 'The picture lifts' },
  { id: 'bloom', label: 'Bloom', detail: 'The picture opens outward' },
  { id: 'flicker', label: 'Candle', detail: 'The light wavers' },
]

export const accentSwatches = ['#e23d6a', '#ff5a1f', '#d4b46a', '#1f6b45', '#7aa2d6', '#2c241c', '#c4234a', '#6c4cff']

const foodLabels: Record<Occasion, string[]> = {
  family: ['Home cooking', 'Grill', 'Vegetarian', 'Dessert'],
  birthday: ['Cake', 'Savory', 'Vegetarian', 'Kids plate'],
  wedding: ['Dinner', 'Vegetarian', 'Kids plate', 'Dessert'],
  baby: ['Light bites', 'Sweets', 'Fruit'],
  dinner: ['Main', 'Vegetarian', 'Dessert'],
  general: ['Meal', 'Vegetarian', 'No meal'],
}

export const themes: Theme[] = [
  {
    id: 'family',
    name: 'Hearth',
    occasion: 'family',
    image: '/themes/invite-hearth.jpg',
    accent: '#c45c4a',
    motion: 'drift',
    tone: 'light',
    align: 'center',
    display: "'Fraunces', serif",
    look: 'folk',
  },
  {
    id: 'birthday',
    name: 'Cake',
    occasion: 'birthday',
    image: '/themes/invite-cake.jpg',
    accent: '#e23d6a',
    motion: 'bloom',
    tone: 'light',
    align: 'center',
    display: "'Fraunces', serif",
    look: 'editorial',
  },
  {
    id: 'wedding',
    name: 'Garden',
    occasion: 'wedding',
    image: '/themes/invite-garden.jpg',
    accent: '#c48b8b',
    motion: 'bloom',
    tone: 'light',
    align: 'center',
    display: "'Cormorant Garamond', serif",
    look: 'editorial',
  },
  {
    id: 'baby',
    name: 'Bow',
    occasion: 'baby',
    image: '/themes/invite-bow.jpg',
    accent: '#e7a3b8',
    motion: 'rise',
    tone: 'light',
    align: 'center',
    display: "'Cormorant Garamond', serif",
    look: 'mobile',
  },
  {
    id: 'dinner',
    name: 'Supper',
    occasion: 'dinner',
    image: '/themes/invite-supper.jpg',
    accent: '#d4b46a',
    motion: 'flicker',
    tone: 'dark',
    align: 'center',
    display: "'Cormorant Garamond', serif",
    look: 'deco',
  },
  {
    id: 'general',
    name: 'Card',
    occasion: 'general',
    image: '/themes/invite-card.jpg',
    accent: '#2c241c',
    motion: 'drift',
    tone: 'light',
    align: 'center',
    display: "'Instrument Serif', serif",
    look: 'editorial',
  },
  {
    id: 'picnic',
    name: 'Picnic',
    occasion: 'family',
    image: '/themes/invite-picnic.jpg',
    accent: '#c4234a',
    motion: 'drift',
    tone: 'light',
    align: 'center',
    display: "'Fraunces', serif",
    look: 'editorial',
  },
  {
    id: 'balloons',
    name: 'Balloons',
    occasion: 'birthday',
    image: '/themes/invite-balloons.jpg',
    accent: '#ff4d8d',
    motion: 'rise',
    tone: 'light',
    align: 'center',
    display: "'Syne', sans-serif",
    look: 'disco',
  },
  {
    id: 'foil',
    name: 'Foil',
    occasion: 'wedding',
    image: '/themes/invite-foil.jpg',
    accent: '#d4b46a',
    motion: 'rise',
    tone: 'dark',
    align: 'center',
    display: "'Cormorant Garamond', serif",
    look: 'deco',
  },
  {
    id: 'sprig',
    name: 'Sprig',
    occasion: 'baby',
    image: '/themes/invite-sprig.jpg',
    accent: '#7a9a78',
    motion: 'bloom',
    tone: 'light',
    align: 'center',
    display: "'Cormorant Garamond', serif",
    look: 'editorial',
  },
  {
    id: 'linen',
    name: 'Linen',
    occasion: 'dinner',
    image: '/themes/invite-linen.jpg',
    accent: '#a3563a',
    motion: 'drift',
    tone: 'light',
    align: 'left',
    display: "'Cormorant Garamond', serif",
    look: 'editorial',
  },
  {
    id: 'seal',
    name: 'Seal',
    occasion: 'general',
    image: '/themes/invite-seal.jpg',
    accent: '#8d2f39',
    motion: 'rise',
    tone: 'light',
    align: 'center',
    display: "'Cormorant Garamond', serif",
    look: 'editorial',
  },
]

const retiredThemes: Record<string, string> = {
  arch: 'wedding',
  gazette: 'general',
  scribble: 'birthday',
  scallop: 'family',
  vellum: 'baby',
  nocturne: 'dinner',
}

export function themeById(id: string) {
  const resolved = retiredThemes[id] ?? id
  return themes.find((theme) => theme.id === resolved) ?? themes[0]
}

export function themeForOccasion(occasion: Occasion) {
  return themes.find((theme) => theme.occasion === occasion) ?? themes[0]
}

export function eyebrowFor(occasion: Occasion) {
  return occasions.find((item) => item.id === occasion)?.eyebrow ?? "You're invited"
}

export function defaultFoods(occasion: Occasion) {
  return foodLabels[occasion].map((label) => ({
    id: crypto.randomUUID(),
    label,
  }))
}

export function placeholderMessage(occasion: Occasion) {
  switch (occasion) {
    case 'wedding':
      return 'Dinner, dancing, and a seat with your name on it.'
    case 'birthday':
      return 'Come celebrate. Cake is not optional.'
    case 'baby':
      return 'Help us welcome the newest person at the table.'
    case 'dinner':
      return 'A long table, a slow meal, no reason to rush.'
    case 'family':
      return 'The same table as always. Come hungry.'
    default:
      return 'We would love to see you there.'
  }
}
