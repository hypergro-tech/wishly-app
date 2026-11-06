// Watches songs being made and shows the "ready" pop-up the moment one is
// done, whichever screen is open. A song is watched once it's ordered or
// corrected (api/orders), and on launch any still being made are picked up,
// in case the app was closed meanwhile. Done means ready to listen and check
// (Order.status 'ready_for_review').
import { useEffect, useState, type ReactNode } from 'react'

import { realSongs } from '@/api/base44Client'
import { getOrder, listOrders, type Order } from '@/api/orders'
import { useSession } from '@/api/session'
import { SongReadyModal } from '@/components/SongReadyModal'
import { GIVE_UP_MS, onWatch, unwatchSong, watchSong, watchedFor, watchedSongs } from './watch'

const EVERY = 8000
// Base44 dates come without a time zone but are UTC.
const utc = (date: string) => new Date(/Z|[+-]\d\d:?\d\d$/.test(date) ? date : `${date}Z`).getTime()
const making = (o: Order) => o.status === 'in_production' || o.status === 'correction_requested'

export function SongReadyProvider({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const [count, setCount] = useState(watchedSongs().length)
  const [ready, setReady] = useState<Order | null>(null)

  useEffect(() => onWatch(() => setCount(watchedSongs().length)), [])

  useEffect(() => {
    if (!realSongs || !user) return
    // Only recent ones: orders stuck from before songs started automatically never finish.
    const recent = (o: Order) => Date.now() - utc(o.updated_date ?? o.created_date) < GIVE_UP_MS
    listOrders().then((orders) => orders.filter((o) => making(o) && recent(o)).forEach((o) => watchSong(o.id)), () => {})
  }, [user])

  useEffect(() => {
    if (!count) return
    const timer = setInterval(() => {
      for (const id of watchedSongs()) {
        if (watchedFor(id) > GIVE_UP_MS) { unwatchSong(id); setCount(watchedSongs().length); continue }
        getOrder(id).then((o) => {
          if (making(o)) {
            // A take that never passed waits for a person to listen; stop asking.
            if (o.name_check?.needs_person) { unwatchSong(id); setCount(watchedSongs().length) }
            return
          }
          unwatchSong(id)
          setCount(watchedSongs().length)
          if (o.status === 'ready_for_review') setReady(o)
        }, () => {})
      }
    }, EVERY)
    return () => clearInterval(timer)
  }, [count])

  return (
    <>
      {children}
      <SongReadyModal order={ready} onClose={() => setReady(null)} />
    </>
  )
}
