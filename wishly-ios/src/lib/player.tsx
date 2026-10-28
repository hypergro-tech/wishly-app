// One player for the whole app, like a music app: whatever is playing keeps
// playing as you move between screens, shows in the mini player, and opens in
// the full-screen player. Songs without a recording yet play the music-box
// preview for their mood, one chord per lyric line.
import { useAudioPlayer, type AudioSource } from 'expo-audio'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

import type { CoverSpec } from '@/components/Cover'
import { EXAMPLES, type Example } from './catalog'
import type { Song } from './songwriter'

export const SECONDS_PER_LINE = 3.2

const MUSIC_BOX: Record<string, number> = {
  tender: require('../../assets/audio/tender.wav'),
  joyful: require('../../assets/audio/joyful.wav'),
  playful: require('../../assets/audio/playful.wav'),
  nostalgic: require('../../assets/audio/nostalgic.wav'),
  reflective: require('../../assets/audio/reflective.wav'),
}

export type Track = {
  key: string // 'example:ex1' or 'order:<id>'
  title: string
  subtitle: string
  label: string // shown above the full-screen player
  cover: CoverSpec
  sections: Song['sections']
  mood: string
  tags: string[]
  audioUrl?: string | null
  occasion?: string // for "Start a song like this"
  orderId?: string
}

type Player = {
  track: Track | null
  playing: boolean
  elapsed: number
  total: number
  line: number // index into the track's lines, -1 when not playing
  play: (track: Track) => void
  toggle: () => void
  pause: () => void
}

const PlayerContext = createContext<Player | null>(null)

const lineCount = (t: Track) => t.sections.reduce((n, s) => n + s.lines.length, 0)
const sourceFor = (t: Track): AudioSource => (t.audioUrl ? { uri: t.audioUrl } : MUSIC_BOX[t.mood] ?? MUSIC_BOX.tender)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useAudioPlayer(MUSIC_BOX.tender)
  const [track, setTrack] = useState<Track | null>(null)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const base = useRef(0) // seconds played before the current run
  const startedAt = useRef(0)
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)
  const current = useRef<Track | null>(null)

  const totalFor = (t: Track | null) => {
    if (!t) return 0
    if (t.audioUrl && audio.duration) return audio.duration
    return lineCount(t) * SECONDS_PER_LINE
  }

  const stopTicking = () => {
    if (tick.current) clearInterval(tick.current)
    tick.current = null
  }

  const run = () => {
    startedAt.current = Date.now()
    audio.play()
    setPlaying(true)
    stopTicking()
    tick.current = setInterval(() => {
      const t = current.current
      if (!t) return
      const now = base.current + (Date.now() - startedAt.current) / 1000
      // The music-box loop is four bars long; start it again when it ends.
      if (!t.audioUrl && !audio.playing) {
        audio.seekTo(0)
        audio.play()
      }
      if (now >= totalFor(t)) {
        stopTicking()
        audio.pause()
        base.current = 0
        setElapsed(0)
        setPlaying(false)
      } else {
        setElapsed(now)
      }
    }, 250)
  }

  const pause = () => {
    if (!playing) return
    stopTicking()
    audio.pause()
    base.current += (Date.now() - startedAt.current) / 1000
    setPlaying(false)
  }

  const play = (t: Track) => {
    if (current.current?.key === t.key) {
      if (!playing) run()
      return
    }
    stopTicking()
    current.current = t
    setTrack(t)
    base.current = 0
    setElapsed(0)
    audio.replace(sourceFor(t))
    audio.seekTo(0)
    run()
  }

  const toggle = () => {
    if (!current.current) return
    if (playing) pause()
    else run()
  }

  useEffect(() => stopTicking, [])

  const total = totalFor(track)
  const line = track && (playing || elapsed > 0) ? Math.min(lineCount(track) - 1, Math.floor(elapsed / (total / lineCount(track)))) : -1

  return (
    <PlayerContext.Provider value={{ track, playing, elapsed, total, line, play, toggle, pause }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const p = useContext(PlayerContext)
  if (!p) throw new Error('usePlayer must be inside PlayerProvider')
  return p
}

// Playback state for one track, for screens that show their own controls.
export function useTrack(key: string | undefined) {
  const p = usePlayer()
  const isCurrent = Boolean(key && p.track?.key === key)
  return {
    isCurrent,
    playing: isCurrent && p.playing,
    line: isCurrent ? p.line : -1,
    elapsed: isCurrent ? p.elapsed : 0,
    total: isCurrent ? p.total : 0,
  }
}

export const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function exampleTrack(e: Example): Track {
  return {
    key: `example:${e.id}`,
    title: e.title,
    subtitle: e.for,
    label: 'Example song',
    cover: { name: e.coverName, tint: e.tint, photo: e.photo, photoAlt: e.photoAlt },
    sections: [{ label: '', lines: e.lines }],
    mood: e.mood,
    tags: e.tags,
    occasion: e.occasion,
  }
}

export const findExample = (id: string) => EXAMPLES.find((e) => e.id === id)
