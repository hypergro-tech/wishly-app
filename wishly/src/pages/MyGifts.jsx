import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listOrders } from '../api/orders'
import { Spark } from '../components/brand'
import { Spinner, StatusBadge } from '../components/ui'
import { OCCASION_TONES, formatDate } from '../lib/catalog'

export default function MyGifts() {
  const [orders, setOrders] = useState(null)
  useEffect(() => { listOrders().then(setOrders) }, [])

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-cream/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
        <h1 className="flex h-14 items-center text-[22px]">My gifts</h1>
      </header>
      <div className="flex-1 px-4 py-5">
        {!orders ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : orders.length === 0 ? (
          <div className="mt-6 rounded-[24px] bg-lilac p-8 text-center">
            <Spark size={40} className="mx-auto text-coral" />
            <p className="mt-5 text-2xl font-bold">No songs yet.</p>
            <p className="mt-2 text-ink/75">One small memory is enough to begin.</p>
            <Link to="/create" className="btn-primary mt-6 w-full !py-4">Start their song</Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {orders.map((o) => (
              <li key={o.id}>
                <Link to={`/orders/${o.id}`} className="flex items-center gap-3.5 rounded-[20px] border border-ink/10 bg-white p-4 active:bg-ink/5">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${OCCASION_TONES[o.occasion]?.tint || 'bg-lilac'}`}>
                    <Spark size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-bold">A song for {o.recipient.name}</p>
                    <p className="truncate text-[13px] text-ink/60">{o.occasion} · {formatDate(o.created_date)}</p>
                    <div className="mt-2"><StatusBadge status={o.status} /></div>
                  </div>
                  <span className="text-xl text-ink/30">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
