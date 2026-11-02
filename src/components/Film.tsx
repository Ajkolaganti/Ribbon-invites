import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { formatWhen } from '../lib/format'
import { useStoredMedia } from '../lib/media'
import { eyebrowFor, placeholderMessage, themeById } from '../themes'
import type { Look } from '../themes'
import type { FilmModel, GatherEvent, MediaKind, Motion } from '../types'

const DURATION = 13.5

type Beat = { start: number; end: number; fadeOut?: boolean }

const beats = {
  open: { start: 0.15, end: 3.05 },
  title: { start: 2.45, end: 6.25 },
  place: { start: 5.7, end: 9.35 },
  note: { start: 8.75, end: 11.7 },
  ask: { start: 11.15, end: DURATION, fadeOut: false },
} satisfies Record<string, Beat>

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(media.matches)
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])
  return reduced
}

function opacity(time: number, beat: Beat) {
  const fadeIn = 0.5
  const fadeOut = 0.42
  if (time < beat.start || time > beat.end) return 0
  if (time < beat.start + fadeIn) return (time - beat.start) / fadeIn
  if (beat.fadeOut === false) return 1
  if (time > beat.end - fadeOut) return Math.max(0, (beat.end - time) / fadeOut)
  return 1
}

function clock(seconds: number) {
  const whole = Math.max(0, Math.min(DURATION, Math.floor(seconds)))
  return `0:${String(whole).padStart(2, '0')}`
}

function artTransform(look: Look, motion: Motion, time: number) {
  const progress = time / DURATION
  const sway = Math.sin(time * 0.55)
  if (look === 'editorial' || look === 'deco') {
    return `scale(1.05) translate3d(${sway * 0.8}%, 0, 0)`
  }
  if (look === 'mobile') {
    return `scale(1.08) translate3d(0, ${Math.sin(time * 0.45) * 2.2}%, 0)`
  }
  if (look === 'disco') {
    return `scale(${1.06 + Math.sin(time * 0.9) * 0.02}) rotate(${sway * 0.35}deg)`
  }
  if (look === 'folk') {
    return `scale(1.14) translate3d(${-progress * 2.5}%, ${-progress * 3.5}%, 0)`
  }
  if (motion === 'rise') return `scale(${1.1 + progress * 0.06}) translate3d(0, ${-progress * 4}%, 0)`
  return `scale(${1.14 - progress * 0.06}) translate3d(${sway}%, ${-progress * 2}%, 0)`
}

function artFilter(look: Look, motion: Motion, time: number) {
  if (look === 'editorial' || look === 'folk' || look === 'mobile' || look === 'disco') return undefined
  if (motion === 'flicker' || look === 'deco') {
    const speed = look === 'deco' ? 1.3 : 6.5
    return `brightness(${0.95 + Math.sin(time * speed) * 0.05})`
  }
  return undefined
}

type Speck = {
  id: number
  x: number
  y: number
  size: number
  speed: number
  phase: number
  petal: boolean
}

function makeSpecks(count: number, petalEvery = 0, size = 8): Speck[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: (id * 19 + 7) % 92,
    y: (id * 31 + 11) % 70,
    size: size + (id % 4) * size * 0.45,
    speed: 0.22 + (id % 6) * 0.06,
    phase: id * 0.73,
    petal: petalEvery > 0 && id % petalEvery === 0,
  }))
}

const discoBits = makeSpecks(11, 0, 9)
const canopyBits = makeSpecks(7, 2, 8)
const discoColors = ['#ff4d8d', '#ffd23f', '#fff6e4', '#6c4cff', '#ff7a2f']
const mobileBlobs = [
  { id: 0, size: 120, color: 'rgba(186, 166, 224, 0.42)', x: 8 },
  { id: 1, size: 86, color: 'rgba(255, 186, 150, 0.4)', x: 62 },
  { id: 2, size: 140, color: 'rgba(160, 206, 224, 0.38)', x: 28 },
]

function fallingStyle(speck: Speck, time: number, color?: string): CSSProperties {
  const loop = (time * speck.speed + speck.phase) % 1
  const wave = Math.sin(time * 1.1 + speck.phase)
  return {
    left: `${speck.x + wave * 6}%`,
    top: `${(loop * 112) % 112}%`,
    width: speck.size,
    height: color ? speck.size : speck.size * 1.5,
    background: color,
    opacity: 0.85,
    transform: `rotate(${time * 36 + speck.phase * 30}deg)`,
  }
}

