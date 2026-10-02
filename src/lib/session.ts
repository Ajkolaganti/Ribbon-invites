import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    let current = true
    supabase.auth.getSession().then(({ data }) => {
      if (current) setSession(data.session)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => {
      current = false
      data.subscription.unsubscribe()
    }
  }, [])

  return session
}

export function accountName(session: Session) {
  const name = session.user.user_metadata.name
  return typeof name === 'string' && name.trim() ? name.trim() : session.user.email ?? 'Host'
}
