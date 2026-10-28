import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { placeOrder } from '../api/orders'
import { Spark } from '../components/brand'
import { ActionBar, CloseIcon, IconButton, TopBar } from '../components/app'
import { quoted } from '../lib/text'
import { Chips, Eyebrow, Field, SpeakButton, Spinner } from '../components/ui'
import {
  CORE_PACKAGE, DELIVERY, EXTRAS, GENRES, LANGUAGES, MEMORY_PROMPTS, MOODS, OCCASIONS, OCCASION_TONES, PRONOUNS,
  RELATIONSHIPS, VOICES, formatDate, formatPrice, quote,
} from '../lib/catalog'

const STEPS = ['Who it’s for', 'Their details', 'The feeling', 'Check', 'Your gift']
const DRAFT_KEY = 'wishly:draft'

const EMPTY = {
  recipient: { name: '', pronunciation: '', pronouns: '', relationship: '' },
  occasion: '',
  occasion_date: '',
  memories: { nickname: '', ritual: '', inside_joke: '', memory: '', want_to_say: '', avoid: '' },
  music: { mood: '', genre: '', voice: 'No preference', language: 'English' },
  package: { delivery: 'standard', extras: [] },
  buyer: { name: '', email: '' },
}

function loadDraft(occasion) {
  let draft = EMPTY
  try { draft = { ...EMPTY, ...JSON.parse(localStorage.getItem(DRAFT_KEY)) } } catch { /* no draft */ }
  return occasion && OCCASIONS.includes(occasion) ? { ...draft, occasion } : draft
}

