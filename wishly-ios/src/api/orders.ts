// Orders, the one Base44 entity Wishly uses (schema: base44/entities/order.jsonc).
// The web app reads and writes the same records.

import { quote, type Tint } from '@/lib/catalog'
import { type Song } from '@shared/songwriter'
import { LYRICS_SCHEMA, parseLyrics } from '@shared/lyricGenerator'
import { generateSongPayload, songInputs, startingSong } from '@shared/songPipeline'
import type { SongPayload } from '@shared/songEngine'
import { watchSong } from '@/lib/watch'
import type { Rating } from './feedbackApi'
import { b44, realSongs } from './base44Client'
import { pushToken } from '@/lib/notifications'

export type Status = 'in_production' | 'ready_for_review' | 'correction_requested' | 'approved'

export type Order = {
  id: string
  created_date: string
  updated_date?: string
  status: Status
  recipient: { name: string; pronunciation: string; pronouns: string; relationship: string }
  occasion: string
  occasion_date: string
  memories: Record<string, string>
  music: { mood: string; genre: string; voice: string; language: string }
  package: { delivery: string; extras: string[] }
  buyer: { name: string; email: string }
  price_total: number
  ready_by: string
  song: Song | null
  song_version: number
  corrections: { kind: string; note: string; changes: Record<string, unknown>; at: string; resolved: boolean }[]
  gift_token?: string
  push_token?: string // this phone's Expo push address, for "your song is ready"
  cover?: number // which of the five cover artworks, 0–4: each new song takes the next
  gift: { message: string; from_name: string; opened_count: number } | null
  // Set by the makeSong function: which spellings were sung and whether the name was heard.
  name_check?: { passed: boolean; needs_person: boolean; tries: { spelling: string; heard: number; refused?: boolean }[]; error?: string }
  // The buyer's thumbs up or down (src/api/feedbackApi.ts).
  feedback?: { rating: Rating; reason?: string; version?: number; at: string } | null
}

export type Brief = Pick<Order, 'recipient' | 'occasion' | 'occasion_date' | 'memories' | 'music' | 'package' | 'buyer'>

// Order.status lifecycle:
// in_production -> ready_for_review -> (correction_requested -> ready_for_review)* -> approved
export const STATUS: Record<Status, { label: string; tint: Tint | 'coral' }> = {
  in_production: { label: 'Writing their song', tint: 'butter' },
  ready_for_review: { label: 'Ready to listen and check', tint: 'coral' },
  correction_requested: { label: 'Making your correction', tint: 'butter' },
  approved: { label: 'Ready to give', tint: 'mint' },
}

const Orders = () => b44().entities.Order

// Against Base44 an order's status, song and gift link are written only by
// backend functions (startSong, makeSong, approveSong): the Order entity locks
// those fields, so the app can't approve an unchecked song or change its audio.
// The demo store on the phone writes them itself.
const invoke = async (name: string, body: object) => (await b44().functions.invoke(name, body)).data

