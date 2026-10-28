import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listOrders } from '../api/orders'
import LyricPlayer from '../components/LyricPlayer'
import { Logo, Ribbon, Spark } from '../components/brand'
import { Sheet } from '../components/app'
import { Eyebrow } from '../components/ui'
import { CORE_PACKAGE, DELIVERY, EXAMPLES, OCCASION_TONES, formatDate, formatPrice } from '../lib/catalog'

const STEPS = [
  ['Tell us who it’s for', 'Their name, and how you say it.'],
  ['Share one small memory', 'The nickname, the kitchen dance, the thing they always say.'],
  ['Choose the musical feeling', 'Mood, style and language. No musical skills needed.'],
  ['Listen, check, then give', 'You check every name and fact before it’s given.'],
]

const OCCASION_TILES = ['Birthday', 'Anniversary', "Mother's Day", 'Wedding', 'Just because', 'Remembrance']

const ACTIVE_COPY = {
  in_production: (o) => ({ tint: 'bg-butter', title: `We’re writing ${o.recipient.name}’s song.`, sub: `Ready to listen and check by ${formatDate(o.ready_by)}.` }),
  ready_for_review: (o) => ({ tint: 'bg-lilac', title: `${o.recipient.name}’s song is ready for you to listen and check.`, sub: 'Tap to listen' }),
  correction_requested: (o) => ({ tint: 'bg-butter', title: `We’re making your correction to ${o.recipient.name}’s song.`, sub: 'You’ll hear the new version first.' }),
}

