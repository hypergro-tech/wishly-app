// Starts the next version of an order's song: the template lyrics, the next
// version number, and any corrections marked as made. Fast; the app calls
// makeSong straight after to write the real lyrics and sing them.
// POST { order_id } -> the updated order.
//
// The song, its version and the order's status are locked to the backend (see
// base44/entities/order.jsonc), so the song is always built here from the saved
// order, never from anything the app sends.

import { createClientFromRequest } from 'npm:@base44/sdk'

import { generateSongPayload, songInputs, startingSong } from '../../shared/songPipeline.ts'

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req)
    if (!(await base44.auth.me().catch(() => null))) return Response.json({ error: 'Sign in first' }, { status: 401 })

    const { order_id } = await req.json()
    if (typeof order_id !== 'string' || !order_id) return Response.json({ error: 'Send the order to start' }, { status: 400 })
    // Read as the buyer, so the order's own access rules check it's theirs.
    const order = await base44.entities.Order.get(order_id).catch(() => null)
    if (!order) return Response.json({ error: 'No such order' }, { status: 404 })

    // A new order, or one still being made (a retry), or a correction. Not an
    // approved song, and not a finished one with nothing to correct.
    const corrections = order.corrections || []
    const correcting = corrections.some((c: { resolved?: boolean }) => !c.resolved)
    if (order.status === 'approved' || (order.status === 'ready_for_review' && !correcting)) {
      return Response.json({ error: 'This song is already made' }, { status: 409 })
    }

    const changes = {
      song: startingSong(order, generateSongPayload(songInputs(order))),
      song_version: (order.song_version || 0) + 1,
      status: 'in_production',
      corrections: corrections.map((c: object) => ({ ...c, resolved: true })),
    }
    await base44.asServiceRole.entities.Order.update(order.id, changes)
    return Response.json({ ...order, ...changes })
  } catch (error) {
    return Response.json({ error: String((error as Error).message ?? error) }, { status: 500 })
  }
}