export default function Create() {
  const [params] = useSearchParams()
  const [step, setStep] = useState(0)
  const [b, setB] = useState(() => loadDraft(params.get('occasion')))
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(b)) } catch { /* draft is a convenience */ }
  }, [b])

  useEffect(() => {
    document.getElementById('app-scroll')?.scrollTo(0, 0)
    window.scrollTo(0, 0)
  }, [step])

  const set = (group, key) => (v) => setB((p) => ({ ...p, [group]: { ...p[group], [key]: v?.target ? v.target.value : v } }))
  const setTop = (key) => (v) => setB((p) => ({ ...p, [key]: v?.target ? v.target.value : v }))

  const name = b.recipient.name.trim()
  const tone = OCCASION_TONES[b.occasion]
  const gentle = tone?.gentle
  const filled = MEMORY_PROMPTS.filter((m) => b.memories[m.key]?.trim())
  const valid = [
    name && b.recipient.relationship && b.occasion,
    filled.length >= 1,
    b.music.mood && b.music.genre && b.music.language,
    confirmed,
    b.buyer.name.trim() && /\S+@\S+\.\S+/.test(b.buyer.email),
  ]
  const q = quote(b.package)

  async function submit() {
    setSubmitting(true)
    const order = await placeOrder(b)
    localStorage.removeItem(DRAFT_KEY)
    navigate(`/orders/${order.id}`)
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar
        back={step > 0 ? () => setStep(step - 1) : '/'}
        title={`Step ${step + 1} of ${STEPS.length}`}
        right={<IconButton label="Save and close" onClick={() => navigate('/')}><CloseIcon /></IconButton>}
      >
        <div className="grid grid-cols-5 gap-1 px-4 pb-3">
          {STEPS.map((st, i) => (
            <div key={st} className={`h-1 rounded-full transition-colors ${i < step ? 'bg-ink' : i === step ? 'bg-coral' : 'bg-ink/10'}`} />
          ))}
        </div>
      </TopBar>

      <div className="flex-1 px-4 pb-8 pt-5">
        {step > 0 && <SoFar b={b} name={name} filled={filled} tone={tone} />}
        <Eyebrow>0{step + 1} / {STEPS[step]}</Eyebrow>

          {step === 0 && (
            <section className="space-y-8">
              <Header title="Who is this song for?" sub="Their name is the first thing they’ll hear, so let’s get it exactly right." />
              <Field label="Their name, as it should be sung">
                <input className="input" value={b.recipient.name} onChange={set('recipient', 'name')} placeholder="e.g. Grace" autoComplete="off" />
              </Field>
              <Field label="How do you say it?" hint="Spell it the way it sounds, then listen back.">
                <div className="flex gap-2">
                  <input className="input" value={b.recipient.pronunciation} onChange={set('recipient', 'pronunciation')} placeholder="e.g. PREE-yah" autoComplete="off" />
                  <SpeakButton text={b.recipient.pronunciation || b.recipient.name} />
                </div>
              </Field>
              <Field label="They are your…"><Chips options={RELATIONSHIPS} value={b.recipient.relationship} onChange={set('recipient', 'relationship')} /></Field>
              <Field label="Pronouns (optional)"><Chips options={PRONOUNS} value={b.recipient.pronouns} onChange={set('recipient', 'pronouns')} /></Field>
              <Field label="What’s the occasion?"><Chips options={OCCASIONS} value={b.occasion} onChange={setTop('occasion')} /></Field>
              {tone && <p className={`accent rounded-2xl px-5 py-4 text-xl ${tone.tint}`}>{tone.line}</p>}
              <Field label="When will you give it? (optional)" hint="We’ll tell you if the song wouldn’t be ready in time.">
                <input type="date" className="input max-w-xs" value={b.occasion_date} onChange={setTop('occasion_date')} />
              </Field>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-7">
              <Header
                title={name ? `Tell us about ${name}.` : 'Tell us about them.'}
                sub={gentle
                  ? 'Share what you’d like them remembered for. One memory is enough, and you can save this and come back when you feel ready.'
                  : 'One small memory is enough to begin. The more specific it is, the more it will sound like them.'}
              />
              {MEMORY_PROMPTS.map((m) => (
                <Field key={m.key} label={m.label}>
                  {m.short ? (
                    <input className="input" value={b.memories[m.key]} onChange={set('memories', m.key)} placeholder={m.placeholder} />
                  ) : (
                    <textarea rows={2} className="input resize-y" value={b.memories[m.key]} onChange={set('memories', m.key)} placeholder={m.placeholder} />
                  )}
                </Field>
              ))}
              <Field label="Anything to leave out? (optional)" hint="Topics, words or names that shouldn’t appear.">
                <input className="input" value={b.memories.avoid} onChange={set('memories', 'avoid')} />
              </Field>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-8">
              <Header title="How should it feel?" sub="Choose a mood and a sound. You don’t need any musical knowledge." />
              <div>
                <span className="label">Mood</span>
                <div className="grid grid-cols-2 gap-2.5">
                  {MOODS.map((m) => (
                    <button key={m.id} type="button" aria-pressed={b.music.mood === m.id} onClick={() => set('music', 'mood')(m.id)} className={`relative ${b.music.mood === m.id ? 'option-on' : 'option-off'} ${m.tint}`}>
                      {b.music.mood === m.id && (
                        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-ivory">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                        </span>
                      )}
                      <p className="text-lg font-bold">{m.label}</p>
                      <p className="mt-0.5 text-[15px] text-ink/70">{m.blurb}</p>
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Style"><Chips options={GENRES} value={b.music.genre} onChange={set('music', 'genre')} /></Field>
              <Field label="Voice"><Chips options={VOICES} value={b.music.voice} onChange={set('music', 'voice')} /></Field>
              <Field label="Language"><Chips options={LANGUAGES} value={b.music.language} onChange={set('music', 'language')} /></Field>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6">
              <Header title="Check the brief." sub="This is what we’ll write from. Names and facts matter most, so read them once more." />
              <div className="rounded-[22px] bg-white p-5 shadow-[0_0_0_1px_rgba(20,52,56,0.1)] space-y-6">
                <Row label="For" onEdit={() => setStep(0)}>
                  <p className="text-[28px] font-bold leading-tight">{name}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[15px] text-ink/75">
                    <span>Sung as “{b.recipient.pronunciation || name}”</span>
                    <SpeakButton text={b.recipient.pronunciation || name} />
                  </div>
                  <p className="mt-2 text-[15px] text-ink/75">
                    Your {b.recipient.relationship.toLowerCase()}{b.recipient.pronouns && ` · ${b.recipient.pronouns}`} · {b.occasion}
                    {b.occasion_date && ` on ${formatDate(b.occasion_date)}`}
                  </p>
                </Row>
                <Row label="Their details" onEdit={() => setStep(1)}>
                  <ul className="space-y-3">
                    {filled.map((m) => (
                      <li key={m.key}>
                        <p className="text-[13px] text-ink/55">{m.label}</p>
                        <p className="accent text-lg leading-snug">{quoted(b.memories[m.key])}</p>
                      </li>
                    ))}
                    {b.memories.avoid && <li className="text-[15px]"><span className="text-ink/55">Leave out: </span>{b.memories.avoid}</li>}
                  </ul>
                </Row>
                <Row label="The feeling" onEdit={() => setStep(2)}>
                  <p className="text-[15px]">{MOODS.find((m) => m.id === b.music.mood)?.label} · {b.music.genre} · {b.music.voice} · {b.music.language}</p>
                </Row>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-mint p-5 text-[15px] leading-relaxed">
                <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#143438]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>I’ve checked the name, how to say it, and the facts. I’ll still hear the finished song and can ask for a correction before it’s given.</span>
              </label>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-8">
              <Header title="Your gift." sub="Clear price, clear ready date. Nothing added later." />
              <div className="rounded-card border border-ink/10 bg-white p-6">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl">{CORE_PACKAGE.name}</h3>
                  <p className="text-xl font-bold">{formatPrice(CORE_PACKAGE.price)}</p>
                </div>
                <ul className="mt-4 space-y-2">
                  {CORE_PACKAGE.includes.map((i) => <li key={i} className="flex gap-2.5 text-[15px] text-ink/80"><Spark size={14} className="mt-1 shrink-0 text-coral" />{i}</li>)}
                </ul>
              </div>
              <div>
                <span className="label">When it’s ready</span>
                <div className="grid grid-cols-2 gap-2.5">
                  {DELIVERY.map((d) => {
                    const ready = new Date(); ready.setDate(ready.getDate() + d.days)
                    const on = b.package.delivery === d.id
                    return (
                      <button key={d.id} type="button" aria-pressed={on} onClick={() => set('package', 'delivery')(d.id)} className={on ? 'option-on bg-white' : 'option-off'}>
                        <p className="font-bold">{d.label} <span className="font-normal text-ink/65">{d.price ? `+${formatPrice(d.price)}` : 'included'}</span></p>
                        <p className="mt-0.5 text-[15px] text-ink/70">Ready by {formatDate(ready.toISOString())}</p>
                      </button>
                    )
                  })}
                </div>
                {b.occasion_date && new Date(q.readyBy) > new Date(b.occasion_date + 'T23:59') && (
                  <p className="mt-3 rounded-xl bg-butter px-4 py-3 text-[15px]">This would be ready after {formatDate(b.occasion_date)}. Express may get it there in time.</p>
                )}
              </div>
              <div>
                <span className="label">Extras (optional)</span>
                <div className="space-y-3">
                  {EXTRAS.map((e) => {
                    const on = b.package.extras.includes(e.id)
                    return (
                      <label key={e.id} className={`flex cursor-pointer items-center gap-4 ${on ? 'option-on bg-white' : 'option-off'}`}>
                        <input
                          type="checkbox"
                          className="h-5 w-5 shrink-0 accent-[#143438]"
                          checked={on}
                          onChange={() => set('package', 'extras')(on ? b.package.extras.filter((x) => x !== e.id) : [...b.package.extras, e.id])}
                        />
                        <div className="flex-1"><p className="font-bold">{e.label}</p><p className="text-[15px] text-ink/70">{e.blurb}</p></div>
                        <p className="font-bold">+{formatPrice(e.price)}</p>
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="grid gap-5">
                <Field label="Your name" hint="Shown on the gift as who it’s from.">
                  <input className="input" value={b.buyer.name} onChange={set('buyer', 'name')} autoComplete="name" />
                </Field>
                <Field label="Your email" hint="We’ll tell you here when the song is ready.">
                  <input type="email" className="input" value={b.buyer.email} onChange={set('buyer', 'email')} autoComplete="email" />
                </Field>
              </div>
              <p className="rounded-xl bg-mint px-4 py-3 text-sm">Demo checkout. No payment is taken yet.</p>
            </section>
          )}

      </div>

      <ActionBar>
        {step < 4 ? (
          <button className="btn-dark w-full !py-4 !text-base" disabled={!valid[step]} onClick={() => setStep(step + 1)}>
            {step === 3 ? 'Choose the gift' : 'Continue'}
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold leading-none">{formatPrice(q.total)}</p>
              <p className="mt-1 text-xs text-ink/60">Ready by {formatDate(q.readyBy)}</p>
            </div>
            <button className="btn-primary !px-7 !py-4 !text-base" disabled={!valid[4] || submitting} onClick={submit}>
              {submitting ? <Spinner /> : 'Place order'}
            </button>
          </div>
        )}
      </ActionBar>
    </div>
  )
}

// A running summary, so specific detail feels rewarded.
function SoFar({ b, name, filled, tone }) {
  return (
    <div className={`mb-6 flex items-center gap-3 rounded-2xl px-4 py-3 ${tone?.tint || 'bg-lilac'}`}>
      <Spark size={20} className="shrink-0 text-coral" />
      <div className="min-w-0">
        <p className="truncate font-bold">A song for {name}</p>
        <p className="truncate text-[13px] text-ink/70">
          {b.occasion}
          {filled.length > 0 && ` · ${filled.length} detail${filled.length > 1 ? 's' : ''}`}
          {b.music.mood && ` · ${MOODS.find((m) => m.id === b.music.mood)?.label}`}
        </p>
      </div>
    </div>
  )
}

function Header({ title, sub }) {
  return (
    <div className="mt-2">
      <h1 className="text-[32px] leading-[1.1]">{title}</h1>
      <p className="mt-2.5 text-[17px] leading-relaxed text-ink/75">{sub}</p>
    </div>
  )
}

function Row({ label, onEdit, children }) {
  return (
    <div className="border-b border-ink/10 pb-6 last:border-0 last:pb-0">
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        <button className="text-[15px] font-bold underline decoration-coral decoration-2 underline-offset-4 hover:decoration-ink" onClick={onEdit}>Edit</button>
      </div>
      {children}
    </div>
  )
}
