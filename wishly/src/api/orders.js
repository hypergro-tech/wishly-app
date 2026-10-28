import { base44 } from './base44Client'
import { quote } from '../lib/catalog'
import { buildSongPrompt, SONG_SCHEMA } from '../lib/songwriter'

const { Order } = base44.entities

// Order.status lifecycle:
// in_production -> ready_for_review -> (correction_requested -> ready_for_review)* -> approved
export const STATUS = {
  in_production: { label: 'Writing their song', tint: 'bg-butter' },
  ready_for_review: { label: 'Ready to listen and check', tint: 'bg-coral' },
  correction_requested: { label: 'Making your correction', tint: 'bg-butter' },
  approved: { label: 'Ready to give', tint: 'bg-mint' },
}

const token = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 16)

export async function placeOrder(brief) {
  const q = quote(brief.package)
  return Order.create({
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

async function compose(order, correction) {
  const song = await base44.integrations.Core.InvokeLLM({
    prompt: buildSongPrompt(order),
    response_json_schema: SONG_SCHEMA,
    context: { order, correction },
  })
  return Order.update(order.id, { song, song_version: (order.song_version || 0) + 1, status: 'ready_for_review' })
}

// In production this is done by the backend once the song is recorded.
export const finishProduction = (order) => compose(order)

export async function requestCorrection(order, { kind, note, changes = {} }) {
  const corrections = [...(order.corrections || []), { kind, note, changes, at: new Date().toISOString(), resolved: false }]
  const merged = {
    recipient: { ...order.recipient, ...changes.recipient },
    memories: { ...order.memories, ...changes.memories },
  }
  return Order.update(order.id, { ...merged, corrections, status: 'correction_requested' })
}

export async function applyCorrection(order) {
  const corrections = order.corrections.map((c) => ({ ...c, resolved: true }))
  const updated = await Order.update(order.id, { corrections })
  return compose(updated)
}

export async function approveAndWrap(order, { message, from_name }) {
  const gift_token = order.gift_token || token()
  return Order.update(order.id, {
    status: 'approved',
    gift_token,
    gift: { message, from_name, opened_count: order.gift?.opened_count || 0 },
  })
}

export async function getGift(giftToken) {
  const [order] = await Order.filter({ gift_token: giftToken, status: 'approved' })
  if (!order) return null
  await Order.update(order.id, { gift: { ...order.gift, opened_count: (order.gift.opened_count || 0) + 1 } })
  return order
}

export const getOrder = (id) => Order.get(id)
export const listOrders = () => Order.list('-created_date')
