import { useEffect, useState } from 'react'

export function useRevision() {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const bump = () => setRevision((value) => value + 1)
    window.addEventListener('storage', bump)
    window.addEventListener('ribbon:changed', bump)
    return () => {
      window.removeEventListener('storage', bump)
      window.removeEventListener('ribbon:changed', bump)
    }
  }, [])
  return revision
}