export default function Home() {
  const [example, setExample] = useState(null)
  const [active, setActive] = useState([])

  useEffect(() => { listOrders().then((rows) => setActive(rows.filter((o) => ACTIVE_COPY[o.status]).slice(0, 2))) }, [])

  return (
    <div className="pb-6">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-ink/10 bg-ivory/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
        <Logo size={24} />
      </header>

      {active.length > 0 && (
        <section className="space-y-2.5 px-4 pt-4">
          {active.map((o) => {
            const c = ACTIVE_COPY[o.status](o)
            return (
              <Link key={o.id} to={`/orders/${o.id}`} className={`flex items-center gap-3 rounded-2xl p-4 ${c.tint}`}>
                <Spark size={22} className="shrink-0 text-coral" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-snug">{c.title}</p>
                  <p className="mt-0.5 text-sm text-ink/70">{c.sub}</p>
                </div>
                <span className="text-xl text-ink/40">›</span>
              </Link>
            )
          })}
        </section>
      )}

      {/* Hero */}
      <section className="px-4 pt-7">
        <Eyebrow>Personal songs, made for one person</Eyebrow>
        <h1 className="mt-3 text-[40px] leading-[1.03]">A song only they could recognize.</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ink/80">
          Share their name and a moment you remember. We turn it into a song they’ll want to hear again.
        </p>
        <img src="/brand/sunday-pancakes.jpg" alt="A couple sharing earphones on the kitchen floor over a stack of pancakes" className="mt-6 aspect-[4/3] w-full rounded-[24px] object-cover" />
        <figure className="relative mx-3 -mt-8 rounded-2xl bg-ivory p-4 shadow-[0_10px_30px_-12px_rgba(20,52,56,0.35)]">
          <blockquote className="accent text-[17px] leading-snug">“Sunday pancakes, and the first one always burns. Ten years in, it’s still my favorite turn.”</blockquote>
          <figcaption className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink/55">Example lyric · Anniversary</figcaption>
        </figure>
        <div className="mt-5 grid gap-2.5">
          <Link to="/create" className="btn-primary !py-4 !text-base">Start their song</Link>
          <button onClick={() => document.getElementById('examples')?.scrollIntoView({ behavior: 'smooth' })} className="btn-berry !py-4 !text-base">Hear an example</button>
        </div>
        <p className="mt-4 text-center text-sm text-ink/65">{formatPrice(CORE_PACKAGE.price)} · ready in {DELIVERY[0].days} days · you check every name first</p>
      </section>

      {/* Brand idea */}
      <section className="mx-4 mt-10 rounded-[24px] bg-ink p-6 text-ivory">
        <Spark size={36} />
        <p className="mt-5 text-2xl font-bold leading-tight tracking-[-0.02em]">The name you call them. The kitchen dance. The thing they always say.</p>
        <p className="accent mt-3 text-[17px] text-ivory/80">Small details, sung back, until they say: “This is about us.”</p>
      </section>

      {/* Examples */}
      <section id="examples" className="scroll-mt-16 pt-10">
        <div className="px-4">
          <Eyebrow>Hear an example</Eyebrow>
          <h2 className="mt-2 text-[28px] leading-tight">Lead with a detail they’d recognize.</h2>
        </div>
        <div className="no-scrollbar mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2">
          {EXAMPLES.map((e) => (
            <button key={e.id} onClick={() => setExample(e)} className={`w-[78%] shrink-0 snap-start overflow-hidden rounded-[22px] text-left ${e.tint}`}>
              <img src={e.photo} alt={e.photoAlt} className="aspect-[4/3] w-full object-cover" />
              <div className="p-4">
                <p className="text-[13px] font-bold text-ink/60">{e.occasion}</p>
                <p className="mt-1 text-lg font-bold leading-snug">{e.detail}</p>
                <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-coral px-4 py-2 text-sm font-bold">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" /></svg>
                  Play “{e.title}”
                </span>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-2 px-4 text-xs text-ink/50">Example songs. Photography is illustrative, not customer stories.</p>
      </section>

      {/* Occasions */}
      <section className="px-4 pt-10">
        <Eyebrow>Start a song for</Eyebrow>
        <h2 className="mt-2 text-[28px] leading-tight">Every reason, its own temperature.</h2>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {OCCASION_TILES.map((o) => (
            <Link key={o} to={`/create?occasion=${encodeURIComponent(o)}`} className={`flex min-h-[132px] flex-col justify-between rounded-[20px] p-4 ${OCCASION_TONES[o].tint}`}>
              <p className="font-bold">{o}</p>
              <p className="accent text-[15px] leading-snug text-ink/80">{OCCASION_TONES[o].line}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pt-10">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-2 text-[28px] leading-tight">One small memory is enough to begin.</h2>
        <ol className="mt-5 space-y-2.5">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="flex gap-4 rounded-[20px] border border-ink/10 bg-white p-4">
              <span className="eyebrow mt-1">0{i + 1}</span>
              <div>
                <p className="font-bold">{t}</p>
                <p className="mt-0.5 text-[15px] text-ink/70">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Price */}
      <section className="px-4 pt-10">
        <div className="rounded-[24px] bg-ink p-6 text-ivory">
          <div className="flex items-baseline justify-between">
            <p className="text-xl font-bold">{CORE_PACKAGE.name}</p>
            <p className="text-4xl font-bold tracking-tight">{formatPrice(CORE_PACKAGE.price)}</p>
          </div>
          <ul className="mt-5 space-y-3">
            {CORE_PACKAGE.includes.map((i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-snug"><Spark size={14} className="mt-1 shrink-0 text-coral" />{i}</li>
            ))}
          </ul>
          <p className="mt-5 border-t border-ivory/15 pt-4 text-sm text-ivory/75">
            Ready in {DELIVERY[0].days} days. Express in 24 hours for +{formatPrice(DELIVERY[1].price)}. Extras from +$9.
          </p>
          <Link to="/create" className="btn-primary mt-5 w-full !py-4 !text-base">Start their song</Link>
        </div>
      </section>

      <section className="relative mx-4 mt-10 overflow-hidden rounded-[24px] bg-butter p-6">
        <Ribbon className="pointer-events-none absolute -right-8 top-2 w-56 text-coral" />
        <p className="relative mt-14 text-[26px] font-bold leading-tight">A little more personal.<br />A little more theirs.</p>
      </section>

      {example && (
        <Sheet title={example.title} sub={`${example.for} · ${example.mood}`} onClose={() => setExample(null)}>
          <div className="mt-5">
            <LyricPlayer autoPlay compact showLabels={false} mood="tender" sections={[{ label: '', lines: example.lines }]} />
          </div>
          <Link to={`/create?occasion=${encodeURIComponent(example.occasion)}`} className="btn-primary mt-6 w-full !py-4">Start a song like this</Link>
        </Sheet>
      )}
    </div>
  )
}
