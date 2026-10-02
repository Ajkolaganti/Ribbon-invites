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
    name: 'Folk',
    occasion: 'family',
    image: '/themes/theme-folk.jpg',
    accent: '#e23d6a',
    motion: 'drift',
    tone: 'light',
    align: 'left',
    display: "'Fraunces', serif",
    look: 'folk',
  },
  {
    id: 'birthday',
    name: 'Disco',
    occasion: 'birthday',
    image: '/themes/theme-disco.jpg',
    accent: '#ff4d8d',
    motion: 'bloom',
    tone: 'light',
    align: 'center',
    display: "'Syne', sans-serif",
    look: 'disco',
  },
  {
    id: 'wedding',
    name: 'Canopy',
    occasion: 'wedding',
    image: '/themes/theme-canopy.jpg',
    accent: '#d4b46a',
    motion: 'bloom',
    tone: 'dark',
    align: 'center',
    display: "'Cormorant Garamond', serif",
    look: 'canopy',
  },
  {
    id: 'baby',
    name: 'Mobile',
    occasion: 'baby',
    image: '/themes/theme-mobile.jpg',
    accent: '#7aa2d6',
    motion: 'rise',
    tone: 'light',
    align: 'center',
    display: "'Cormorant Garamond', serif",
    look: 'mobile',
  },
  {
    id: 'dinner',
    name: 'Deco',
    occasion: 'dinner',
    image: '/themes/theme-deco.jpg',
    accent: '#d4b46a',
    motion: 'rise',
    tone: 'dark',
    align: 'center',
    display: "'Cormorant Garamond', serif",
    look: 'deco',
  },
  {
    id: 'general',
    name: 'Masthead',
    occasion: 'general',
    image: '/themes/theme-masthead.jpg',
    accent: '#2c241c',
    motion: 'drift',
    tone: 'light',
    align: 'left',
    display: "'Instrument Serif', serif",
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
