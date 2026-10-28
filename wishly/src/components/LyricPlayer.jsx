import { useEffect, useRef, useState } from 'react'
import { createMusicBox } from '../lib/musicBox'
import { Rhythm, Spark } from './brand'

const SECONDS_PER_LINE = 3.2

// Plays the song and follows along in the lyrics. Uses the real recording when
// `audioUrl` is set; otherwise a music-box preview carries the melody.
export default function LyricPlayer({ sections, mood, audioUrl, showLabels = true, maxHeight = '28rem', compact = false, autoPlay = false }) {
  const lines = sections.flatMap((s, si) => s.lines.map((text, li) => ({ text, label: li === 0 ? s.label : null, key: `${si}-${li}` })))
  const [current, setCurrent] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const box = useRef(null)
  const audio = useRef(null)
  const tick = useRef(null)
  const lineRefs = useRef([])
  const scroller = useRef(null)

  const stop = () => {
    clearInterval(tick.current)
    box.current?.stop()
    box.current = null
    audio.current?.pause()
    setPlaying(false)
  }

  useEffect(() => stop, [])

  useEffect(() => {
    const el = lineRefs.current[current]
    const sc = scroller.current
    if (!el || !sc) return
    if (sc.scrollHeight > sc.clientHeight) sc.scrollTo({ top: el.offsetTop - sc.clientHeight / 3, behavior: 'smooth' })
    else el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [current])

  const play = () => {
    if (playing) return stop()
    setPlaying(true)
    if (audioUrl && audio.current) {
      audio.current.play()
      tick.current = setInterval(() => {
        const a = audio.current
        if (!a?.duration) return
        setCurrent(Math.min(lines.length - 1, Math.floor((a.currentTime / a.duration) * lines.length)))
        if (a.ended) stop()
      }, 200)
      return
    }
    box.current = createMusicBox(mood, SECONDS_PER_LINE)
    box.current.start()
    let i = 0
    setCurrent(0)
    tick.current = setInterval(() => {
      i++
      if (i >= lines.length) {
        stop()
        setCurrent(-1)
      } else setCurrent(i)
    }, SECONDS_PER_LINE * 1000)
  }

  // Opening the gift is the user gesture that allows audio to start.
  useEffect(() => {
    if (autoPlay) play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const progress = current < 0 ? 0 : (current + 1) / lines.length

  return (
    <div>
      {audioUrl && <audio ref={audio} src={audioUrl} preload="auto" />}
      <div className="flex items-center gap-4">
        <button
          onClick={play}
          aria-label={playing ? 'Pause' : 'Play'}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-coral text-ink transition hover:scale-105 hover:bg-coral-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coral/40"
        >
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1" /><rect x="14" y="4" width="5" height="16" rx="1" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" /></svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <Rhythm progress={playing || current >= 0 ? progress : 0} className="!h-10" />
          {!audioUrl && <p className="mt-1 text-xs text-ink/55">Music-box preview. The full recording plays here once it is ready.</p>}
        </div>
      </div>
      <div ref={scroller} className="relative mt-6 overflow-y-auto pr-1" style={{ maxHeight }}>
        {lines.map((l, i) => (
          <div key={l.key} ref={(el) => (lineRefs.current[i] = el)}>
            {showLabels && l.label && <p className="eyebrow mb-1.5 mt-5 first:mt-0 !text-ink/45">{l.label}</p>}
            <p className={`relative flex gap-2 font-accent leading-snug transition-colors duration-500 ${compact ? 'text-[17px]' : 'text-lg'} ${i === current ? 'text-ink' : current >= 0 ? 'text-ink/40' : 'text-ink/80'}`}>
              <span className={`mt-1 shrink-0 transition-opacity duration-300 ${i === current ? 'opacity-100' : 'opacity-0'}`}>
                <Spark size={14} />
              </span>
              <span className={i === current ? 'italic' : ''}>{l.text}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
