import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { applyCorrection, approveAndWrap, finishProduction, getOrder, requestCorrection } from '../api/orders'
import LyricPlayer from '../components/LyricPlayer'
import { Rhythm, Spark } from '../components/brand'
import { ActionBar, Sheet, TopBar } from '../components/app'
import { Eyebrow, Field, SpeakButton, Spinner, StatusBadge } from '../components/ui'
import { EXTRAS, MEMORY_PROMPTS, formatDate, formatPrice } from '../lib/catalog'

export default function Order() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [panel, setPanel] = useState(null) // 'correct' | 'approve'

  useEffect(() => { getOrder(id).then(setOrder, () => setError('We couldn’t find that order.')) }, [id])

  const run = async (fn) => {
    setBusy(true)
    try { setOrder(await fn()); setPanel(null) } finally { setBusy(false) }
  }

  if (error) return <Screen><Centered><p className="text-lg">{error}</p><Link to="/my-gifts" className="btn-ghost mt-5">My gifts</Link></Centered></Screen>
  if (!order) return <Screen><Centered><Spinner /></Centered></Screen>

  const { recipient, song, status } = order
  const giftUrl = order.gift_token && `${window.location.origin}/gift/${order.gift_token}`
  const hasSong = song && (status === 'ready_for_review' || status === 'approved')

  return (
    <Screen title={`A song for ${recipient.name}`}>
      <div className="flex-1 px-4 pb-8 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>{order.occasion}</Eyebrow>
            <h1 className="mt-2 text-[32px] leading-[1.1]">A song for {recipient.name}</h1>
          </div>
        </div>
        <div className="mt-3"><StatusBadge status={status} /></div>
        <Timeline status={status} />

        {status === 'in_production' && (
          <Waiting
            title={`We’re writing ${recipient.name}’s song.`}
            body={<>It will be ready for you to listen and check by <b>{formatDate(order.ready_by)}</b>. We’ll email {order.buyer.email} when it is.</>}
            demo={<DemoButton busy={busy} onClick={() => run(() => finishProduction(order))}>Finish the song now</DemoButton>}
          />
        )}

        {status === 'correction_requested' && (
          <Waiting
            title="We’re making your correction."
            body={<>You asked: <span className="accent">“{order.corrections.at(-1).note || 'Updated details'}”</span>. You’ll hear the new version before anything is given.</>}
            demo={<DemoButton busy={busy} onClick={() => run(() => applyCorrection(order))}>Deliver the corrected version</DemoButton>}
          />
        )}

        {status === 'ready_for_review' && (
          <div className="mt-6 rounded-[22px] bg-lilac p-5">
            <p className="text-xl font-bold leading-snug">Their song is ready for you to listen and check.</p>
            <ul className="mt-3 space-y-2 text-[15px] leading-snug text-ink/80">
              <li>Is <b>{recipient.name}</b> sung the way you say it?</li>
              <li>Are the details and facts right?</li>
              <li>Does anything feel off for them?</li>
            </ul>
            <div className="mt-4"><SpeakButton text={recipient.pronunciation || recipient.name} label={`Hear “${recipient.name}”`} /></div>
          </div>
        )}

        {status === 'approved' && (
          <div className="mt-6 rounded-[22px] bg-ink p-5 text-ivory">
            <Spark size={24} />
            <p className="mt-3 text-2xl font-bold">Ready to give.</p>
            <p className="mt-1.5 text-[15px] text-ivory/75">Send {recipient.name} this private link. No account needed to listen.</p>
            <p className="mt-4 truncate rounded-xl bg-ivory/10 px-3.5 py-3 text-sm text-ivory/85">{giftUrl}</p>
            <p className="mt-3 text-sm text-ivory/60">Opened {order.gift.opened_count || 0} time{order.gift.opened_count === 1 ? '' : 's'}</p>
          </div>
        )}

        {hasSong && (
          <div className="mt-5 rounded-[22px] bg-white p-5 shadow-[0_0_0_1px_rgba(20,52,56,0.1)]">
            <p className="text-[13px] text-ink/60">Version {order.song_version} · {song.style}</p>
            <h2 className="mb-5 mt-1 text-2xl">{song.title}</h2>
            <LyricPlayer sections={song.sections} mood={order.music.mood} audioUrl={song.audio_url} maxHeight="none" />
          </div>
        )}

        <div className="mt-5 rounded-[22px] border border-ink/10 bg-white p-5 text-[15px]">
          <p className="eyebrow">Your order</p>
          <dl className="mt-3 space-y-2 text-ink/75">
            <div className="flex justify-between"><dt>Personal Song</dt><dd>{order.package.delivery === 'express' ? 'Express' : 'Standard'}</dd></div>
            {order.package.extras.map((x) => <div key={x} className="flex justify-between"><dt>{EXTRAS.find((e) => e.id === x)?.label}</dt><dd>Added</dd></div>)}
            <div className="flex justify-between border-t border-ink/10 pt-2 font-bold text-ink"><dt>Total</dt><dd>{formatPrice(order.price_total)}</dd></div>
          </dl>
        </div>
      </div>

      {status === 'ready_for_review' && (
        <ActionBar>
          <div className="grid gap-2">
            <button className="btn-primary !py-4 !text-base" onClick={() => setPanel('approve')}>It’s right. Get it ready to give</button>
            <button className="btn-ghost !py-3.5" onClick={() => setPanel('correct')}>Something needs another look</button>
          </div>
          <p className="mt-2 text-center text-xs text-ink/60">
            {order.corrections.length === 0 ? 'One correction round is included.' : 'Wrong names and facts are always corrected at no cost.'}
          </p>
        </ActionBar>
      )}

      {status === 'approved' && (
        <ActionBar>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <ShareButton url={giftUrl} name={recipient.name} />
            <button className="btn-ghost !py-4" onClick={() => setPanel('approve')}>Edit message</button>
          </div>
          <a href={giftUrl} target="_blank" rel="noreferrer" className="mt-2 block py-1.5 text-center text-sm font-bold underline decoration-coral decoration-2 underline-offset-4">Preview what they’ll see</a>
        </ActionBar>
      )}

      {panel === 'correct' && <CorrectionSheet order={order} busy={busy} onClose={() => setPanel(null)} onSubmit={(c) => run(() => requestCorrection(order, c))} />}
      {panel === 'approve' && <ApproveSheet order={order} busy={busy} onClose={() => setPanel(null)} onSubmit={(g) => run(() => approveAndWrap(order, g))} />}
    </Screen>
  )
}

