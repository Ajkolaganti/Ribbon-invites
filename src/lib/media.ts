import { useEffect, useState } from 'react'
import type { MediaKind } from '../types'
import { supabase } from './supabase'

const DB_NAME = 'ribbon-media'
const STORE = 'files'

export type MediaRecord = {
  kind: MediaKind
  blob: Blob
  name: string
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function saveMedia(eventId: string, file: File) {
  const kind: MediaKind = file.type.startsWith('video/') ? 'video' : 'image'
  const record: MediaRecord = { kind, blob: file, name: file.name }
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put(record, eventId)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

export function loadMedia(eventId: string) {
  return openDb().then(
    (db) =>
      new Promise<MediaRecord | null>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const request = tx.objectStore(STORE).get(eventId)
        request.onsuccess = () => resolve((request.result as MediaRecord | undefined) ?? null)
        request.onerror = () => reject(request.error)
      }),
  )
}

export async function uploadInviteMedia(eventId: string, file: Blob, contentType: string) {
  const { error } = await supabase.storage.from('ribbon-media').upload(eventId, file, {
    upsert: true,
    contentType: contentType || 'application/octet-stream',
    cacheControl: '3600',
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('ribbon-media').getPublicUrl(eventId)
  return `${data.publicUrl}?v=${Date.now()}`
}

export async function removeInviteMedia(eventId: string) {
  const { error } = await supabase.storage.from('ribbon-media').remove([eventId])
  if (error && !/not found/i.test(error.message)) throw new Error(error.message)
}

export function deleteMedia(eventId: string) {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).delete(eventId)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

export function useStoredMedia(eventId?: string) {
  const [media, setMedia] = useState<{ url: string; kind: MediaKind; name: string } | null>(null)

  useEffect(() => {
    if (!eventId) {
      setMedia(null)
      return
    }
    let cancelled = false
    let objectUrl = ''
    loadMedia(eventId)
      .then((record) => {
        if (cancelled || !record) return
        objectUrl = URL.createObjectURL(record.blob)
        setMedia({ url: objectUrl, kind: record.kind, name: record.name })
      })
      .catch(() => {
        if (!cancelled) setMedia(null)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [eventId])

  return eventId ? media : null
}
