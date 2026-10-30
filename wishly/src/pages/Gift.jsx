import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getGift } from '../api/orders'
import LyricPlayer from '../components/LyricPlayer'
import { Logo, Spark } from '../components/brand'
import { Spinner } from '../components/ui'
import { quoted } from '../lib/text'

export default function Gift() {
  const { token } = useParams()
  const [order, setOrder] = useState(undefined)
  const [opened, setOpened] = useState(false)

  useEffect(() => { getGift(token).then(setOrder) }, [token])

  if (order === undefined) return <Cover><Spinner /></Cover>
  if (order === null) return <Cover><p className="text-lg text-ink/80">This gift link isn’t available.</p></Cover>

  const { recipient, song, gift } = order

  // The digital gift cover: keep the recipient's name prominent.
  if (!opened) {
    return (
      <Cover>
        <Spark size={112} className="text-coral" />
        <h1 className="mt-10 text-[44px] leading-[1.05] text-ink">A song for {recipient.name}</h1>
        <p className="mt-4 text-lg text-ink/75">From someone who knows you.</p>
        <button onClick={() => setOpened(true)} className="btn-primary mt-10 w-full max-w-xs !py-4 !text-base">Listen to your song</button>
        <div className="absolute bottom-[max(env(safe-area-inset-bottom),28px)]"><Logo size={22} /></div>
      </Cover>
    )
  }

  return (
    <div className="flex-1 bg-cream px-5 pb-12 pt-[max(env(safe-area-inset-top),28px)]">
      <p className="eyebrow">A song for {recipient.name}</p>
      <h1 className="mt-2 text-[34px] leading-tight">{song.title}</h1>

      {gift.message ? (
        <figure className="mt-6 border-l-4 border-coral pl-4">
          <blockquote className="accent whitespace-pre-line text-[22px] leading-snug">{quoted(gift.message)}</blockquote>
          <figcaption className="mt-2.5 text-[15px] font-bold">{gift.from_name}</figcaption>
        </figure>
      ) : (
        <p className="mt-3 text-lg">From {gift.from_name}</p>
      )}

      <div className="mt-8 rounded-[22px] bg-white p-5 shadow-[0_0_0_1px_rgba(20,52,56,0.1)]">
        <LyricPlayer autoPlay sections={song.sections} mood={order.music.mood} audioUrl={song.audio_url} maxHeight="none" />
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <Logo size={20} />
        <p className="text-sm text-ink/60">Keep this link to listen again. Only people you share it with can open it.</p>
      </div>
    </div>
  )
}

function Cover({ children }) {
  return <div className="relative flex flex-1 flex-col items-center justify-center bg-butter px-6 py-16 text-center">{children}</div>
}