function Life({ look, time }: { look: Look; time: number }) {
  if (look === 'editorial' || look === 'folk') return null
  if (look === 'deco') {
    return (
      <div className="film-life life-deco" aria-hidden="true">
        <div className="deco-ring" style={{ transform: `rotate(${time * 8}deg)` }} />
        <div
          className="film-sheen"
          style={{ transform: `translate3d(${-40 + (time / DURATION) * 180}%, 0, 0) rotate(18deg)` }}
        />
      </div>
    )
  }
  if (look === 'disco') {
    return (
      <div className="film-life life-disco" aria-hidden="true">
        {discoBits.map((speck) => (
          <span key={speck.id} className="speck is-square" style={fallingStyle(speck, time, discoColors[speck.id % discoColors.length])} />
        ))}
      </div>
    )
  }
  if (look === 'mobile') {
    return (
      <div className="film-life life-mobile" aria-hidden="true">
        {mobileBlobs.map((blob) => (
          <span
            key={blob.id}
            className="speck is-blob"
            style={{
              width: blob.size,
              height: blob.size,
              background: blob.color,
              left: `${blob.x + Math.sin(time * 0.35 + blob.id) * 6}%`,
              top: `${18 + blob.id * 16 + Math.cos(time * 0.4 + blob.id) * 4}%`,
            }}
          />
        ))}
      </div>
    )
  }
  return (
    <div className="film-life life-canopy" aria-hidden="true">
      {canopyBits.map((speck) => (
        <span key={speck.id} className="speck is-petal" style={fallingStyle(speck, time)} />
      ))}
    </div>
  )
}

function Words({ text, time, beat }: { text: string; time: number; beat: Beat }) {
  const words = text.trim().split(/\s+/)
  return words.map((word, index) => {
    const amount = opacity(time, { ...beat, start: beat.start + index * 0.11 })
    const left = 1 - amount
    return (
      <span
        key={`${word}-${index}`}
        className="film-word"
        style={{
          opacity: amount,
          transform: `translateY(${left * 16}px)`,
          filter: left > 0.05 ? `blur(${left * 5}px)` : undefined,
        }}
      >
        {word}
        {index < words.length - 1 ? '\u00A0' : ''}
      </span>
    )
  })
}

export function EventFilm({
  event,
  autoPlay,
  audience,
  heading,
}: {
  event: GatherEvent
  autoPlay?: boolean
  audience?: 'guest' | 'host'
  heading?: boolean
}) {
  const stored = useStoredMedia(!event.mediaUrl && event.mediaKind ? event.id : undefined)
  const mediaUrl = event.mediaUrl || stored?.url || null
  const mediaKind = event.mediaUrl ? event.mediaKind : stored?.kind ?? null
  return (
    <Film
      event={event}
      autoPlay={autoPlay}
      audience={audience}
      heading={heading}
      mediaUrl={mediaUrl}
      mediaKind={mediaKind}
    />
  )
}

