export function apiUrl(path: string) {
  let base = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '')
  if (base && !/^https?:\/\//i.test(base)) base = `https://${base}`
  return `${base}${path}`
}
