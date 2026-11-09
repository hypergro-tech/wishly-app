// The buyer approves their checked song and adds a message: the order becomes
// "approved" and gets its gift link. Calling it again on an approved song only
// changes the message; the link stays the same.
// POST { order_id, message, from_name } -> the updated order.
//
// The status and gift link are locked to the backend (see
// base44/entities/order.jsonc), so a song can only become a gift once it has
// been sung and checked.

import { createClientFromRequest } from 'npm:@base44/sdk'

const LETTERS = '0123456789abcdefghijklmnopqrstuvwxyz'

// 16 random letters and digits (about 82 bits), from a secure source.
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => LETTERS[b % 36]).join('')

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req)
    if (!(await base44.auth.me().catch(() => null))) return Response.json({ error: 'Sign in first' }, { status: 401 })

    const { order_id, message, from_name } = await req.json()
    if (typeof order_id !== 'string' || !order_id) return Response.json({ error: 'Send the order to approve' }, { status: 400 })
    // Read as the buyer, so the order's own access rules check it's theirs.
    const order = await base44.entities.Order.get(order_id).catch(() => null)
    if (!order) return Response.json({ error: 'No such order' }, { status: 404 })

    if (!['ready_for_review', 'approved'].includes(order.status) || !order.song?.audio_url) {
      return Response.json({ error: 'The song isn’t ready to give yet' }, { status: 409 })
    }

    const changes = {
      status: 'approved',
      gift_token: order.gift_token || newToken(),
      gift: { message: text(message, 1000), from_name: text(from_name, 80), opened_count: order.gift?.opened_count || 0 },
    }
    await base44.asServiceRole.entities.Order.update(order.id, changes)
    return Response.json({ ...order, ...changes })
  } catch (error) {
    return Response.json({ error: String((error as Error).message ?? error) }, { status: 500 })
  }
}
