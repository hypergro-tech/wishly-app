// What the buyer has paid for, and how many songs they can make right now:
// the songs left in this month of their plan, plus any single songs bought.
//
// On an iPhone with the App Store products available, purchases go through
// Apple (StoreKit 2, via expo-iap). Each purchase is sent to the backend
// (recordPurchase), which checks Apple's signature and keeps the count; the
// backend's startSong spends a song. So nothing here can be faked.
//
// Until Apple serves the products (they need the Paid Apps Agreement), and in
// the web preview, purchases are TEST purchases saved on this phone: no money
// moves. `isTest` says which. Once Wishly is launched (the backend's switch,
// base44/shared/launch.ts, read through getCredits) there are no test
// purchases at all: only Apple's.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AppState, Platform } from 'react-native'

import { b44, realSongs } from '@/api/base44Client'
import { useSession } from '@/api/session'
import { CURRENCY, PLANS, SONGS_PER_MONTH, planById, usPrice, type PlanId, type Price } from '@/lib/catalog'
import { wait } from '@/lib/motion'

// expo-iap is native code: only in the iPhone app, never the web preview.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const IAP: typeof import('expo-iap') | null = Platform.OS === 'ios' ? (() => { try { return require('expo-iap') } catch { return null } })() : null
type StorePurchase = import('expo-iap').Purchase

const SONG_SKU = planById('song').productId
const PLAN_SKUS = PLANS.filter((p) => p.per).map((p) => p.productId)

// The backend's count (base44/shared/credits.ts).
type Credits = {
  required: boolean
  plan: { id: Exclude<PlanId, 'song'>; since: string; renews_on: string; refills_on: string } | null
  plan_songs_left: number
  singles: number
  songs_left: number
}

// Thrown when the buyer closes Apple's sheet: not an error to show.
export class PurchaseCancelled extends Error {}
// Thrown when buying needs an account first.
export class SignInFirst extends Error {}

const call = async (name: string, body: object = {}) => (await b44().functions.invoke(name, body)).data as Credits

type Saved = {
  plan: { id: Exclude<PlanId, 'song'>; since: string } | null
  singles: number // single songs bought and not used yet
  used: { month: number; count: number } // plan songs used in the plan's current month
}

const KEY = 'wishly.wallet'
const EMPTY: Saved = { plan: null, singles: 0, used: { month: 0, count: 0 } }


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
  isTest: boolean // test purchases on this phone, not Apple
  launched: boolean // the backend's launch switch: real purchases only
  refresh: () => Promise<void>
  // What to do once a purchase on the plans screen goes through.
  setAfterPurchase: (fn: (() => void) | null) => void
  runAfterPurchase: () => void
  // What Apple charges for it in the buyer's App Store country (pounds in
  // the UK, rupees in India…); the US price until the store answers.
  price: (id: PlanId) => Price
}

