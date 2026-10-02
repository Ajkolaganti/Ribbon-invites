import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../lib/session'

export function HostGate({ children }: { children: ReactNode }) {
  const session = useSession()
  const location = useLocation()
  if (session === undefined) return <p className="muted">Checking your account…</p>
  if (!session) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/join?next=${encodeURIComponent(next)}`} replace />
  }
  return children
}
