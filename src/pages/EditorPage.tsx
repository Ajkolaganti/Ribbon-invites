import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Film } from '../components/Film'
import { Missing } from '../components/Missing'
import { plusDays } from '../lib/format'
import { isEmail, notifyRsvp, sendInviteCreated } from '../lib/mail'
import { deleteMedia, loadMedia, saveMedia } from '../lib/media'
import { accountName, useSession } from '../lib/session'
import { getEvent, rsvpsFor, saveEvent } from '../lib/storage'
import {
  accentSwatches,
  defaultFoods,
  motions,
  occasions,
  themeForOccasion,
  themes,
} from '../themes'
import type { FoodOption, GatherEvent, MediaKind, Motion, Occasion } from '../types'

type Draft = {
  occasion: Occasion
  title: string
  hostName: string
  message: string
  line: string
  date: string
  time: string
  venueName: string
  venueAddress: string
  foods: FoodOption[]
  artId: string
  motion: Motion
  accent: string
  custom: boolean
  hostEmail: string
}

function blankDraft(hostName: string, hostEmail: string): Draft {
  const theme = themeForOccasion('family')
  return {
    occasion: 'family',
    title: '',
    hostName,
    message: '',
    line: '',
    date: plusDays(14),
    time: '18:00',
    venueName: '',
    venueAddress: '',
    foods: defaultFoods('family'),
    artId: theme.id,
    motion: theme.motion,
    accent: theme.accent,
    custom: false,
    hostEmail,
  }
}

function fromEvent(event: GatherEvent): Draft {
  return {
    occasion: event.occasion,
    title: event.title,
    hostName: event.hostName,
    message: event.message,
    line: event.line,
    date: event.date,
    time: event.time,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    foods: event.foods,
    artId: event.artId,
    motion: event.motion,
    accent: event.accent,
    custom: event.custom,
    hostEmail: event.hostEmail ?? '',
  }
}

export function EditorPage() {
  const { id } = useParams()
  const session = useSession()
  const [existing, setExisting] = useState<GatherEvent | null | undefined>(id ? undefined : null)

  useEffect(() => {
    if (!id) return
    let cancel = false
    getEvent(id)
      .then((event) => {
        if (!cancel) setExisting(event)
      })
      .catch(() => {
        if (!cancel) setExisting(null)
      })
    return () => {
      cancel = true
    }
  }, [id])

  if (session === undefined || existing === undefined) return <p className="muted">Opening the invite…</p>
  if (!session) return null
  if (id && (!existing || existing.hostId !== session.user.id)) {
    return (
      <Missing
        title="This invite isn't in your account."
        body="It may have been deleted, or it belongs to another host."
      />
    )
  }
  return (
    <EditorForm
      key={id ?? 'new'}
      existing={existing ?? undefined}
      hostName={accountName(session)}
      hostEmail={session.user.email ?? ''}
      hostId={session.user.id}
    />
  )
}

