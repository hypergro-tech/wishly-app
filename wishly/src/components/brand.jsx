// The Wishly signature and graphic language: the spark (recognition),
// the rhythm (music) and the ribbon (giving). Use one gesture at a time.

export function Spark({ size = 24, className = 'text-coral', title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="currentColor" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      {[0, 60, 120, 180, 240, 300].map((r) => (
        <ellipse key={r} cx="32" cy="17" rx="4" ry="13" transform={`rotate(${r} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="4" />
    </svg>
  )
}

// Lowercase wordmark, warm asterisk and final dot. Keep at 120px+ wide.
export function Logo({ reversed = false, size = 30 }) {
  return (
    <span className="inline-flex items-center gap-[0.18em] font-bold leading-none tracking-[-0.045em]" style={{ fontSize: size }} aria-label="wishly">
      <Spark size={size * 0.95} className="text-coral" />
      <span className={reversed ? 'text-ivory' : 'text-ink'}>
        wishly<span className="text-coral">.</span>
      </span>
    </span>
  )
}

const BARS = [3, 6, 9, 11, 8, 4, 7, 10, 12, 9, 5, 8, 11, 7, 4, 9, 12, 10, 6, 8, 11, 5, 9, 12]

// Decorative waveform; it doesn't represent the actual audio.
export function Rhythm({ progress = null, bars = BARS, className = '', on = 'bg-ink', off = 'bg-ink/20' }) {
  return (
    <div className={`flex h-12 items-center gap-[3px] ${className}`} aria-hidden>
      {bars.map((h, i) => (
        <span
          key={i}
          className={`w-[4px] flex-1 rounded-full transition-colors duration-500 ${progress === null || i / bars.length < progress ? on : off}`}
          style={{ height: `${(h / 12) * 100}%`, maxWidth: 6 }}
        />
      ))}
    </div>
  )
}

export function Ribbon({ className = 'text-coral' }) {
  return (
    <svg viewBox="0 0 300 120" className={className} fill="none" aria-hidden>
      <path d="M12 112 C 30 30, 90 40, 150 62 S 260 90, 290 10" stroke="currentColor" strokeWidth="12" strokeLinecap="butt" />
    </svg>
  )
}
