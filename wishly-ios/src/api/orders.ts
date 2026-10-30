// Orders, the one Base44 entity Wishly uses (schema: base44/entities/order.jsonc).
// The web app reads and writes the same records.

import { quote, type Tint } from '@/lib/catalog'
import { buildSongPrompt, SONG_SCHEMA, writeSong, type Song } from '@/lib/songwriter'
import { b44, isBase44, realSongs } from './base44Client'

export type Status = 'in_production' | 'ready_for_review' | 'correction_requested' | 'approved'

export type Order = {
  id: string
  created_date: string
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
  gift: { message: string; from_name: string; opened_count: number } | null
  // Set by the makeSong function: which spellings were sung and whether the name was heard.
  name_check?: { passed: boolean; needs_person: boolean; tries: { spelling: string; heard: number; refused?: boolean }[]; error?: string }
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

const newToken = () =>
  Array.from({ length: 16 }, () => '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]).join('')

export async function placeOrder(brief: Brief): Promise<Order> {
  const q = quote(brief.package)
  return Orders().create({
    ...brief,
    status: 'in_production',
    price_total: q.total,
    ready_by: q.readyBy,
    corrections: [],
    song: null,
    song_version: 0,
    gift: null,
  })
}

async function compose(order: Order): Promise<Order> {
  const prompt = buildSongPrompt(order)
  // A model reply may omit the extras the template adds; fill them from the brief.
  const fallback = writeSong(order)
  const version = (order.song_version || 0) + 1

  if (realSongs) {
    // Base44 only lets backend functions call its AI, so makeSong writes the
    // lyrics (starting from the template), then sings and checks them.
    const updated: Order = await Orders().update(order.id, { song: fallback, song_version: version, status: 'in_production' })
    // Takes a minute or more; the song screen checks the order meanwhile.
    b44().functions.invoke('makeSong', { order_id: order.id, lyrics_prompt: prompt, lyrics_schema: SONG_SCHEMA }).catch(() => {})
    return updated
  }

  const result = isBase44
    ? await b44().integrations.Core.InvokeLLM({ prompt, response_json_schema: SONG_SCHEMA }).catch(() => null)
    : await b44().integrations.Core.InvokeLLM({ prompt, response_json_schema: SONG_SCHEMA, context: { order } })
  const song: Song = typeof result === 'object' && result?.sections ? { ...fallback, ...result } : fallback
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
  return Orders().update(order.id, {
    recipient: { ...order.recipient, ...changes.recipient },
    memories: { ...order.memories, ...changes.memories },
    corrections,
    status: 'correction_requested',
  }) as Promise<Order>
}

export async function applyCorrection(order: Order) {
  const updated: Order = await Orders().update(order.id, { corrections: order.corrections.map((c) => ({ ...c, resolved: true })) })
  return compose(updated)
}

export async function approveAndWrap(order: Order, { message, from_name }: { message: string; from_name: string }) {
  return Orders().update(order.id, {
    status: 'approved',
    gift_token: order.gift_token || newToken(),
    gift: { message, from_name, opened_count: order.gift?.opened_count || 0 },
  }) as Promise<Order>
}

export const getOrder = (id: string): Promise<Order> => Orders().get(id)
export const listOrders = (): Promise<Order[]> => Orders().list('-created_date')
export const findGift = async (token: string): Promise<Order | null> =>
  (await Orders().filter({ gift_token: token, status: 'approved' }))[0] ?? null

// Recipients open gifts on the web, so the link points at the web app.
const GIFT_BASE_URL = process.env.EXPO_PUBLIC_GIFT_BASE_URL?.replace(/\/$/, '')
export const giftUrl = (order: Order) => (GIFT_BASE_URL && order.gift_token ? `${GIFT_BASE_URL}/gift/${order.gift_token}` : null)