function EditorForm({
  existing,
  hostName,
  hostEmail,
  hostId,
}: {
  existing?: GatherEvent
  hostName: string
  hostEmail: string
  hostId: string
}) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Draft>(() => (existing ? fromEvent(existing) : blankDraft(hostName, hostEmail)))
  const [foodsTouched, setFoodsTouched] = useState(Boolean(existing))
  const [error, setError] = useState('')
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaKind, setMediaKind] = useState<MediaKind | null>(existing?.mediaKind ?? null)
  const [mediaName, setMediaName] = useState(existing?.mediaName ?? '')
  const [dropMedia, setDropMedia] = useState(false)
  const fileRef = useRef<File | null>(null)
  const mediaTouched = useRef(false)

  useEffect(() => {
    if (!existing?.id || !existing.mediaKind) return
    let cancelled = false
    let objectUrl = ''
    loadMedia(existing.id)
      .then((record) => {
        if (cancelled || mediaTouched.current || !record) return
        objectUrl = URL.createObjectURL(record.blob)
        setMediaUrl(objectUrl)
        setMediaKind(record.kind)
        setMediaName(record.name)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [existing?.id, existing?.mediaKind])

  useEffect(() => {
    document.title = existing ? 'Edit invite · Ribbon' : 'New invite · Ribbon'
  }, [existing])

  function patch(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }))
  }

  function chooseOccasion(occasion: Occasion) {
    const theme = themeForOccasion(occasion)
    setDraft((current) => ({
      ...current,
      occasion,
      foods: foodsTouched ? current.foods : defaultFoods(occasion),
      ...(current.custom
        ? {}
        : { artId: theme.id, motion: theme.motion, accent: theme.accent }),
    }))
  }

  function clearMedia() {
    mediaTouched.current = true
    if (mediaUrl) URL.revokeObjectURL(mediaUrl)
    fileRef.current = null
    setMediaUrl(null)
    setMediaKind(null)
    setMediaName('')
    setDropMedia(true)
  }

  function onUpload(file: File | undefined) {
    if (!file) return
    mediaTouched.current = true
    const kind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : null
    if (!kind) {
      setError('Choose a picture or a video.')
      return
    }
    const limit = kind === 'video' ? 50 * 1024 * 1024 : 8 * 1024 * 1024
    if (file.size > limit) {
      setError(kind === 'video' ? 'Videos need to be under 50 MB.' : 'Pictures need to be under 8 MB.')
      return
    }
    if (mediaUrl) URL.revokeObjectURL(mediaUrl)
    fileRef.current = file
    setDropMedia(false)
    setMediaKind(kind)
    setMediaName(file.name)
    setMediaUrl(URL.createObjectURL(file))
    setError('')
    patch({ custom: true })
  }

  function chooseTheme(themeId: string) {
    const theme = themes.find((item) => item.id === themeId) ?? themes[0]
    setDraft((current) => ({
      ...current,
      custom: false,
      occasion: theme.occasion,
      artId: theme.id,
      motion: theme.motion,
      accent: theme.accent,
      line: '',
      foods: foodsTouched ? current.foods : defaultFoods(theme.occasion),
    }))
  }

  function updateFood(foodId: string, label: string) {
    setFoodsTouched(true)
    setDraft((current) => ({
      ...current,
      foods: current.foods.map((food) => (food.id === foodId ? { ...food, label } : food)),
    }))
  }

  function removeFood(foodId: string) {
    setFoodsTouched(true)
    setDraft((current) => ({
      ...current,
      foods: current.foods.filter((food) => food.id !== foodId),
    }))
  }

  function addFood() {
    setFoodsTouched(true)
    setDraft((current) => ({
      ...current,
      foods: [...current.foods, { id: crypto.randomUUID(), label: '' }],
    }))
  }

  async function save(formEvent: FormEvent) {
    formEvent.preventDefault()
    const foods = draft.foods.map((food) => ({ ...food, label: food.label.trim() })).filter((food) => food.label)
    if (!draft.title.trim() || !draft.hostName.trim() || !draft.date || !draft.time || !draft.venueName.trim()) {
      setError('Add a title, your name, a date, a time, and a place.')
      return
    }
    if (draft.hostEmail.trim() && !isEmail(draft.hostEmail)) {
      setError('That email does not look complete.')
      return
    }
    if (foods.length === 0) {
      setError('Add at least one food option.')
      return
    }
    const now = new Date().toISOString()
    const id = existing?.id ?? crypto.randomUUID()
    const keepingMedia = draft.custom && mediaKind
    try {
      if (fileRef.current) await saveMedia(id, fileRef.current)
      else if (dropMedia || !keepingMedia) await deleteMedia(id)
    } catch {
      setError('That file could not be saved in this browser. Guests still see the theme.')
      return
    }
    const event: GatherEvent = {
      id,
      hostId: existing?.hostId ?? hostId,
      occasion: draft.occasion,
      title: draft.title.trim(),
      hostName: draft.hostName.trim(),
      message: draft.message.trim(),
      line: draft.custom ? draft.line.trim() : '',
      date: draft.date,
      time: draft.time,
      venueName: draft.venueName.trim(),
      venueAddress: draft.venueAddress.trim(),
      foods,
      artId: draft.artId,
      motion: draft.motion,
      accent: draft.accent,
      custom: draft.custom,
      hostEmail: draft.hostEmail.trim(),
      mediaKind: keepingMedia ? mediaKind : null,
      mediaName: keepingMedia ? mediaName : '',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    try {
      await saveEvent(event)
      if (!existing && isEmail(event.hostEmail)) await sendInviteCreated(event)
      const replies = await rsvpsFor(id)
      await Promise.all(replies.map((rsvp) => notifyRsvp(event, rsvp)))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The invite could not be saved.')
      return
    }
    navigate(`/event/${event.id}`)
  }

  return (
    <form className="editor-layout" onSubmit={save}>
      <div className="stack loose">
        <div>
          <p className="film-kicker">{existing ? 'Edit' : 'New invite'}</p>
          <h1>{existing ? 'Change the plan' : 'Plan the gathering'}</h1>
        </div>
        <section className="stack">
          <h2>The plan</h2>
          <div className="chips" role="group" aria-label="Kind of gathering">
            {occasions.map((occasion) => (
              <button
                key={occasion.id}
                type="button"
                className="chip"
                aria-pressed={draft.occasion === occasion.id}
                onClick={() => chooseOccasion(occasion.id)}
              >
                {occasion.label}
              </button>
            ))}
          </div>
          <label className="field">
            <span>Title</span>
            <input
              value={draft.title}
              onChange={(change) => patch({ title: change.target.value })}
              maxLength={80}
              placeholder="Sunday lunch at the house"
            />
          </label>
          <label className="field">
            <span>Your name</span>
            <input
              value={draft.hostName}
              onChange={(change) => patch({ hostName: change.target.value })}
              maxLength={60}
              autoComplete="name"
              placeholder="Lena"
            />
          </label>
          <label className="field">
            <span>Email for reply notifications</span>
            <input
              type="email"
              value={draft.hostEmail}
              onChange={(change) => patch({ hostEmail: change.target.value })}
              maxLength={120}
              autoComplete="email"
              placeholder="lena@example.com"
            />
          </label>
          <div className="split">
            <label className="field">
              <span>Date</span>
              <input type="date" value={draft.date} onChange={(change) => patch({ date: change.target.value })} />
            </label>
            <label className="field">
              <span>Time</span>
              <input type="time" value={draft.time} onChange={(change) => patch({ time: change.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>Place</span>
            <input
              value={draft.venueName}
              onChange={(change) => patch({ venueName: change.target.value })}
              maxLength={80}
              placeholder="The back garden"
            />
          </label>
          <label className="field">
            <span>Address, if you want it on the film</span>
            <input
              value={draft.venueAddress}
              onChange={(change) => patch({ venueAddress: change.target.value })}
              maxLength={160}
              placeholder="14 Orchard Street"
            />
          </label>
          <label className="field">
            <span>A note from you</span>
            <textarea
              value={draft.message}
              onChange={(change) => patch({ message: change.target.value })}
              maxLength={280}
              placeholder="Come hungry. Kids are welcome."
            />
          </label>
        </section>
        <section className="stack">
          <h2>The menu</h2>
          <p className="muted">Guests say how many people are coming, then split them across these dishes.</p>
          {draft.foods.map((food, index) => (
            <div className="food-edit" key={food.id}>
              <input
                aria-label={`Food option ${index + 1}`}
                value={food.label}
                maxLength={40}
                onChange={(change) => updateFood(food.id, change.target.value)}
              />
              <button
                type="button"
                className="btn secondary"
                onClick={() => removeFood(food.id)}
                disabled={draft.foods.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn secondary" onClick={addFood}>
            Add a dish
          </button>
        </section>
        <section className="stack">
          <h2>The film</h2>
          <div className="chips" role="group" aria-label="Film source">
            <button
              type="button"
              className="chip"
              aria-pressed={!draft.custom}
              onClick={() => {
                const theme = themeForOccasion(draft.occasion)
                clearMedia()
                patch({ custom: false, line: '', artId: theme.id, motion: theme.motion, accent: theme.accent })
              }}
            >
              Themes
            </button>
            <button type="button" className="chip" aria-pressed={draft.custom} onClick={() => patch({ custom: true })}>
              Custom film
            </button>
          </div>
          {draft.custom ? (
            <div className="stack">
              <p className="muted">
                Pick a theme, then add your own picture or video. A picture replaces that theme's art. A video plays
                behind the titles. The theme still sets the type.
              </p>
              <div className="row">
                <label className="btn secondary upload">
                  {mediaName || 'Upload a picture or video'}
                  <input
                    className="upload-input"
                    type="file"
                    accept="image/*,video/*"
                    onChange={(change) => {
                      onUpload(change.target.files?.[0])
                      change.target.value = ''
                    }}
                  />
                </label>
                {mediaKind && (
                  <button type="button" className="btn secondary" onClick={clearMedia}>
                    Remove {mediaKind === 'video' ? 'video' : 'picture'}
                  </button>
                )}
              </div>
              <div className="theme-grid">
                {themes.map((theme) => {
                  const image = mediaKind === 'image' && mediaUrl && draft.artId === theme.id ? mediaUrl : theme.image
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      className="theme-card"
                      aria-pressed={draft.artId === theme.id}
                      aria-label={theme.name}
                      style={{ backgroundImage: `url(${image})` }}
                      onClick={() => patch({ artId: theme.id, custom: true })}
                    >
                      {mediaKind === 'image' && draft.artId === theme.id && <em>Your picture</em>}
                      <span>{theme.name}</span>
                    </button>
                  )
                })}
              </div>
              <div className="chips" role="group" aria-label="Motion">
                {motions.map((motion) => (
                  <button
                    key={motion.id}
                    type="button"
                    className="chip"
                    aria-pressed={draft.motion === motion.id}
                    onClick={() => patch({ motion: motion.id, custom: true })}
                  >
                    {motion.label}
                  </button>
                ))}
              </div>
              <div className="swatches" role="group" aria-label="Accent color">
                {accentSwatches.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    className="swatch"
                    style={{ background: swatch }}
                    aria-label={swatch}
                    aria-pressed={draft.accent.toLowerCase() === swatch.toLowerCase()}
                    onClick={() => patch({ accent: swatch, custom: true })}
                  />
                ))}
                <label className="color-field">
                  <span className="sr-only">Custom color</span>
                  <input
                    type="color"
                    value={toColorInput(draft.accent)}
                    onChange={(change) => patch({ accent: change.target.value, custom: true })}
                  />
                </label>
              </div>
              <label className="field">
                <span>A short line on the title card</span>
                <input
                  value={draft.line}
                  maxLength={80}
                  onChange={(change) => patch({ line: change.target.value, custom: true })}
                  placeholder="Come as you are"
                />
              </label>
            </div>
          ) : (
            <div className="theme-grid">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className="theme-card"
                  aria-pressed={!draft.custom && draft.artId === theme.id}
                  aria-label={`${theme.name}, ${occasions.find((item) => item.id === theme.occasion)?.label}`}
                  style={{ backgroundImage: `url(${theme.image})` }}
                  onClick={() => chooseTheme(theme.id)}
                >
                  <span>{theme.name}</span>
                </button>
              ))}
            </div>
          )}
        </section>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn" type="submit">
          {existing ? 'Save changes' : 'Save invite'}
        </button>
      </div>
      <div className="sticky">
        <Film event={draft} audience="host" mediaUrl={mediaUrl} mediaKind={draft.custom ? mediaKind : null} />
      </div>
    </form>
  )
}

function toColorInput(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#b8613a'
}
