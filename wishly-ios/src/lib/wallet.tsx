// What the buyer has paid for, and how many songs they can make right now:
// the songs left in this month of their plan, plus any single songs bought.
//
// For now every purchase is a TEST purchase saved on this phone: no money
// moves and nothing reaches Apple. Before launch, buy() and restore() go
// through StoreKit with the product ids in catalog.ts, and the backend checks
// the receipt before it makes a song, so the count here can't be faked.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

import { SONGS_PER_MONTH, type PlanId } from '@/lib/catalog'
import { wait } from '@/lib/motion'

type Saved = {
  plan: { id: Exclude<PlanId, 'song'>; since: string } | null
  singles: number // single songs bought and not used yet
  used: { month: number; count: number } // plan songs used in the plan's current month
}

const KEY = 'wishly.wallet'
const EMPTY: Saved = { plan: null, singles: 0, used: { month: 0, count: 0 } }

export const testStore = true

// Which month of the plan it is, counted from the day it started: a plan
// bought on the 20th refills on the 20th.
function planMonth(since: string, now = new Date()) {
  const s = new Date(since)
  const months = (now.getFullYear() - s.getFullYear()) * 12 + now.getMonth() - s.getMonth()
  return now.getDate() < s.getDate() ? months - 1 : months
}

function planSongsLeft(w: Saved) {
  if (!w.plan) return 0
  const used = w.used.month === planMonth(w.plan.since) ? w.used.count : 0
  return Math.max(0, SONGS_PER_MONTH - used)
}

// The day the plan's songs refill.
function nextRefill(since: string) {
  const d = new Date(since)
  d.setMonth(d.getMonth() + planMonth(since) + 1)
  return d
}

type Wallet = {
  ready: boolean
  plan: Saved['plan']
  planSongsLeft: number
  singles: number
  songsLeft: number
  refillsOn: Date | null
  buy: (id: PlanId) => Promise<void>
  restore: () => Promise<boolean>
  spendSong: () => Promise<void>
  resetTest: () => Promise<void>
  // What to do once a purchase on the plans screen goes through.
  setAfterPurchase: (fn: (() => void) | null) => void
  runAfterPurchase: () => void
}

const WalletContext = createContext<Wallet | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Saved>(EMPTY)
  const [ready, setReady] = useState(false)
  const after = useRef<(() => void) | null>(null)
  // The latest copy, so two quick changes in a row build on each other.
  const latest = useRef(saved)

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => { if (raw) { latest.current = { ...EMPTY, ...JSON.parse(raw) }; setSaved(latest.current) } })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  async function save(next: Saved) {
    latest.current = next
    setSaved(next)
    await AsyncStorage.setItem(KEY, JSON.stringify(next))
  }

  async function buy(id: PlanId) {
    await wait(900) // stands in for Apple's purchase sheet
    const w = latest.current
    if (id === 'song') return save({ ...w, singles: w.singles + 1 })
    // A new or changed plan starts a fresh month of songs today.
    await save({ ...w, plan: { id, since: new Date().toISOString() }, used: { month: 0, count: 0 } })
  }

  // Apple asks for a way to get back what was bought on another device or
  // after reinstalling. The test store only has what's on this phone.
  async function restore() {
    await wait(600)
    return Boolean(latest.current.plan || latest.current.singles)
  }

  // Plan songs are used first, then single songs.
  async function spendSong() {
    const w = latest.current
    if (w.plan && planSongsLeft(w) > 0) {
      const month = planMonth(w.plan.since)
      const count = w.used.month === month ? w.used.count + 1 : 1
      return save({ ...w, used: { month, count } })
    }
    if (w.singles > 0) return save({ ...w, singles: w.singles - 1 })
    throw new Error('No songs left')
  }

  const left = planSongsLeft(saved)
  const value: Wallet = {
    ready,
    plan: saved.plan,
    planSongsLeft: left,
    singles: saved.singles,
    songsLeft: left + saved.singles,
    refillsOn: saved.plan ? nextRefill(saved.plan.since) : null,
    buy,
    restore,
    spendSong,
    resetTest: () => save(EMPTY),
    setAfterPurchase: (fn) => { after.current = fn },
    runAfterPurchase: () => {
      const fn = after.current
      after.current = null
      fn?.()
    },
  }
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const w = useContext(WalletContext)
  if (!w) throw new Error('useWallet must be inside WalletProvider')
  return w
}