export function Film({
  event,
  autoPlay = false,
  audience = 'guest',
  heading = false,
  mediaUrl = null,
  mediaKind = null,
}: {
  event: FilmModel
  autoPlay?: boolean
  audience?: 'guest' | 'host'
  heading?: boolean
  mediaUrl?: string | null
  mediaKind?: MediaKind | null
}) {
  const reduced = useReducedMotion()
  const theme = themeById(event.artId)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(autoPlay && !reduced)

  useEffect(() => {
    const video = videoRef.current
    if (!video || mediaKind !== 'video') return
    if (playing) void video.play().catch(() => undefined)
    else video.pause()
  }, [playing, mediaKind, mediaUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video || mediaKind !== 'video' || playing) return
    const duration = video.duration
    const target = Number.isFinite(duration) && duration > 0 ? Math.min(time, duration) : time
    if (Math.abs(video.currentTime - target) > 0.15) video.currentTime = target
  }, [time, playing, mediaKind])

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let previous = performance.now()
    const tick = (now: number) => {
      const delta = Math.min(0.05, (now - previous) / 1000)
      previous = now
      setTime((current) => Math.min(DURATION, current + delta))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  useEffect(() => {
    if (playing && time >= DURATION) setPlaying(false)
  }, [playing, time])

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) setPlaying(false)
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  const when = formatWhen(event.date, event.time)
  const title = event.title.trim() || 'Your gathering'
  const host = event.hostName.trim() || 'Your host'
  const venue = event.venueName.trim() || 'Venue to come'
  const message = event.message.trim() || placeholderMessage(event.occasion)
  const ended = time >= DURATION - 0.05 && !playing
  const TitleTag = heading ? 'h1' : 'p'

  function toggle() {
    if (time >= DURATION - 0.05) {
      setTime(0)
      setPlaying(true)
      return
    }
    setPlaying((value) => !value)
  }

  const style = {
    '--accent': event.accent || theme.accent,
    '--film-display': theme.display,
  } as CSSProperties

  const summary = `${eyebrowFor(event.occasion)}. ${title}. ${when.dateLine} at ${when.timeLine}. ${venue}. ${event.venueAddress}. From ${host}. ${message}`
  const still = mediaKind === 'image' && mediaUrl ? mediaUrl : theme.image
  const art =
    mediaKind === 'video' && mediaUrl ? (
      <video ref={videoRef} className="film-video" src={mediaUrl} muted playsInline loop preload="auto" />
    ) : (
      <div
        className="film-art"
        style={{
          backgroundImage: `url(${still})`,
          transform: reduced ? undefined : artTransform(theme.look, event.motion, time),
          filter: reduced ? undefined : artFilter(theme.look, event.motion, time),
        }}
      />
    )

  const life = reduced ? null : <Life look={theme.look} time={time} />

  if (reduced) {
    return (
      <div className="stage" style={style}>
        <article className={`film-frame is-still look-${theme.look} tone-${theme.tone} align-${theme.align}`} aria-label={`${title} invite`}>
          {art}
          <div className="film-scrim" />
          <div className="film-still-copy">
            <p className="film-kicker">{eyebrowFor(event.occasion)}</p>
            <TitleTag className="film-title">{title}</TitleTag>
            {event.line.trim() && <p className="film-line">{event.line}</p>}
            <p className="film-sub">{when.dateLine}</p>
            <p className="film-sub">{when.timeLine}</p>
            <p className="film-sub">{venue}</p>
            {event.venueAddress.trim() && <p className="film-quiet">{event.venueAddress}</p>}
            <p className="film-message">{message}</p>
            <p className="film-quiet">From {host}</p>
          </div>
        </article>
      </div>
    )
  }

  const scenes = [
    {
      key: 'open',
      beat: beats.open,
      body: (
        <p
          className="film-kicker"
          style={{ letterSpacing: `${0.34 - Math.min(1, Math.max(0, (time - beats.open.start) / 1.2)) * 0.16}em` }}
        >
          {eyebrowFor(event.occasion)}
        </p>
      ),
    },
    {
      key: 'title',
      beat: beats.title,
      body: (
        <>
          <span className="film-rule" style={{ transform: `scaleX(${Math.min(1, Math.max(0, (time - 2.45) / 0.8))})` }} />
          <TitleTag className="film-title">
            <Words text={title} time={time} beat={beats.title} />
          </TitleTag>
          {event.line.trim() && <p className="film-line">{event.line}</p>}
        </>
      ),
    },
    {
      key: 'place',
      beat: beats.place,
      body: (
        <>
          <p className="film-sub">{when.dateLine}</p>
          <p className="film-sub">{when.timeLine}</p>
          <p className="film-place">{venue}</p>
          {event.venueAddress.trim() && <p className="film-quiet">{event.venueAddress}</p>}
        </>
      ),
    },
    {
      key: 'note',
      beat: beats.note,
      body: (
        <>
          <p className="film-kicker">From {host}</p>
          <p className="film-message">{message}</p>
        </>
      ),
    },
    {
      key: 'ask',
      beat: beats.ask,
      body: (
        <>
          <p className="film-ask">
            <Words text="Will you come?" time={time} beat={beats.ask} />
          </p>
          <p className="film-quiet">
            {audience === 'host' ? 'Guests answer beside the film.' : 'Say if you can come.'}
          </p>
        </>
      ),
    },
  ]

  return (
    <div className="stage" style={style}>
      <div className={`film-frame look-${theme.look} tone-${theme.tone} align-${theme.align}`} onClick={toggle}>
        {art}
        <div className="film-vignette" style={{ opacity: 0.75 + Math.sin(time * 0.5) * 0.15 }} />
        <div className="film-scrim" style={{ opacity: 0.86 + Math.sin(time * 0.55) * 0.08 }} />
        {life}
        <div className="film-grain" style={{ backgroundPosition: `${time * 22}px ${time * 13}px` }} />
        <p className="sr-only">{summary}</p>
        {scenes.map((scene) => {
          const amount = opacity(time, scene.beat)
          const lift = (1 - amount) * (theme.look === 'disco' ? 30 : theme.look === 'editorial' ? 10 : 18)
          const sway = theme.look === 'folk' ? Math.sin(time * 0.6) * 3 : 0
          return (
            <div
              key={scene.key}
              className={`film-scene${scene.key === 'open' ? ' is-open' : ''}`}
              aria-hidden={amount < 0.08}
              style={{ opacity: amount, transform: `translate3d(${sway}px, ${lift}px, 0)` }}
            >
              {scene.body}
            </div>
          )
        })}
        {!playing && (
          <button
            type="button"
            className="film-badge"
            onClick={(click) => {
              click.stopPropagation()
              toggle()
            }}
          >
            {ended ? 'Replay' : time > 0.2 ? 'Resume' : 'Play film'}
          </button>
        )}
      </div>
      <div className="controls">
        <button type="button" className="control-play" onClick={toggle} aria-label={playing ? 'Pause film' : 'Play film'}>
          {playing ? 'Pause' : ended ? 'Replay' : 'Play'}
        </button>
        <input
          type="range"
          min={0}
          max={DURATION}
          step={0.01}
          value={time}
          aria-label="Film position"
          onChange={(change) => setTime(Number(change.target.value))}
        />
        <span className="clock">
          {clock(time)} / {clock(DURATION)}
        </span>
      </div>
    </div>
  )
}