function Screen({ title, children }) {
  return (
    <div className="flex flex-1 flex-col">
      <TopBar back="/my-gifts" title={title} />
      {children}
    </div>
  )
}

const STAGES = [
  ['Brief', ['in_production', 'ready_for_review', 'correction_requested', 'approved']],
  ['Written', ['ready_for_review', 'correction_requested', 'approved']],
  ['Checked', ['approved']],
  ['Ready', ['approved']],
]

function Timeline({ status }) {
  return (
    <ol className="mt-5 grid grid-cols-4 gap-1.5">
      {STAGES.map(([label, done]) => (
        <li key={label}>
          <div className={`h-1.5 rounded-full ${done.includes(status) ? 'bg-ink' : 'bg-ink/10'}`} />
          <p className={`mt-1.5 text-xs ${done.includes(status) ? 'font-bold' : 'text-ink/55'}`}>{label}</p>
        </li>
      ))}
    </ol>
  )
}

function Waiting({ title, body, demo }) {
  return (
    <div className="mt-6 rounded-[22px] bg-butter p-6">
      <Rhythm className="max-w-[220px]" on="bg-ink/70" />
      <h2 className="mt-6 text-2xl leading-tight">{title}</h2>
      <p className="mt-2 text-[17px] leading-relaxed text-ink/80">{body}</p>
      {demo}
    </div>
  )
}

function DemoButton({ busy, onClick, children }) {
  return (
    <div className="mt-6 border-t border-dashed border-ink/25 pt-5">
      <p className="eyebrow mb-3 !text-ink/50">Demo only</p>
      <button className="btn-ghost w-full" disabled={busy} onClick={onClick}>{busy ? <Spinner /> : children}</button>
    </div>
  )
}