const newToken = () =>
  Array.from({ length: 16 }, () => '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]).join('')

// `payload` is the song engine's output for this brief (Review makes it when
// Create song is tapped); corrections make a fresh one from the changed order.
export async function placeOrder(brief: Brief, payload?: SongPayload): Promise<Order> {
  const q = quote(brief.package)
  // Each new song takes the next of the five covers: 1, 2, 3, 4, 5, then 1 again.
  const earlier = await listOrders().catch(() => [])
  const order: Order = await Orders().create({
    ...brief,
    cover: earlier.length % 5,
    price_total: q.total,
    ready_by: q.readyBy,
    corrections: [],
    gift: null,
    // Base44 fills these in from the entity's defaults.
    ...(realSongs ? {} : { status: 'in_production', song: null, song_version: 0 }),
  })
  // With the real backend, singing starts as soon as the order is saved. The
  // demo store waits for the "Finish the song now" button instead.
  return realSongs ? compose(order, payload) : order
}

async function compose(order: Order, payload = generateSongPayload(songInputs(order))): Promise<Order> {
  if (realSongs) {
    // startSong saves the template version from the order as saved; makeSong
    // then writes the lyrics, sings and checks them. Nothing the app sends is
    // sung, so `payload` isn't used here.
    const started: Order = await invoke('startSong', { order_id: order.id })
    // Takes a minute or more; the song screen checks the order meanwhile, and
    // the ready pop-up shows wherever they are once it's done.
    watchSong(order.id)
    b44().functions.invoke('makeSong', { order_id: order.id }).catch(() => {})
    return started
  }

  const { title, lyricPrompt } = payload
  const fallback = startingSong(order, payload)
  const version = (order.song_version || 0) + 1
  const result = await b44().integrations.Core.InvokeLLM({ prompt: lyricPrompt, response_json_schema: LYRICS_SCHEMA, context: { order } })
  const sections = typeof result?.lyrics === 'string' ? parseLyrics(result.lyrics) : result?.sections
  const song: Song = sections?.length ? { ...fallback, title: result.title || title, sections } : fallback
  return Orders().update(order.id, { song, song_version: version, status: 'ready_for_review' })
}

// A sounds-like spelling for a tricky name nobody has tested yet (Gemini, on the backend).
export async function suggestSpelling(name: string): Promise<string | null> {
  const res = await b44().functions.invoke('suggestSpelling', { name })
  return res?.data?.spellings?.[0] ?? null
}

// In production the backend does this once the song is recorded.
export const finishProduction = (order: Order) => compose(order)

export async function requestCorrection(order: Order, { kind, note, changes = {} }: { kind: string; note: string; changes?: { recipient?: object; memories?: object } }) {
  const corrections = [...(order.corrections || []), { kind, note, changes, at: new Date().toISOString(), resolved: false }]
  const updated = await Orders().update(order.id, {
    recipient: { ...order.recipient, ...changes.recipient },
    memories: { ...order.memories, ...changes.memories },
    corrections,
    ...(realSongs ? {} : { status: 'correction_requested' }),
  }) as Order
  // With the real backend the corrected version is made straight away
  // (startSong marks the correction made).
  return realSongs ? compose(updated) : updated
}

export async function applyCorrection(order: Order) {
  const updated: Order = await Orders().update(order.id, { corrections: order.corrections.map((c) => ({ ...c, resolved: true })) })
  return compose(updated)
}

export async function approveAndWrap(order: Order, { message, from_name }: { message: string; from_name: string }) {
  if (realSongs) return invoke('approveSong', { order_id: order.id, message, from_name }) as Promise<Order>
  return Orders().update(order.id, {
    status: 'approved',
    gift_token: order.gift_token || newToken(),
    gift: { message, from_name, opened_count: order.gift?.opened_count || 0 },
  }) as Promise<Order>
}

// Backend functions sleep when unused and take several seconds to wake.
// Waking approveSong while the buyer writes their message makes "Create
// their gift link" quick. It's called with no order, so it changes nothing.
export const wakeGiftLink = () => {
  if (realSongs) b44().functions.invoke('approveSong', {}).catch(() => {})
}

// Keeps this phone's push address on the song, so the backend can say when
// it's ready. Quietly does nothing when notifications are off.
export async function rememberPushToken(orderId: string) {
  const token = await pushToken()
  if (token) await Orders().update(orderId, { push_token: token }).catch(() => {})
}

export const getOrder = (id: string): Promise<Order> => Orders().get(id)
export const listOrders = (): Promise<Order[]> => Orders().list('-created_date')
export const findGift = async (token: string): Promise<Order | null> =>
  (await Orders().filter({ gift_token: token, status: 'approved' }))[0] ?? null

// Recipients open gifts on the web, so the link points at the web app.
const GIFT_BASE_URL = process.env.EXPO_PUBLIC_GIFT_BASE_URL?.replace(/\/$/, '')
export const giftUrl = (order: Order) => (GIFT_BASE_URL && order.gift_token ? `${GIFT_BASE_URL}/gift/${order.gift_token}` : null)
