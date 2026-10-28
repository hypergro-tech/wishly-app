import { STATUS } from '../api/orders'

export function StatusBadge({ status }) {
  const s = STATUS[status]
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold text-ink ${s.tint}`}>{s.label}</span>
}

export function Chips({ options, value, onChange, multi = false }) {
  const isOn = (o) => (multi ? value.includes(o) : value === o)
  const toggle = (o) => onChange(multi ? (isOn(o) ? value.filter((v) => v !== o) : [...value, o]) : o)
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button type="button" key={o} aria-pressed={isOn(o)} onClick={() => toggle(o)} className={isOn(o) ? 'chip-on' : 'chip-off'}>
          {o}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </label>
  )
}

export function Eyebrow({ children, className = '' }) {
  return <p className={`eyebrow ${className}`}>{children}</p>
}

export function SpeakButton({ text, label = 'Hear it' }) {
  return (
    <button type="button" onClick={() => speak(text)} className="btn-ghost shrink-0 !px-4" aria-label={`${label}: ${text}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
      <span>{label}</span>
    </button>
  )
}

export function speak(text) {
  if (!('speechSynthesis' in window) || !text) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.85
  window.speechSynthesis.speak(u)
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
}