// Uses the phone's share sheet where available, otherwise copies the link.
function ShareButton({ url, name }) {
  const [copied, setCopied] = useState(false)
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `A song for ${name}`, url }) } catch { /* dismissed */ }
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button className="btn-primary !py-4 !text-base" onClick={share}>
      {copied ? 'Link copied' : `Send to ${name}`}
    </button>
  )
}

const KINDS = [
  { id: 'name', label: 'Their name or how it’s said' },
  { id: 'fact', label: 'A detail or fact' },
  { id: 'wording', label: 'A line doesn’t sound right' },
  { id: 'other', label: 'Something else' },
]

function CorrectionSheet({ order, busy, onClose, onSubmit }) {
  const [kind, setKind] = useState('name')
  const [note, setNote] = useState('')
  const [recipient, setRecipient] = useState({ name: order.recipient.name, pronunciation: order.recipient.pronunciation })
  const [field, setField] = useState(MEMORY_PROMPTS.find((m) => order.memories[m.key])?.key || 'ritual')
  const [value, setValue] = useState(order.memories[field] || '')

  const changes = kind === 'name' ? { recipient } : kind === 'fact' ? { memories: { [field]: value } } : {}
  const canSubmit = kind === 'name' || kind === 'fact' || note.trim()

  return (
    <Sheet title="What needs another look?" sub="Tell us what’s not right. You’ll hear the new version first." onClose={onClose}>
      <div className="mt-5 space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map((k) => (
            <button key={k.id} aria-pressed={kind === k.id} onClick={() => setKind(k.id)} className={`${kind === k.id ? 'option-on bg-white' : 'option-off'} !p-3 text-[15px] font-bold`}>{k.label}</button>
          ))}
        </div>
        {kind === 'name' && (
          <div className="space-y-4 rounded-2xl bg-lilac p-4">
            <p className="text-[15px]">That name needs another look? You can correct it here.</p>
            <Field label="Name"><input className="input" value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} /></Field>
            <Field label="How it’s said">
              <div className="flex gap-2">
                <input className="input" value={recipient.pronunciation} onChange={(e) => setRecipient({ ...recipient, pronunciation: e.target.value })} />
                <SpeakButton text={recipient.pronunciation || recipient.name} label="Hear" />
              </div>
            </Field>
          </div>
        )}
        {kind === 'fact' && (
          <div className="space-y-4 rounded-2xl bg-lilac p-4">
            <Field label="Which detail?">
              <select className="input" value={field} onChange={(e) => { setField(e.target.value); setValue(order.memories[e.target.value] || '') }}>
                {MEMORY_PROMPTS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="What it should say"><textarea rows={2} className="input" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
          </div>
        )}
        <Field label={kind === 'wording' ? 'Which line, and what should change?' : 'Anything else we should know? (optional)'}>
          <textarea rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <button className="btn-dark w-full !py-4 !text-base" disabled={!canSubmit || busy} onClick={() => onSubmit({ kind, note: note || KINDS.find((k) => k.id === kind).label, changes })}>
          {busy ? <Spinner /> : 'Send correction'}
        </button>
      </div>
    </Sheet>
  )
}

function ApproveSheet({ order, busy, onClose, onSubmit }) {
  const [message, setMessage] = useState(order.gift?.message || '')
  const [from, setFrom] = useState(order.gift?.from_name || order.buyer.name)
  return (
    <Sheet title="A few words from you" sub={`${order.recipient.name} will see this just before the song.`} onClose={onClose}>
      <div className="mt-5 space-y-5">
        <Field label="Your message">
          <textarea rows={4} className="input accent !text-lg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="For the way you turn an ordinary Sunday into our favorite day." />
        </Field>
        <Field label="From"><input className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <button className="btn-primary w-full !py-4 !text-base" disabled={!from.trim() || busy} onClick={() => onSubmit({ message, from_name: from })}>
          {busy ? <Spinner /> : order.status === 'approved' ? 'Save message' : 'Create their gift link'}
        </button>
      </div>
    </Sheet>
  )
}

function Centered({ children }) {
  return <div className="flex flex-1 flex-col items-center justify-center py-24">{children}</div>
}