const WalletContext = createContext<Wallet | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useSession()
  // Apple's store: on once the products load. Credits come from the backend.
  const [storeOn, setStoreOn] = useState(false)
  const [prices, setPrices] = useState<Partial<Record<PlanId, Price>>>({})
  const [credits, setCredits] = useState<Credits | null>(null)
  const pending = useRef<{ sku: string; resolve: () => void; reject: (e: unknown) => void } | null>(null)
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])
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

  const refresh = useCallback(async () => {
    // Signed out, getCredits still says whether Wishly is launched.
    if (!realSongs) return // demo mode: test purchases only
    const next = await call('getCredits').catch(() => null)
    setCredits(next)
  }, [])

  // Records a purchase Apple reports (a new one, a renewal, or a restore)
  // with the backend, then tells Apple it's handled. Without an account it
  // stays unfinished, and Apple reports it again next time.
  const settle = useCallback(async (p: StorePurchase) => {
    if (!userRef.current || !p.purchaseToken) throw new SignInFirst('Sign in first')
    const next = await call('recordPurchase', { signed: p.purchaseToken })
    if ((next as unknown as { error?: string })?.error) throw new Error((next as unknown as { error: string }).error)
    await IAP!.finishTransaction({ purchase: p, isConsumable: p.productId === SONG_SKU })
    setCredits(next)
  }, [])

  // Connect to Apple once, and listen for purchases for as long as the app runs.
  useEffect(() => {
    if (!IAP || !realSongs) return
    let live = true
    // Without the native module (e.g. Expo Go) this throws: stay on test purchases.
    let updated: { remove: () => void }, failed: { remove: () => void }
    try {
      updated = IAP.purchaseUpdatedListener((p) => {
        settle(p)
          .then(() => { if (pending.current?.sku === p.productId) pending.current.resolve() })
          .catch((e) => { if (pending.current?.sku === p.productId) pending.current.reject(e) })
          .finally(() => { if (pending.current?.sku === p.productId) pending.current = null })
      })
      failed = IAP.purchaseErrorListener((e) => {
        const cancelled = e.code === 'user-cancelled'
        pending.current?.reject(cancelled ? new PurchaseCancelled() : new Error(e.message))
        pending.current = null
      })
    } catch {
      return
    }
    ;(async () => {
      try {
        await IAP.initConnection()
        const [songs, plans] = await Promise.all([
          IAP.fetchProducts({ skus: [SONG_SKU], type: 'in-app' }),
          IAP.fetchProducts({ skus: PLAN_SKUS, type: 'subs' }),
        ])
        if (live) setStoreOn(Boolean(songs?.length && plans?.length))
        // Each country's own price, as Apple shows it on its payment sheet.
        const found = [...(songs ?? []), ...(plans ?? [])] as { id: string; displayPrice?: string; price?: number | null; currency?: string }[]
        const local: Partial<Record<PlanId, Price>> = {}
        for (const p of PLANS) {
          const s = found.find((x) => x.id === p.productId)
          if (s?.displayPrice) local[p.id] = { amount: typeof s.price === 'number' ? s.price : null, currency: s.currency || CURRENCY, label: s.displayPrice }
        }
        if (live) setPrices(local)
      } catch {
        if (live) setStoreOn(false) // No products yet: test purchases instead.
      }
    })()
    return () => { live = false; updated.remove(); failed.remove() }
  }, [settle])

  // The backend's count, whenever the buyer changes or the app comes back.
  useEffect(() => {
    const t = setTimeout(refresh, 0)
    return () => clearTimeout(t)
  }, [user, refresh])
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh() })
    return () => sub.remove()
  }, [refresh])

  async function save(next: Saved) {
    latest.current = next
    setSaved(next)
    await AsyncStorage.setItem(KEY, JSON.stringify(next))
  }

  async function buy(id: PlanId) {
    if (storeOn && IAP) {
      if (!userRef.current) throw new SignInFirst('Sign in first')
      const sku = planById(id).productId
      const done = new Promise<void>((resolve, reject) => { pending.current = { sku, resolve, reject } })
      await IAP.requestPurchase({ request: { apple: { sku } }, type: id === 'song' ? 'in-app' : 'subs' })
      return done
    }
    if (launched) throw new Error('The App Store isn’t available right now')
    await wait(900) // stands in for Apple's purchase sheet
    const w = latest.current
    if (id === 'song') return save({ ...w, singles: w.singles + 1 })
    // A new or changed plan starts a fresh month of songs today.
    await save({ ...w, plan: { id, since: new Date().toISOString() }, used: { month: 0, count: 0 } })
  }

  // Apple asks for a way to get back what was bought on another device or
  // after reinstalling. The test store only has what's on this phone.
  async function restore() {
    if (storeOn && IAP) {
      if (!userRef.current) throw new SignInFirst('Sign in first')
      const found = await IAP.getAvailablePurchases()
      for (const p of found) await settle(p).catch(() => {})
      const next = await call('getCredits')
      setCredits(next)
      return Boolean(next?.plan || next?.singles)
    }
    if (launched) return false
    await wait(600)
    return Boolean(latest.current.plan || latest.current.singles)
  }

  // Plan songs are used first, then single songs.
  async function spendSong() {
    // With Apple's store the backend spends the song (startSong); just recount.
    if (storeOn) return refresh()
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
  const launched = credits?.required === true
  const real = storeOn && credits
  const value: Wallet = {
    ready,
    plan: real ? (credits.plan ? { id: credits.plan.id, since: credits.plan.since } : null) : saved.plan,
    planSongsLeft: real ? credits.plan_songs_left : left,
    singles: real ? credits.singles : saved.singles,
    songsLeft: real ? credits.songs_left : left + saved.singles,
    refillsOn: real ? (credits.plan ? new Date(credits.plan.refills_on) : null) : saved.plan ? nextRefill(saved.plan.since) : null,
    isTest: !storeOn && !launched,
    launched,
    refresh,
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
    price: (id) => prices[id] ?? usPrice(id),
  }
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const w = useContext(WalletContext)
  if (!w) throw new Error('useWallet must be inside WalletProvider')
  return w
}
